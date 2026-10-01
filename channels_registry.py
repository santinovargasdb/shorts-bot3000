"""Registro de canales de la automatización multi-canal.

Cada canal declara su módulo de guiones, su perfil del motor (channels.yaml),
su música, sus secretos y sus plataformas activas. Los canales futuros
(Reddit, streamers) se enchufan agregando una entrada acá + su módulo.
"""
from __future__ import annotations

import importlib

CHANNELS = {
    "faceless": {
        "display": "En 60 Segundos",
        "series": "series_data",
        "engine_channel": "faceless",
        "music": "music/monkeys_spinning_monkeys.mp3",
        "yt_token": None,     # None = secrets/token.json (legacy, no tocar)
        "ig_creds": None,     # None = IG_USER_ID/IG_ACCESS_TOKEN del .env (legacy)
        "platforms": ("yt", "ig", "tt"),
    },
    "historia": {
        "display": "Historia en 60 Segundos",
        "series": "series_historia",
        "engine_channel": "historia",
        "music": "music/historia_tema.mp3",
        "yt_token": "secrets/historia/token.json",
        "ig_creds": "secrets/historia/instagram.json",
        "platforms": ("yt", "ig"),   # TikTok se activa cuando aprueben la app
    },
}


def get_channel(name: str) -> dict:
    if name not in CHANNELS:
        raise KeyError(f"Canal '{name}' no registrado. Opciones: {', '.join(CHANNELS)}")
    return {"name": name, **CHANNELS[name]}


def load_series(ctx: dict):
    """Importa el módulo de guiones del canal (PARTS, KEYWORDS, title_for...)."""
    return importlib.import_module(ctx["series"])
