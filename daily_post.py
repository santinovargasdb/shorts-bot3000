#!/usr/bin/env python
"""Job diario: sube la próxima parte de la serie (la genera si no existe).

Lleva el estado en automation_state.json (qué parte sigue). Pensado para correr
1 vez por día desde el Programador de tareas de Windows (run_daily.bat).

  python daily_post.py            # genera si falta y sube
  python daily_post.py --dry-run  # genera si falta, NO sube (para probar)
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from series_data import KEYWORDS, PARTS, descripcion
from src.curiosidades import generate
from src.faceless import _slug

ROOT = Path(__file__).resolve().parent
STATE = ROOT / "automation_state.json"
OUT = ROOT / "output" / "faceless"

# ─── Configuración ───────────────────────────────────────────────
PRIVACY = "public"     # "public" (auto viral) | "unlisted" (revisar antes) | "private"
# ─────────────────────────────────────────────────────────────────


def _log(msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M}] {msg}", flush=True)


def _load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text(encoding="utf-8"))
    return {"next_part": 1, "posted": []}


def _save_state(s: dict) -> None:
    STATE.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")


def _video_for(part: int) -> Path:
    slug = _slug(f"Datos para parecer inteligente pt. {part}")
    return OUT / f"{slug}.mp4"


def _post_instagram(video: Path) -> None:
    """Publica el Reel en IG (best-effort). Requiere IG_USER_ID, IG_ACCESS_TOKEN
    y GITHUB_TOKEN en .env. Si falta algo, saltea sin romper el flujo."""
    import os
    from src.gh_release import _load_env
    _load_env()
    if not all(os.environ.get(k) for k in ("IG_USER_ID", "IG_ACCESS_TOKEN", "GITHUB_TOKEN")):
        _log("Instagram no configurado (faltan credenciales en .env), lo salteo.")
        return
    # Caption desde los metadatos del video
    meta_path = video.with_suffix(".json")
    caption = video.stem
    if meta_path.exists():
        caption = json.loads(meta_path.read_text(encoding="utf-8")).get("description", caption)
    try:
        from src.gh_release import upload as gh_upload
        from uploaders.instagram_upload import publish_reel
        _log("Instagram: subiendo mp4 a GitHub Releases (hosting)...")
        url = gh_upload(video)
        _log("Instagram: publicando Reel...")
        media_id = publish_reel(url, caption=caption)
        _log(f"✅ Instagram Reel publicado: {media_id}")
    except Exception as e:
        _log(f"⚠️  Instagram falló (sigo igual): {e}")


def main() -> int:
    dry = "--dry-run" in sys.argv
    state = _load_state()
    part = state.get("next_part", 1)

    if part not in PARTS:
        _log(f"⚠️  No hay parte {part} en series_data.py. Agregá más partes al backlog.")
        return 1

    _log(f"Parte del día: {part}")
    video = _video_for(part)

    # Generar si el video no existe todavía
    if not video.exists():
        _log(f"Generando parte {part}...")
        generate(
            PARTS[part]["segments"],
            title_meta=f"Datos para parecer inteligente pt. {part}",
            description=descripcion(part, PARTS[part]["resumen"]),
            hashtags=KEYWORDS,
            background="backgrounds/minecraft_parkour.mp4",
            music="music/monkeys_spinning_monkeys.mp3",
            verbose=False,
        )
    else:
        _log(f"Video ya existe: {video.name}")

    if dry:
        _log(f"[DRY-RUN] Subiría {video.name} como {PRIVACY}. No se sube.")
        return 0

    # Subir
    from uploaders.youtube_upload import upload_from_folder
    _log(f"Subiendo {video.name} como {PRIVACY}...")
    try:
        video_id = upload_from_folder(video, privacy=PRIVACY)
    except Exception as e:
        _log(f"❌ Error al subir: {e}")
        return 1

    state["next_part"] = part + 1
    state.setdefault("posted", []).append(
        {"part": part, "video_id": video_id, "date": f"{datetime.now():%Y-%m-%d %H:%M}"})
    _save_state(state)
    _log(f"✅ YouTube parte {part}: https://youtube.com/shorts/{video_id}")

    # También a Instagram (best-effort; no bloquea si no está configurado)
    _post_instagram(video)

    _log(f"Próxima parte: {part + 1}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
