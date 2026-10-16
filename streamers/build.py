"""Arma UN short de streamer y lo deja en el backlog del canal: elige streamer -> sourcea
el mejor clip (HD, 'va a pegar') -> lo pasa por el pipeline (layout gaming/facecam auto) ->
guarda video + metadata en la db. daily_post lo postea tal cual (video_path_for)."""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

from streamers import config as scfg, db, sourcing
from src.pipeline import process_source

ROOT = Path(__file__).resolve().parents[1]

_HASHTAGS = "#clips #twitch #shorts #fyp #viral #streamer #gaming #humor #parati"
_DISCLAIMER = ("Clip del streamer original. Si es tuyo y querés crédito o que lo saque, "
               "escribinos y lo resolvemos.")


def _clean(t: str) -> str:
    return (re.sub(r"\s+", " ", (t or "").strip())[:80]) or "Momentazo"


def make_title(clip: dict) -> str:
    return f"{_clean(clip['title'])} \U0001F602\U0001F3AE"


def make_description(clip: dict) -> str:
    s = clip["streamer"]
    cred = f"\U0001F3A5 Clip: {s} — twitch.tv/{s}"
    return f"{_clean(clip['title'])}\n\n{cred}\n\n{_HASHTAGS}\n\n{_DISCLAIMER}"


def build_clip(channel_key: str, *, conn=None, verbose: bool = True) -> int | None:
    cfg = scfg.get(channel_key)
    own = conn or db.connect(cfg["db"])
    existing = db.all_clips(own)
    used = db.used_clip_ids(own)
    streamers = cfg["streamers"]
    work = ROOT / "output" / channel_key / ".work"

    # Round-robin: arranca por el streamer que toca (según clips ya hechos) y recorre todos.
    k = len(existing) % len(streamers)
    order = streamers[k:] + streamers[:k]
    clip = None
    for s in order:
        clip = sourcing.best_clip(s, work, used_ids=used, period=cfg.get("period", "30d"),
                                  want=cfg.get("content", "gameplay"),
                                  platform=cfg.get("platform", "twitch"), verbose=verbose)
        if clip:
            break
    if not clip:
        if verbose:
            print(f"[{channel_key}] sin clip nuevo que pegue en ningún streamer")
        return None

    ov = {"clips_per_source": 1}
    if cfg.get("layout_override"):                  # canal C (IRL): fuerza facecam-only
        ov["layout"] = cfg["layout_override"]
    wm = ROOT / "branding" / channel_key / "watermark.png"
    if wm.exists():                                 # watermark @handle del canal (branding/)
        ov["watermark"] = str(wm)
    outs = process_source(clip["local_path"], "streamers", overrides=ov)
    if not outs:
        if verbose:
            print(f"[{channel_key}] el render no produjo short")
        return None

    seq = (max([v["seq"] for v in existing], default=0)) + 1
    dst_dir = ROOT / "output" / channel_key
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / f"{channel_key}_{seq:04d}.mp4"
    shutil.move(str(outs[0]), str(dst))

    # QC AUTOMÁTICO con visión (Gemini): aprueba/rechaza solo (plug-and-forget).
    # ok=None (sin GEMINI_API_KEY o error) -> queda PENDING para revisión manual.
    from streamers.verify import verify_clip
    v = verify_clip(dst, verbose=verbose)
    status = {True: "approved", False: "rejected"}.get(v["ok"], "pending")

    real = db.add_clip(own, title=make_title(clip), description=make_description(clip),
                       video_path=str(dst), streamer=clip["streamer"],
                       clip_id=clip["id"], views=clip.get("views", 0),
                       status=status, qc_note=v.get("problema", ""))
    if verbose:
        tag = {"approved": "APROBADO auto", "rejected": "RECHAZADO auto",
               "pending": "PENDIENTE (manual)"}[status]
        print(f"[{channel_key}] {tag} seq {real} ({clip['streamer']}) -> {dst.name}")
    return real


def build_backlog(channel_key: str, n: int = 5) -> int:
    from collections import Counter
    from streamers import verify
    conn = db.connect(scfg.get(channel_key)["db"])
    made = 0
    for _ in range(n):
        if verify.QUOTA_HIT:          # cuota de Gemini agotada -> no malgastar renders en 'pending'
            print(f"[{channel_key}] cuota de QC agotada -> freno el build (reanuda cuando vuelva)")
            break
        if build_clip(channel_key, conn=conn):
            made += 1
    c = Counter(x["status"] for x in db.all_clips(conn))
    print(f"\n[{channel_key}] listo. El QC auto dejó: {c.get('approved', 0)} aprobados, "
          f"{c.get('rejected', 0)} rechazados, {c.get('pending', 0)} pendientes.")
    if c.get("pending"):
        print(f"   (pendientes = sin GEMINI_API_KEY o sin cuota) re-QC: python -m streamers.review {channel_key}")
    return made


def resolve_pending(channel_key: str, *, conn=None, verbose: bool = True) -> int:
    """Re-QC los clips 'pending' (YA renderizados) SIN re-renderizar: corre Gemini sobre el mp4
    existente y los pasa a approved/rejected. Recupera renders que quedaron pending por falta de
    cuota. Se frena si la cuota se vuelve a agotar (verify.QUOTA_HIT). Devuelve cuántos aprobó."""
    from streamers import verify
    own = conn or db.connect(scfg.get(channel_key)["db"])
    resolved = 0
    for clip in db.by_status(own, "pending"):
        if verify.QUOTA_HIT:
            break
        vp = clip.get("video_path")
        if not vp or not Path(vp).exists():
            db.set_status(own, clip["seq"], "rejected")     # el mp4 ya no está -> descartar
            continue
        v = verify.verify_clip(Path(vp), verbose=verbose)
        if v["ok"] is True:
            db.set_status(own, clip["seq"], "approved")
            resolved += 1
        elif v["ok"] is False:
            db.set_status(own, clip["seq"], "rejected")
        # ok None (sin cuota / no disponible) -> queda pending; el flag corta en la próxima vuelta
    if verbose and resolved:
        print(f"[{channel_key}] re-QC de pendientes: +{resolved} aprobados (sin re-render)")
    return resolved


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    ch = sys.argv[1] if len(sys.argv) > 1 else "streamers_a"
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    build_backlog(ch, n)
