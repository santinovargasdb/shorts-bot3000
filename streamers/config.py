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
        # Streamers hispanos de gameplay en Twitch. Handles que no existan se saltean solos.
        "streamers": ["ibai", "auronplay", "illojuan", "elxokas", "thegrefg", "elrubius",
                      "knekro", "perxitaa", "werlyb", "alexby11", "fargan", "ampeterby7",
                      "reborn_live", "outconsumer"],
        "db": ROOT / "streamers" / "backlog_a.sqlite",
        "period": "30d",
        "content": "gameplay",         # solo GAMEPLAY (el IRL va al canal C); layout auto 2-paneles
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        # Orden = prioridad del round-robin. Gameplay primero; coscu último (casino -> QC rechaza).
        # Handles de Kick; los que no existan se saltean solos.
        "streamers": ["davooxeneize", "brunenger", "spreen", "robleis", "zeko", "frankkaster",
                      "buur", "lacobra", "tomasmazza", "momoabrego", "coscu"],
        "db": ROOT / "streamers" / "backlog_b.sqlite",
        "period": "all",               # Kick time 'all' = los bangers del streamer
        "content": "gameplay",
        "platform": "kick",            # los AR grandes se mudaron a Kick (API JSON + m3u8, NO Twitch)
    },
    "streamers_c": {
        "display": "Clips IRL",
        # IRL/charla en INGLÉS (el nicho limpio abunda ahí; refs tipo IShowSpeed). El español ya
        # lo cubre Clips Hispanos. Mezcla Twitch y Kick -> plataforma POR-streamer. El QC con
        # content=irl descarta el gameplay de estos (muchos también juegan).
        # (dukedennis daba 0 clips en Twitch en 30d -> fuera; re-agregar con handle/plataforma ok)
        "streamers": [("kaicenat", "twitch"), ("adinross", "kick"), ("fanum", "twitch"),
                      ("jackdoherty", "kick"), ("xqc", "kick")],
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
