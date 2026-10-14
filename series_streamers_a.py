"""Adaptador del canal A (streamers hispanos): lee el backlog streamers/backlog_a.sqlite.
daily_post postea cada parte tal cual vía video_path_for (video pre-renderizado)."""
from __future__ import annotations

from streamers.series import load_parts

KEYWORDS = ["clips", "twitch", "streamer", "gaming", "viral", "fyp", "humor", "momentos"]
PARTS: dict = load_parts("streamers_a")


def title_for(part: int) -> str:
    return PARTS[part]["titulo"]


def descripcion(parte: int, resumen: str) -> str:
    return PARTS[parte]["descripcion"]


def background_for(part: int) -> str:
    return ""   # video pre-renderizado; daily_post usa video_path_for


def video_path_for(part: int) -> str:
    return PARTS[part]["video_path"]
