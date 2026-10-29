"""Canales de clips de streamers (tier riesgoso aislado). Cada canal = una lista de
streamers + su propio backlog. A = hispanos, B = argentinos. D (por-juego) queda para
más adelante (ver [[tier-riesgoso-canales-clips]]).

OJO: los handles son los de TWITCH (twitch.tv/<handle>). Verificá/expandí las listas;
algunos pueden necesitar ajuste. yt-dlp lista `twitch.tv/<handle>/clips?range=...`.
"""
from __future__ import annotations

from pathlib import Path

from streamers.allowlist import approved_for

ROOT = Path(__file__).resolve().parents[1]

CHANNELS = {
    "streamers_a": {
        "display": "Clips Hispanos",
        # Hispanos aprobados en el ledger (allowlist clip-friendly). Twitch por defecto.
        "streamers": approved_for("streamers_a"),   # solo approved del ledger (gate duro)
        "db": ROOT / "streamers" / "backlog_a.sqlite",
        "period": "30d",
        "content": "gameplay",         # solo GAMEPLAY (el IRL va al canal C); layout auto 2-paneles
        "language": "es",              # hispanos: transcribir/subtitular en español
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        # Argentinos aprobados en el ledger. Orden = prioridad del round-robin (= orden del ledger;
        # coscu queda ultimo: casino -> el QC suele rechazar).
        "streamers": approved_for("streamers_b"),
        "db": ROOT / "streamers" / "backlog_b.sqlite",
        "period": "all",               # Kick time 'all' = los bangers del streamer
        "content": "gameplay",
        "language": "es",              # argentinos: transcribir/subtitular en español
        "platform": "kick",            # default si una entrada no trae platform; hoy el ledger las trae todas
    },
    "streamers_c": {
        "display": "Clips IRL",
        # IRL/charla en INGLES (nicho limpio). Mezcla Twitch y Kick -> plataforma POR-streamer (del ledger).
        "streamers": approved_for("streamers_c"),
        "db": ROOT / "streamers" / "backlog_c.sqlite",
        "period": "30d",
        "content": "irl",              # solo CHARLA/IRL (el QC con content=irl descarta el gameplay)
        "language": "en",              # IRL en INGLÉS: transcribir en 'en' (si no, subtítulos en español mal)
        "layout_override": "facecam",  # formato facecam-only (cara sola), no 2-paneles
    },
}


def get(channel_key: str) -> dict:
    if channel_key not in CHANNELS:
        raise KeyError(f"Canal de streamers '{channel_key}' no existe: {list(CHANNELS)}")
    return CHANNELS[channel_key]
