#!/usr/bin/env python
"""Job diario: publica la próxima parte de la serie en YouTube y en Instagram.

Cada plataforma lleva su propio contador (state), así una no bloquea a la otra
(ej: si YouTube tocó el límite diario, Instagram igual postea).
Genera el video si no existe. Pensado para correr desde el Programador de
tareas de Windows (run_daily.bat), 2 veces por día.

  python daily_post.py            # postea en YouTube + Instagram
  python daily_post.py --dry-run  # genera si falta, NO publica (para probar)
  python daily_post.py --only yt  # o --only ig
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

from series_data import KEYWORDS, PARTS, background_for, descripcion
from src.curiosidades import generate
from src.faceless import _slug

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "automation_state.json"
OUT = ROOT / "output" / "faceless"

# ─── Configuración ───────────────────────────────────────────────
YT_PRIVACY = "public"     # "public" (auto viral) | "unlisted" | "private"
# ─────────────────────────────────────────────────────────────────


def _log(msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M}] {msg}", flush=True)


def _load_state() -> dict:
    s = {"youtube": {"next_part": 1, "posted": []},
         "instagram": {"next_part": 1, "posted": []},
         "tiktok": {"next_part": 1, "posted": []}}
    if STATE.exists():
        old = json.loads(STATE.read_text(encoding="utf-8"))
        if "next_part" in old:            # migrar formato viejo (solo YouTube)
            s["youtube"]["next_part"] = old["next_part"]
            s["youtube"]["posted"] = old.get("posted", [])
        else:
            for k, v in old.items():
                s.setdefault(k, {"next_part": 1, "posted": []}).update(v)
    return s


def _save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")


def _title(part: int) -> str:
    return f"Datos para parecer inteligente pt. {part}"


def _ensure_video(part: int) -> Path:
    """Devuelve el mp4 de la parte, generándolo si no existe."""
    video = OUT / f"{_slug(_title(part))}.mp4"
    if not video.exists():
        _log(f"Generando parte {part}...")
        generate(PARTS[part]["segments"], title_meta=_title(part),
                 description=descripcion(part, PARTS[part]["resumen"]),
                 hashtags=KEYWORDS, background=background_for(part),
                 music="music/monkeys_spinning_monkeys.mp3", verbose=False)
    return video


def _caption(video: Path) -> str:
    meta = video.with_suffix(".json")
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8")).get("description", video.stem)
    return video.stem


def do_youtube(state: dict) -> None:
    part = state["youtube"]["next_part"]
    if part not in PARTS:
        _log(f"[YT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part)
    from uploaders.youtube_upload import upload_from_folder
    _log(f"[YT] Subiendo parte {part} ({YT_PRIVACY})...")
    try:
        vid = upload_from_folder(video, privacy=YT_PRIVACY)
    except Exception as e:
        _log(f"[YT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    state["youtube"]["next_part"] = part + 1
    state["youtube"]["posted"].append({"part": part, "video_id": vid, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(f"[YT] ✅ Parte {part}: https://youtube.com/shorts/{vid}")


def do_instagram(state: dict) -> None:
    if not all(os.environ.get(k) or _in_env(k) for k in ("IG_USER_ID", "IG_ACCESS_TOKEN", "GITHUB_TOKEN")):
        _log("[IG] No configurado (faltan credenciales en .env), lo salteo.")
        return
    part = state["instagram"]["next_part"]
    # Sincronización: IG no se adelanta a YouTube (postea recién cuando YT ya subió
    # esa parte). Así las cuentas quedan alineadas y no se repite lo ya posteado.
    if part >= state["youtube"]["next_part"]:
        _log(f"[IG] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in PARTS:
        _log(f"[IG] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part)
    try:
        from src.gh_release import upload as gh_upload
        from uploaders.instagram_upload import publish_reel
        _log(f"[IG] Parte {part}: subiendo mp4 a hosting...")
        url = gh_upload(video)
        _log(f"[IG] Publicando Reel...")
        media_id = publish_reel(url, caption=_caption(video))
    except Exception as e:
        _log(f"[IG] ⚠️  No se pudo publicar (reintenta la próxima): {e}")
        return
    state["instagram"]["next_part"] = part + 1
    state["instagram"]["posted"].append({"part": part, "media_id": media_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(f"[IG] ✅ Parte {part}: Reel {media_id}")


def do_tiktok(state: dict) -> None:
    """Sube la próxima parte a los BORRADORES de TikTok (el usuario la publica
    en la app con 2 toques). Misma sincronización que IG: no se adelanta a YT."""
    from uploaders.tiktok_upload import TOKEN_FILE
    if not TOKEN_FILE.exists():
        _log("[TT] No configurado (sin token), lo salteo.")
        return
    part = state["tiktok"]["next_part"]
    if part >= state["youtube"]["next_part"]:
        _log(f"[TT] pt.{part} espera a que YouTube publique primero (sincronización). Salteo.")
        return
    if part not in PARTS:
        _log(f"[TT] No hay parte {part} en el backlog. Agregá más partes.")
        return
    video = _ensure_video(part)
    try:
        from uploaders.tiktok_upload import upload_draft
        _log(f"[TT] Subiendo parte {part} a borradores...")
        publish_id = upload_draft(video)
    except Exception as e:
        _log(f"[TT] ⚠️  No se pudo subir (reintenta la próxima): {e}")
        return
    state["tiktok"]["next_part"] = part + 1
    state["tiktok"]["posted"].append({"part": part, "publish_id": publish_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _log(f"[TT] ✅ Parte {part} en borradores de TikTok (publicala desde la app).")


def _in_env(key: str) -> bool:
    env = ROOT / ".env"
    if not env.exists():
        return False
    return any(line.strip().startswith(f"{key}=") for line in env.read_text(encoding="utf-8").splitlines())


def main() -> int:
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]
    dry = "--dry-run" in sys.argv

    state = _load_state()
    if dry:
        yt, ig = state["youtube"]["next_part"], state["instagram"]["next_part"]
        _log(f"[DRY-RUN] Próxima en YouTube: pt.{yt} · en Instagram: pt.{ig}. No publica.")
        # Igual genera los videos si faltan
        for p in {yt, ig}:
            if p in PARTS:
                _ensure_video(p)
        return 0

    if only in (None, "yt"):
        do_youtube(state)
    if only in (None, "ig"):
        do_instagram(state)
    if only in (None, "tt"):
        do_tiktok(state)
    _save_state(state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
