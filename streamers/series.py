"""Loader compartido de los adaptadores series_streamers_a/b: lee el backlog de un canal
y lo expone como PARTS (igual que series_whatonearth: video pre-renderizado)."""
from __future__ import annotations

from streamers import config as scfg, db


def load_parts(channel_key: str) -> dict:
    cfg = scfg.get(channel_key)
    if not cfg["db"].exists():
        return {}
    conn = db.connect(cfg["db"])
    try:
        return {c["seq"]: {"titulo": c["title"], "video_path": c["video_path"],
                           "descripcion": c["description"], "resumen": c["title"]}
                for c in db.by_status(conn, "approved")}   # solo aprobados por el usuario
    finally:
        conn.close()
