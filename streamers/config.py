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
        "content": "gameplay",         # solo GAMEPLAY (el IRL va al canal C); layout auto 2-paneles
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        "streamers": ["coscu", "spreen", "davooxeneize", "brunenger"],
        "db": ROOT / "streamers" / "backlog_b.sqlite",
        "period": "all",               # Kick time 'all' = los bangers del streamer
        "content": "gameplay",
        "platform": "kick",            # los AR grandes se mudaron a Kick (API JSON + m3u8, NO Twitch)
    },
    "streamers_c": {
        "display": "Clips IRL Españoles",
        "streamers": ["ibai", "auronplay", "elxokas", "illojuan"],
        "db": ROOT / "streamers" / "backlog_c.sqlite",
        "period": "30d",
        "content": "irl",              # solo CHARLA/IRL (descarta gameplay)
        "layout_override": "facecam",  # formato facecam-only (cara sola), no 2-paneles
    },
}


def get(channel_key: str) -> dict:
    if channel_key not in CHANNELS:
        raise KeyError(f"Canal de streamers '{channel_key}' no existe: {list(CHANNELS)}")
    return CHANNELS[channel_key]
