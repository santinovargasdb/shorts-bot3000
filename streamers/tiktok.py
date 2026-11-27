"""Clips virales de TikTok como fuente extra de los canales de clips (además de Twitch/Kick).

La idea es resubir lo que YA se probó que funciona: de una lista de cuentas de TikTok se listan
los videos del juego del momento, se filtran por vistas y antigüedad, y el más visto que no se
usó entra al backlog como clip PRIORITARIO (saltea la fila, igual que el carril de Twitch).

El video no se re-edita: ya es vertical y ya trae su cartel/edición, que es justamente lo que
pegó. Solo se normaliza a 1080x1920 y se le pone el ícono del canal. El crédito al autor va en la
última línea de la descripción (build.make_description, platform='tiktok').

Límites conocidos: yt-dlp lista PERFILES pero no hashtags ni búsquedas, así que el descubrimiento
de virales se hace aparte (búsqueda de outliers) y se carga en streamers/tiktok_data.json: una
cola de links ya elegidos + las cuentas a seguir. Los videos que TikTok marca como sensibles
piden login, esos se saltean.

    python -m streamers.tiktok streamers_a 3            # hasta 3 clips desde las cuentas
    python -m streamers.tiktok streamers_a --url <link> # ese video puntual, sin filtros
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

from streamers import config as scfg, db
from streamers.build import _clean, make_description, make_title
from streamers.series import clean_title as strip_tags
from streamers.sourcing import _SEP, _YTDLP, _run, _s
from streamers.titles import _EMOJI

ROOT = Path(__file__).resolve().parents[1]

LIST_LIMIT = 40                 # últimos videos a mirar por cuenta
DUR_MIN, DUR_MAX = 8.0, 170.0   # un Short de YouTube admite hasta 3 minutos
ID_PREFIX = "tt_"               # clip_id en la db: no se pisa con los ids de Twitch/Kick


# De DÓNDE se resube (cuentas + cola de links ya elegidos) es dato privado, igual que el allowlist
# de streamers: va en un json gitignorado, no en config.py. Formato:
#   {"accounts": ["cuenta", ...],
#    "queue": [{"url": "https://www.tiktok.com/@x/video/123", "views": 1500000, "titulo": "GTA 6: ..."}]}
DATA = ROOT / "streamers" / "tiktok_data.json"


def load_data() -> dict:
    try:
        data = json.loads(DATA.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    return {"accounts": list(data.get("accounts") or []), "queue": list(data.get("queue") or [])}


def queued(used_ids=()) -> list[dict]:
    """Links de la cola (videos virales ya elegidos, ej. de una búsqueda) que no se usaron, del
    más visto al menos. No pasan por los filtros de pick: ya se curaron al cargarlos."""
    out = []
    for q in load_data()["queue"]:
        m = re.search(r"tiktok\.com/@([^/]+)/video/(\d+)", q.get("url") or "")
        if not m or ID_PREFIX + m.group(2) in used_ids:
            continue
        out.append({"id": ID_PREFIX + m.group(2), "views": _int(q.get("views")), "likes": 0,
                    "duration": 0.0, "ts": 0, "title": q.get("titulo") or "", "url": q["url"],
                    "streamer": m.group(1), "platform": "tiktok", "titulo": q.get("titulo") or ""})
    return sorted(out, key=lambda c: c["views"], reverse=True)


def _int(v) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def list_account(account: str, limit: int = LIST_LIMIT) -> list[dict]:
    """Últimos videos de una cuenta de TikTok (yt-dlp, flat), con vistas/likes/duración/fecha."""
    account = account.lstrip("@")
    fmt = _SEP.join(["%(id)s", "%(view_count)s", "%(like_count)s", "%(duration)s",
                     "%(timestamp)s", "%(title)s"])
    try:
        r = _run([*_YTDLP, f"https://www.tiktok.com/@{account}", "--flat-playlist",
                  "--playlist-end", str(limit), "--print", fmt], 180)
    except Exception:
        return []
    out = []
    for line in r.stdout.splitlines():
        parts = line.strip().split(_SEP)
        if len(parts) != 6 or not parts[0].isdigit():
            continue
        vid, views, likes, dur, ts, title = parts
        out.append({"id": ID_PREFIX + vid, "views": _int(views), "likes": _int(likes),
                    "duration": float(_int(dur)), "ts": _int(ts), "title": title,
                    "url": f"https://www.tiktok.com/@{account}/video/{vid}",
                    "streamer": account, "platform": "tiktok"})
    return out


def is_game(title: str, keywords) -> bool:
    """¿El texto del video nombra el juego? Compara sin espacios: '#gta6', 'GTA 6', 'gta vi'."""
    flat = re.sub(r"\s+", "", (title or "").lower())
    return any(re.sub(r"\s+", "", k.lower()) in flat for k in keywords)


def pick(clips: list[dict], tt: dict, used_ids=(), now: float | None = None) -> list[dict]:
    """Los clips que sirven, del más visto al menos: del juego, frescos, virales, de largo
    posteable y sin usar. Las vistas son el filtro de calidad (ya se sabe que funcionó)."""
    now = now or time.time()
    oldest = now - float(tt.get("max_age_days", 14)) * 86400
    ok = [c for c in clips
          if c["id"] not in used_ids
          and is_game(c["title"], tt["keywords"])
          and c["views"] >= int(tt.get("min_views", 0))
          and c["ts"] >= oldest
          and DUR_MIN <= c["duration"] <= DUR_MAX]
    return sorted(ok, key=lambda c: c["views"], reverse=True)


def from_url(url: str) -> dict | None:
    """Un video puntual (link corto o largo): sus datos, sin pasar por los filtros. Sirve también
    para un Short de YouTube: el crédito va a youtube.com/@canal y el id lleva otro prefijo."""
    try:
        r = _run([*_YTDLP, url, "--no-playlist", "--dump-json", "--skip-download"], 120)
        j = json.loads(r.stdout)
    except Exception:
        return None
    youtube = (j.get("extractor_key") or "").lower().startswith("youtube")
    # en YouTube `uploader` es el nombre visible ("Zplunk"); el que sirve para el link es el @handle
    account = ((j.get("uploader_id") if youtube else None) or j.get("uploader") or "").lstrip("@")
    if not j.get("id") or not account:
        return None
    return {"id": ("yt_" if youtube else ID_PREFIX) + str(j["id"]), "views": _int(j.get("view_count")),
            "likes": _int(j.get("like_count")), "duration": float(_int(j.get("duration"))),
            "ts": _int(j.get("timestamp")), "title": j.get("title") or "",
            "url": j.get("webpage_url") or url, "streamer": account,
            "platform": "youtube" if youtube else "tiktok"}


def download(clip: dict, out: Path) -> bool:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    for f in out.parent.glob(out.stem + ".*"):
        f.unlink(missing_ok=True)
    try:
        _run([*_YTDLP, clip["url"], "--no-playlist", "-S", "res:1080", "--merge-output-format", "mp4",
              "-o", str(out)], 300)
    except Exception:
        return False
    return out.exists() and out.stat().st_size > 50_000


def normalize(src: Path, dst: Path, watermark: Path | None = None,
              wm_opacity: float = 0.75, wm_scale: float = 0.14, wm_margin: int = 40) -> None:
    """1080x1920 a 30 fps, sin recortar (si no es 9:16 se completa con negro) + ícono del canal
    arriba a la derecha, igual que render_short."""
    W, H = 1080, 1920
    fc = (f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease:flags=lanczos,"
          f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[v]")
    inputs, vlabel = ["-i", str(src)], "[v]"
    if watermark and Path(watermark).exists():
        inputs += ["-i", str(Path(watermark).resolve())]
        fc += (f";[1:v]format=rgba,colorchannelmixer=aa={wm_opacity:.2f},"
               f"scale={int(W * wm_scale)}:-1[wm];[v][wm]overlay=W-w-{wm_margin}:{wm_margin}[vw]")
        vlabel = "[vw]"
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", vlabel, "-map", "0:a?",
           "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-r", "30", str(dst)]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló al normalizar:\n{result.stderr[-1500:]}")


_PROMPT_TITULO = (
    "Sos editor de un canal de YouTube Shorts de clips de {tag} en español.\n"
    "Este es el texto que el autor le puso a su video (puede estar en inglés):\n{caption}\n\n"
    "Escribí el TÍTULO en español del short. Reglas:\n"
    "- Traducí/adaptá el sentido de ese texto; NO inventes nada que no esté ahí.\n"
    "- Tiene que incluir literalmente \"{tag}\".\n"
    "- Máximo 60 caracteres. Español neutro. Sin emojis, sin hashtags, sin comillas.\n"
    "- Si el texto no dice nada del momento, respondé solo: NO\n\n"
    "Respondé SOLO el título (o NO)."
)


def spanish_title(caption: str, tag: str) -> str | None:
    """Título en español vía LLM (Groq) desde el texto del autor. None ante cualquier problema."""
    if len(re.findall(r"\w+", caption or "")) < 3:
        return None
    try:
        from reddit_pipeline.rewrite import build_client, model_name
        from streamers.titles import clean_title
        r = build_client().chat.completions.create(
            model=model_name(), temperature=0.3, max_tokens=400,
            messages=[{"role": "user", "content": _PROMPT_TITULO.format(tag=tag, caption=caption[:300])}])
        return clean_title(r.choices[0].message.content, tag)
    except Exception:
        return None


def used_everywhere() -> set:
    """clip_ids de TikTok ya usados en CUALQUIER canal: el mismo video no va a dos cuentas nuestras."""
    used = set()
    for cfg in scfg.CHANNELS.values():
        if cfg.get("tiktok") and Path(cfg["db"]).exists():
            conn = db.connect(cfg["db"])
            try:
                used |= {i for i in db.used_clip_ids(conn) if i.startswith(ID_PREFIX)}
            finally:
                conn.close()
    return used


def build_clip(channel_key: str, *, url: str | None = None, titulo: str | None = None,
               conn=None, verbose: bool = True) -> int | None:
    """Mete UN clip de TikTok al backlog del canal. Con `url`, ese video (y `titulo`, si se quiere
    uno escrito a mano); si no, el más visto de las cuentas configuradas que pase los filtros.
    Devuelve el seq, o None si no hay nada. Con `url` solo se evita repetirlo en ESTE canal: si
    alguien pide el mismo link para dos canales, es a propósito."""
    cfg = scfg.get(channel_key)
    tt = cfg.get("tiktok")
    if not tt:
        raise KeyError(f"'{channel_key}' no tiene bloque 'tiktok' en streamers/config.py")
    own = conn or db.connect(cfg["db"])
    used = used_everywhere() | db.used_clip_ids(own)
    work = ROOT / "output" / channel_key / ".work"

    if url:
        cand = from_url(url)
        if not cand:
            if verbose:
                print(f"[{channel_key}] no pude leer ese video (¿privado, o pide login?)")
            return None
        if cand["id"] in db.used_clip_ids(own):
            if verbose:
                print(f"[{channel_key}] ese video ya está en el backlog de este canal")
            return None
        if titulo:
            cand["titulo"] = titulo
        ordered = [cand]
    else:
        ordered = queued(used)                  # primero lo ya elegido; las cuentas, si no queda nada
        if not ordered:
            accounts = load_data()["accounts"]
            pool = [c for account in accounts for c in list_account(account)]
            ordered = pick(pool, tt, used)
            if verbose:
                print(f"[{channel_key}] tiktok: {len(ordered)} candidatos de {len(accounts)} cuenta(s)")
        elif verbose:
            print(f"[{channel_key}] tiktok: {len(ordered)} links en la cola")

    for cand in ordered[:5]:
        raw = work / f"tt_{cand['streamer']}.mp4"
        if not download(cand, raw):
            if verbose:
                print(f"[{channel_key}]   no bajó (¿pide login?): {_s(cand['title'])!r}")
            continue
        seq = max([v["seq"] for v in db.all_clips(own)], default=0) + 1
        dst = ROOT / "output" / channel_key / f"{channel_key}_{seq:04d}.mp4"
        wm = ROOT / "branding" / channel_key / "watermark.png"
        normalize(raw, dst, wm if wm.exists() else None)
        raw.unlink(missing_ok=True)

        # sin los emojis del autor: make_title ya le pone los del canal
        clip = {**cand, "title": _EMOJI.sub("", strip_tags(cand["title"])).strip(), "tag": tt.get("tag")}
        title = make_title(clip)
        if cand.get("titulo"):                  # título ya escrito al cargar el link en la cola
            title = f"{_clean(cand['titulo'])} \U0001F602\U0001F3AE"
            # la descripción abre con ese mismo texto (sin el "GTA 6:"), no con el título original en otro idioma
            sin_tag = re.sub(rf"^{re.escape(tt.get('tag') or '')}:?\s*", "", cand["titulo"]).strip()
            clip["title"] = sin_tag[:1].upper() + sin_tag[1:]
        elif tt.get("tag") and cfg.get("language") == "es":
            es = spanish_title(clip["title"], tt["tag"])
            if es:
                title = es
        status = "approved" if tt.get("auto_approve") else "pending"
        real = db.add_clip(own, title=title, description=make_description(clip),
                           video_path=str(dst), streamer=cand["streamer"], clip_id=cand["id"],
                           views=cand["views"], status=status,
                           qc_note=f"tiktok {cand['views']} vistas", has_gameplay=True,
                           priority=True, variant="tiktok")
        if verbose:
            print(f"[{channel_key}] {status.upper()} seq {real} (@{cand['streamer']}, "
                  f"{cand['views']} vistas) -> {dst.name}: {_s(_clean(title))!r}")
        return real
    return None


def build_backlog(channel_key: str, n: int = 3) -> int:
    conn = db.connect(scfg.get(channel_key)["db"])
    made = 0
    for _ in range(n):
        if not build_clip(channel_key, conn=conn):
            break
        made += 1
    print(f"[{channel_key}] tiktok: +{made} clip(s) al backlog")
    return made


if __name__ == "__main__":
    for _st in (sys.stdout, sys.stderr):
        try:
            _st.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    ch = sys.argv[1] if len(sys.argv) > 1 else "streamers_a"
    if "--url" in sys.argv:
        build_clip(ch, url=sys.argv[sys.argv.index("--url") + 1],
                   titulo=sys.argv[sys.argv.index("--titulo") + 1] if "--titulo" in sys.argv else None)
    else:
        build_backlog(ch, int(sys.argv[2]) if len(sys.argv) > 2 else 3)
