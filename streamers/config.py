"""Canales de clips de streamers (tier riesgoso aislado). Cada canal = una lista de
streamers + su propio backlog. A = hispanos, B = argentinos. D (por-juego) queda para
más adelante (ver [[tier-riesgoso-canales-clips]]).

OJO: los handles son los de TWITCH (twitch.tv/<handle>). Verificá/expandí las listas;
algunos pueden necesitar ajuste. yt-dlp lista `twitch.tv/<handle>/clips?range=...`.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHANNELS = {
    "streamers_a": {
        "display": "Clips Hispanos",
        "streamers": ["ibai", "auronplay", "illojuan", "elxokas"],
        "db": ROOT / "streamers" / "backlog_a.sqlite",
        "period": "30d",
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        "streamers": ["coscu", "spreen", "davooxeneize"],
        "db": ROOT / "streamers" / "backlog_b.sqlite",
        "period": "30d",
    },
}


def get(channel_key: str) -> dict:
    if channel_key not in CHANNELS:
        raise KeyError(f"Canal de streamers '{channel_key}' no existe: {list(CHANNELS)}")
    return CHANNELS[channel_key]
