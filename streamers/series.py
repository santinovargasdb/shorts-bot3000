"""Loader compartido de los adaptadores series_streamers_a/b: lee el backlog de un canal
y lo expone como PARTS (igual que series_whatonearth: video pre-renderizado)."""
from __future__ import annotations

import re

from streamers import config as scfg, db


def clean_title(raw: str) -> str:
    """Limpia el título crudo del clip (Twitch/Kick) para YouTube: saca @menciones y
    #hashtags, colapsa espacios, y pasa a mayúscula inicial los títulos ALL-CAPS LARGOS
    (los cortos tipo 'WTF JAJA XD' se dejan como hype). Si queda vacío, cae al crudo."""
    t = re.sub(r"[@#]\S+", " ", raw or "")
    t = re.sub(r"\s+", " ", t).strip()
    if not t:
        return (raw or "").strip()
    letras = [ch for ch in t if ch.isalpha()]
    if letras and all(ch.isupper() for ch in letras) and len(t) > 25:
        t = t.capitalize()
    return t


def load_parts(channel_key: str) -> dict:
    cfg = scfg.get(channel_key)
    if not cfg["db"].exists():
        return {}
    conn = db.connect(cfg["db"])
    try:
        return {c["seq"]: {"titulo": clean_title(c["title"]), "video_path": c["video_path"],
                           "descripcion": c["description"], "resumen": clean_title(c["title"])}
                for c in db.by_status(conn, "approved")}   # solo aprobados por el usuario
    finally:
        conn.close()
