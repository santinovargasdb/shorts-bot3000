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
        "music": "music/lofi",          # carpeta de nicho (lo-fi/chill); rota por episodio
        "yt_token": None,     # None = secrets/token.json (legacy, no tocar)
        "ig_creds": None,     # None = IG_USER_ID/IG_ACCESS_TOKEN del .env (legacy)
        "platforms": ("yt", "ig", "tt"),
        "first_comment": "Tirá un dato que sepas vos que nadie conozca 👇",
        "sfx_style": "datos",       # whoosh entre datos + pop en el swap de imagen
    },
    "historia": {
        "display": "Historia en 60 Segundos",
        "series": "series_historia",
        "engine_channel": "historia",
        "music": "music/cinematic",     # carpeta de nicho (cinematic); rota por episodio
        "yt_token": "secrets/historia/token.json",
        "ig_creds": "secrets/historia/instagram.json",
        "platforms": ("yt", "ig"),   # TikTok: falta cuenta propia + tt_token por canal
        "first_comment": "¿Vos qué hubieras hecho en su lugar? 👇",
        "sfx_style": "historia",     # boom en el giro del relato
    },
    "misterios": {
        "display": "Misterios en 60 Segundos",
        "series": "series_misterios",
        "engine_channel": "misterios",
        "music": "music/dark_ambient",  # carpeta de nicho (dark ambient); rota por episodio
        "yt_token": "secrets/misterios/token.json",
        "ig_creds": "secrets/misterios/instagram.json",
        "platforms": ("yt", "ig"),
        "first_comment": "Dejá tu teoría abajo 👇 ¿qué creés que pasó de verdad?",
        "sfx_style": "misterios",    # riser hacia el remate + corte de música
    },
}


def get_channel(name: str) -> dict:
    if name not in CHANNELS:
        raise KeyError(f"Canal '{name}' no registrado. Opciones: {', '.join(CHANNELS)}")
    return {"name": name, **CHANNELS[name]}


def load_series(ctx: dict):
    """Importa el módulo de guiones del canal (PARTS, KEYWORDS, title_for...)."""
    return importlib.import_module(ctx["series"])
