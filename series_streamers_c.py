"""Adaptador del canal C (streamers IRL en INGLÉS): lee el backlog streamers/backlog_c.sqlite.
Clips de charla/IRL (refs tipo IShowSpeed) en formato facecam-only. daily_post postea solo los
aprobados. El español lo cubre Clips Hispanos."""
from __future__ import annotations

from streamers.series import load_parts

KEYWORDS = ["clips", "irl", "streamer", "funny", "reaction", "viral", "fyp", "twitch"]
PARTS: dict = load_parts("streamers_c")


def title_for(part: int) -> str:
    return PARTS[part]["titulo"]


def descripcion(parte: int, resumen: str) -> str:
    return PARTS[parte]["descripcion"]


def background_for(part: int) -> str:
    return ""   # video pre-renderizado; daily_post usa video_path_for


def video_path_for(part: int) -> str:
    return PARTS[part]["video_path"]
