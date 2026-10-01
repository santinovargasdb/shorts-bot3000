#!/usr/bin/env python
"""Job diario multi-canal: publica la próxima parte del canal en sus plataformas.

Cada canal (ver channels_registry.py) y cada plataforma llevan su propio
contador, así una no bloquea a la otra. Genera el video si no existe.
Pensado para el Programador de tareas de Windows (run_daily*.bat).

  python daily_post.py                       # canal 1 (faceless) — compatibilidad
  python daily_post.py --channel historia    # canal 2
  python daily_post.py --channel historia --dry-run
  python daily_post.py --only yt             # o --only ig / --only tt
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from channels_registry import CHANNELS, get_channel, load_series

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "automation_state.json"

# ─── Configuración ───────────────────────────────────────────────
YT_PRIVACY = "public"     # "public" (auto viral) | "unlisted" | "private"
# ─────────────────────────────────────────────────────────────────

_PLATAFORMAS = ("youtube", "instagram", "tiktok")


def _log(ctx: dict, msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M}][{ctx['name']}] {msg}", flush=True)


def _default_channel_state() -> dict:
    return {p: {"next_part": 1, "posted": []} for p in _PLATAFORMAS}


def _load_state() -> dict:
    s = {name: _default_channel_state() for name in CHANNELS}
    if STATE.exists():
        old = json.loads(STATE.read_text(encoding="utf-8"))
        if "youtube" in old:                 # formato plano viejo = canal 1
            old = {"faceless": old}
        if "next_part" in old:               # formato prehistórico (solo YT)
            old = {"faceless": {"youtube": old}}
        for canal, plats in old.items():
            s.setdefault(canal, _default_channel_state())
            for plat, v in plats.items():
                s[canal].setdefault(plat, {"next_part": 1, "posted": []}).update(v)
    return s


def _save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")


def _ensure_video(part: int, ctx: dict, series) -> Path:
    """Devuelve el mp4 de la parte, generándolo si no existe."""
    from src.curiosidades import generate
    from src.faceless import _slug

    title = series.title_for(part)
    video = ROOT / "output" / ctx["engine_channel"] / f"{_slug(title)}.mp4"
    if not video.exists():
        _log(ctx, f"Generando parte {part}...")
        generate(series.PARTS[part]["segments"],
                 channel_name=ctx["engine_channel"],
                 background=series.background_for(part),
                 music=ctx["music"],
                 title_meta=title,
                 description=series.descripcion(part, series.PARTS[part]["resumen"]),
                 hashtags=series.KEYWORDS,
                 verbose=False)
    return video


def _caption(video: Path) -> str:
    meta = video.with_suffix(".json")
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8")).get("description", video.stem)
    return video.stem


def do_youtube(st: dict, ctx: dict, series) -> None:
    part = st["youtube"]["next_part"]
    if part not in series.PARTS:
        _log(ctx, f"[YT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    from uploaders.youtube_upload import upload_from_folder
    _log(ctx, f"[YT] Subiendo parte {part} ({YT_PRIVACY})...")
    try:
        vid = upload_from_folder(video, privacy=YT_PRIVACY, token_file=ctx["yt_token"])
    except Exception as e:
        _log(ctx, f"[YT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    st["youtube"]["next_part"] = part + 1
    st["youtube"]["posted"].append({"part": part, "video_id": vid, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[YT] ✅ Parte {part}: https://youtube.com/shorts/{vid}")


def _ig_creds(ctx: dict) -> dict | None:
    """{'user_id','access_token'} del canal, o None si no está configurado."""
    if ctx["ig_creds"] is None:              # canal 1: variables del .env (legacy)
        if not all(os.environ.get(k) or _in_env(k) for k in ("IG_USER_ID", "IG_ACCESS_TOKEN")):
            return None
        from src.gh_release import _load_env
        _load_env()
        return {"user_id": os.environ["IG_USER_ID"],
                "access_token": os.environ["IG_ACCESS_TOKEN"]}
    f = ROOT / ctx["ig_creds"]
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding="utf-8"))


def _refresh_ig_token_env(st: dict, ctx: dict) -> None:
    """Renovación semanal del token del canal 1 (vive en .env). Sin cambios."""
    import re

    import requests
    last = st["instagram"].get("token_refreshed", "")
    if last and (datetime.now() - datetime.strptime(last, "%Y-%m-%d")).days < 7:
        return
    env_path = ROOT / ".env"
    txt = env_path.read_text(encoding="utf-8")
    m = re.search(r"^IG_ACCESS_TOKEN=(.+)$", txt, re.M)
    if not m:
        return
    try:
        r = requests.get("https://graph.instagram.com/refresh_access_token",
                         params={"grant_type": "ig_refresh_token",
                                 "access_token": m.group(1).strip()}, timeout=60)
        data = r.json()
        if "access_token" in data:
            txt = re.sub(r"^IG_ACCESS_TOKEN=.+$", f"IG_ACCESS_TOKEN={data['access_token']}",
                         txt, flags=re.M)
            env_path.write_text(txt, encoding="utf-8")
            os.environ["IG_ACCESS_TOKEN"] = data["access_token"]
            st["instagram"]["token_refreshed"] = f"{datetime.now():%Y-%m-%d}"
            _log(ctx, f"[IG] Token renovado (+{round(data.get('expires_in', 0) / 86400)} días).")
        else:
            _log(ctx, f"[IG] ⚠️  No se pudo renovar el token: {data}")
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  Error renovando token (sigo igual): {e}")


def _refresh_ig_token(st: dict, ctx: dict) -> None:
    """Renueva el token de IG del canal (vence a los 60 días) una vez por semana."""
    if ctx["ig_creds"] is None:
        _refresh_ig_token_env(st, ctx)
        return
    import requests
    f = ROOT / ctx["ig_creds"]
    if not f.exists():
        return
    d = json.loads(f.read_text(encoding="utf-8"))
    last = d.get("token_refreshed", "")
    if last and (datetime.now() - datetime.strptime(last, "%Y-%m-%d")).days < 7:
        return
    try:
        r = requests.get("https://graph.instagram.com/refresh_access_token",
                         params={"grant_type": "ig_refresh_token",
                                 "access_token": d["access_token"]}, timeout=60)
        data = r.json()
        if "access_token" in data:
            d["access_token"] = data["access_token"]
            d["token_refreshed"] = f"{datetime.now():%Y-%m-%d}"
            f.write_text(json.dumps(d, indent=2), encoding="utf-8")
            _log(ctx, f"[IG] Token renovado (+{round(data.get('expires_in', 0) / 86400)} días).")
        else:
            _log(ctx, f"[IG] ⚠️  No se pudo renovar el token: {data}")
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  Error renovando token (sigo igual): {e}")


def do_instagram(st: dict, ctx: dict, series) -> None:
    if not (os.environ.get("GITHUB_TOKEN") or _in_env("GITHUB_TOKEN")):
        _log(ctx, "[IG] Falta GITHUB_TOKEN en .env (hosting del mp4), lo salteo.")
        return
    creds = _ig_creds(ctx)
    if not creds:
        _log(ctx, "[IG] No configurado (sin credenciales), lo salteo.")
        return
    _refresh_ig_token(st, ctx)
    creds = _ig_creds(ctx)   # releer por si el refresh cambió el token
    part = st["instagram"]["next_part"]
    if part >= st["youtube"]["next_part"]:
        _log(ctx, f"[IG] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in series.PARTS:
        _log(ctx, f"[IG] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    try:
        from src.gh_release import upload as gh_upload
        from uploaders.instagram_upload import publish_reel
        _log(ctx, f"[IG] Parte {part}: subiendo mp4 a hosting...")
        url = gh_upload(video)
        _log(ctx, "[IG] Publicando Reel...")
        media_id = publish_reel(url, caption=_caption(video),
                                ig_user_id=creds["user_id"],
                                access_token=creds["access_token"])
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  No se pudo publicar (reintenta la próxima): {e}")
        return
    st["instagram"]["next_part"] = part + 1
    st["instagram"]["posted"].append({"part": part, "media_id": media_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[IG] ✅ Parte {part}: Reel {media_id}")


def do_tiktok(st: dict, ctx: dict, series) -> None:
    """Sube la próxima parte a los BORRADORES de TikTok (solo canales con 'tt';
    el token sigue siendo el global de secrets/ hasta que aprueben la app)."""
    from uploaders.tiktok_upload import TOKEN_FILE
    if not TOKEN_FILE.exists():
        _log(ctx, "[TT] No configurado (sin token), lo salteo.")
        return
    part = st["tiktok"]["next_part"]
    if part >= st["youtube"]["next_part"]:
        _log(ctx, f"[TT] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in series.PARTS:
        _log(ctx, f"[TT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part, ctx, series)
    try:
        from uploaders.tiktok_upload import upload_draft
        _log(ctx, f"[TT] Subiendo parte {part} a borradores...")
        publish_id = upload_draft(video)
    except Exception as e:
        _log(ctx, f"[TT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    st["tiktok"]["next_part"] = part + 1
    st["tiktok"]["posted"].append({"part": part, "publish_id": publish_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[TT] ✅ Parte {part} en borradores de TikTok (publicala desde la app).")


def _in_env(key: str) -> bool:
    env = ROOT / ".env"
    if not env.exists():
        return False
    return any(line.strip().startswith(f"{key}=") for line in env.read_text(encoding="utf-8").splitlines())


def main() -> int:
    channel = "faceless"
    if "--channel" in sys.argv:
        channel = sys.argv[sys.argv.index("--channel") + 1]
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    dry = "--dry-run" in sys.argv

    ctx = get_channel(channel)
    series = load_series(ctx)
    state = _load_state()
    st = state[channel]

    if dry:
        yt, ig = st["youtube"]["next_part"], st["instagram"]["next_part"]
        _log(ctx, f"[DRY-RUN] Próxima en YouTube: pt.{yt} · en Instagram: pt.{ig}. No publica.")
        for p in {yt, ig}:
            if p in series.PARTS:
                _ensure_video(p, ctx, series)
        return 0

    if "yt" in ctx["platforms"] and only in (None, "yt"):
        do_youtube(st, ctx, series)
    if "ig" in ctx["platforms"] and only in (None, "ig"):
        do_instagram(st, ctx, series)
    if "tt" in ctx["platforms"] and only in (None, "tt"):
        do_tiktok(st, ctx, series)
    _save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
