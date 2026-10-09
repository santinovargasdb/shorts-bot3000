"""Fuente de 'partes' del canal What On Earth Is This. Cada parte = un video YA
renderizado en el backlog (whatonearth/videos.sqlite). daily_post lo postea tal cual
vía el hook video_path_for (no re-renderiza)."""
from __future__ import annotations

from whatonearth import db

KEYWORDS = [
    "shorts", "what is this", "guess", "satisfying", "nature", "animals",
    "travel", "did you know", "weird", "rare", "viral", "fyp",
]


def _load() -> dict:
    if not db.DB_PATH.exists():
        return {}
    conn = db.connect(db.DB_PATH)   # pasar el atributo actual (monkeypatch-friendly)
    try:
        parts = {}
        for v in db.all_videos(conn):
            parts[v["seq"]] = {
                "titulo": v["title"], "video_path": v["video_path"],
                "descripcion": v["description"], "resumen": v["title"],
            }
        return parts
    finally:
        conn.close()


PARTS: dict = _load()


def title_for(part: int) -> str:
    return PARTS[part]["titulo"]


def descripcion(parte: int, resumen: str) -> str:
    return PARTS[parte]["descripcion"]


def background_for(part: int) -> str:
    # El video está pre-renderizado; este stub existe solo para cumplir la interfaz
    # `series` (daily_post usa video_path_for, no background_for, para este canal).
    return ""


def video_path_for(part: int) -> str:
    return PARTS[part]["video_path"]
