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
TT_PRIVACY = "SELF_ONLY"  # ensayo del direct post; pasar a "PUBLIC_TO_EVERYONE"
                          # tras validar el primer run (spec 2026-10-04)
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


def _write_atomic(path: Path, text: str) -> None:
    """Escribe text en path de forma atómica (tmp hermano + os.replace)."""
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def _save_state(state: dict, channel: str) -> None:
    """Persiste SOLO la clave del canal, preservando las demás tal como están en disco."""
    if STATE.exists():
        fresh = json.loads(STATE.read_text(encoding="utf-8"))
    else:
        fresh = {}
    fresh[channel] = state[channel]
    _write_atomic(STATE, json.dumps(fresh, ensure_ascii=False, indent=2))


def _ensure_video(part: int, ctx: dict, series) -> Path:
    """Devuelve el mp4 de la parte, generándolo si no existe."""
    from src.curiosidades import generate
    from src.faceless import _slug

    if not (ROOT / ctx["music"]).exists():
        _log(ctx, f"⚠️ Falta la pista {ctx['music']} — el video saldría sin música y con crédito equivocado. Abortando generación.")
        raise FileNotFoundError(ctx["music"])

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


def _ig_caption(video: Path) -> str:
    """Caption corto para IG: título + gancho + hasta 5 hashtags (sin #shorts,
    que es de YouTube) + crédito de música (CC-BY, obligatorio conservarlo).
    El bloque SEO completo queda solo para la descripción de YouTube."""
    meta = video.with_suffix(".json")
    if not meta.exists():
        return video.stem
    data = json.loads(meta.read_text(encoding="utf-8"))
    lineas = data.get("description", "").splitlines()
    partes = [data.get("title", video.stem)]
    gancho = next((ln.strip() for ln in lineas if ln.strip()), "")
    if gancho:
        partes.append(gancho)
    idx = next((i for i, ln in enumerate(lineas) if ln.strip().startswith("#")), None)
    if idx is not None:
        tags = [t for t in lineas[idx].split() if t != "#shorts"][:5]
        if tags:
            partes.append(" ".join(tags))
        credito = "\n".join(ln for ln in lineas[idx + 1:] if ln.strip())
        if credito:
            partes.append(credito)
    return "\n\n".join(partes)


def _tt_caption(video: Path) -> str:
    """Caption para TikTok: título + línea de hashtags, sin el bloque SEO
    (la descripción completa queda spammy visible bajo el video)."""
    meta = video.with_suffix(".json")
    if not meta.exists():
        return video.stem
    data = json.loads(meta.read_text(encoding="utf-8"))
    title = data.get("title", video.stem)
    # La línea de hashtags no siempre es la última: el crédito de música
    # puede venir después. Se busca la primera línea que empieza con '#'.
    hashtags = next((ln.strip() for ln in data.get("description", "").splitlines()
                     if ln.strip().startswith("#")), "")
    return f"{title}\n\n{hashtags}" if hashtags else title


def do_youtube(st: dict, ctx: dict, series) -> None:
    if ctx["yt_token"] is not None and not (ROOT / ctx["yt_token"]).exists():
        _log(ctx, "[YT] No configurado (sin token), lo salteo.")
        return
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
            _write_atomic(env_path, txt)
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
            _write_atomic(f, json.dumps(d, indent=2))
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
        media_id = publish_reel(url, caption=_ig_caption(video),
                                ig_user_id=creds["user_id"],
                                access_token=creds["access_token"])
    except Exception as e:
        _log(ctx, f"[IG] ⚠️  No se pudo publicar (reintenta la próxima): {e}")
        return
    st["instagram"]["next_part"] = part + 1
    st["instagram"]["posted"].append({"part": part, "media_id": media_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(ctx, f"[IG] ✅ Parte {part}: Reel {media_id}")


def _tt_wait_status(ctx: dict, publish_id: str, timeout: int = 90) -> None:
    """Poll corto del estado de la publicación, solo informativo: el contador
    ya avanzó con la subida OK (mismo criterio optimista que siempre)."""
    import time

    from uploaders.tiktok_upload import fetch_status
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            status = fetch_status(publish_id).get("data", {}).get("status")
        except Exception as e:
            _log(ctx, f"[TT] (status) No se pudo consultar: {e}")
            return
        if status == "PUBLISH_COMPLETE":
            _log(ctx, "[TT] PUBLISH_COMPLETE 🎉")
            return
        if status and "FAILED" in status:
            _log(ctx, f"[TT] ⚠️  TikTok reportó {status} (revisá la app).")
            return
        time.sleep(5)
    _log(ctx, f"[TT] Sigue procesando; consultá luego: python -m uploaders.tiktok_upload status {publish_id}")


def do_tiktok(st: dict, ctx: dict, series) -> None:
    """Publica la próxima parte DIRECTO en TikTok con el caption embebido
    (app ya auditada). Si la privacidad pedida no está disponible (ej. cuenta
    en privado) cae a borradores para no perder el día. Token global de
    secrets/ (solo canales con 'tt')."""
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
        from uploaders.tiktok_upload import creator_info, publish_direct, upload_draft
        opciones = creator_info().get("privacy_level_options", [])
        if TT_PRIVACY in opciones:
            _log(ctx, f"[TT] Publicando parte {part} directo ({TT_PRIVACY})...")
            publish_id = publish_direct(video, title=_tt_caption(video),
                                        privacy_level=TT_PRIVACY)
            modo = "directo"
        else:
            _log(ctx, f"[TT] ⚠️  La cuenta no permite {TT_PRIVACY} (opciones: {opciones}). Subo a borradores.")
            publish_id = upload_draft(video)
            modo = "borrador"
    except Exception as e:
        _log(ctx, f"[TT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    st["tiktok"]["next_part"] = part + 1
    st["tiktok"]["posted"].append({"part": part, "publish_id": publish_id, "modo": modo,
                                   "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    if modo == "directo":
        _log(ctx, f"[TT] ✅ Parte {part} publicada directo ({TT_PRIVACY}).")
        _tt_wait_status(ctx, publish_id)
    else:
        _log(ctx, f"[TT] ✅ Parte {part} en borradores de TikTok (publicala desde la app).")


def _in_env(key: str) -> bool:
    env = ROOT / ".env"
    if not env.exists():
        return False
    return any(line.strip().startswith(f"{key}=") for line in env.read_text(encoding="utf-8").splitlines())


def main() -> int:
    channel = "faceless"
    if "--channel" in sys.argv:
        idx = sys.argv.index("--channel")
        if idx + 1 >= len(sys.argv):
            print("Error: --channel requiere un nombre de canal como argumento.")
            return 1
        channel = sys.argv[idx + 1]
    only = None
    if "--only" in sys.argv:
        idx = sys.argv.index("--only")
        if idx + 1 >= len(sys.argv):
            print("Error: --only requiere un valor (yt, ig o tt) como argumento.")
            return 1
        only = sys.argv[idx + 1]
    dry = "--dry-run" in sys.argv

    try:
        ctx = get_channel(channel)
    except KeyError as e:
        print(str(e))
        return 1
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
    _save_state(state, channel)
    return 0


if __name__ == "__main__":
    sys.exit(main())
