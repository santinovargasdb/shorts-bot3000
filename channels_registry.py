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
        "tt_token": None,     # None = secrets/tiktok_token.json (global, legacy)
        # TikTok PAUSADO 2026-10-28 (sin "tt"): no publicamos los borradores a mano hasta que
        # aprueben la automatización, y así TikTok deja de consumir el backlog por delante de
        # YT/IG. Re-agregar "tt" cuando TikTok apruebe prod. Ver [[tiktok-auth-estado]].
        "platforms": ("yt", "ig"),
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
        "tt_token": "secrets/historia/tiktok_token.json",
        "platforms": ("yt", "ig"),   # TikTok PAUSADO 2026-10-28 hasta aprobación de prod; ver [[tiktok-auth-estado]]
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
        "tt_token": "secrets/misterios/tiktok_token.json",
        "platforms": ("yt", "ig"),   # TikTok PAUSADO 2026-10-28 hasta aprobación de prod; ver [[tiktok-auth-estado]]
        "first_comment": "Dejá tu teoría abajo 👇 ¿qué creés que pasó de verdad?",
        "sfx_style": "misterios",    # riser hacia el remate + corte de música
    },
    "soyelmalo": {
        "display": "¿Soy el Malo?",
        "series": "series_reddit",       # adaptador DINÁMICO: lee reddit_pipeline/stories.sqlite
        "engine_channel": "soyelmalo",
        "music": "music/lofi",           # igual que los 3 videos de prueba aprobados
        "yt_token": "secrets/soyelmalo/token.json",
        "ig_creds": "secrets/soyelmalo/instagram.json",
        "tt_token": "secrets/soyelmalo/tiktok_token.json",
        # YT reactivado 2026-10-27: la cuota ya NO limita. Desde dic-2025 videos.insert
        # tiene bucket propio ("Video Uploads per day" = 100 subidas/día, aparte del pool
        # de 10.000). Va por el proyecto Cloud del tier seguro. Requiere token válido en
        # secrets/soyelmalo/token.json (reautorizar si venció). IG postea independiente.
        # TikTok PAUSADO 2026-10-30 (sin "tt"): igual que faceless/historia/misterios, no
        # publicamos los borradores a mano hasta que aprueben la automatización de TikTok.
        # Ver [[tiktok-auth-estado]]. Re-agregar "tt" cuando aprueben prod.
        "platforms": ("yt", "ig"),
        "first_comment": "¿Vos qué hubieras hecho? 👇",
        "sfx_style": "datos",        # pop en el cambio de palabra (igual que render_reddit)
    },
    "whatonearth": {
        "display": "What On Earth Is This",
        "series": "series_whatonearth",   # adaptador: lee whatonearth/videos.sqlite (pre-render)
        "engine_channel": "whatonearth",
        "music": "music/lofi",            # no se usa (video pre-renderizado), requerido por el ctx
        "yt_token": "secrets/whatonearth/token.json",
        "ig_creds": "secrets/whatonearth/instagram.json",
        "tt_token": "secrets/whatonearth/tiktok_token.json",
        # YT activo (2026-10-15): proyecto Cloud propio "riskyshortvids" (779426266234),
        # cuota aparte del tier seguro. client_secret+token en secrets/whatonearth/.
        "platforms": ("yt", "ig", "tt"),
        "first_comment": "Could you name them all? \U0001F440 Drop your score below!",
        "sfx_style": "datos",
    },
    # --- TIER RIESGOSO: clips de streamers (video pre-renderizado en streamers/backlog_*.sqlite).
    # platforms=() hasta que existan las cuentas/infra AISLADAS (email+Cloud+Meta propios).
    # Ver [[tier-riesgoso-canales-clips]]. Backlog: python -m streamers.build streamers_a 5
    "streamers_a": {
        "display": "Clips Hispanos",
        "series": "series_streamers_a",    # adaptador: lee streamers/backlog_a.sqlite
        "engine_channel": "streamers",
        "music": "music/streamers",        # no se usa (pre-renderizado), requerido por el ctx
        "yt_token": "secrets/streamers_a/token.json",
        "ig_creds": "secrets/streamers_a/instagram.json",
        "tt_token": "secrets/streamers_a/tiktok_token.json",
        "platforms": ("yt",),              # YT activo (2026-10-19); sumar "ig"/"tt" al crear esas cuentas
        "first_comment": "¿De qué streamer querés el próximo clip? \U0001F447",
        "sfx_style": "datos",
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        "series": "series_streamers_b",    # adaptador: lee streamers/backlog_b.sqlite
        "engine_channel": "streamers",
        "music": "music/streamers",
        "yt_token": "secrets/streamers_b/token.json",
        "ig_creds": "secrets/streamers_b/instagram.json",
        "tt_token": "secrets/streamers_b/tiktok_token.json",
        "platforms": ("yt", "ig"),         # YT+IG activos (IG 2026-10-20); falta "tt"
        "first_comment": "¿De qué streamer querés el próximo clip? \U0001F447",
        "sfx_style": "datos",
    },
    "streamers_c": {
        "display": "Clips IRL",
        "series": "series_streamers_c",    # adaptador: lee streamers/backlog_c.sqlite (facecam-only, IRL inglés)
        "engine_channel": "streamers",
        "music": "music/streamers",
        "yt_token": "secrets/streamers_c/token.json",
        "ig_creds": "secrets/streamers_c/instagram.json",
        "tt_token": "secrets/streamers_c/tiktok_token.json",
        "platforms": ("yt", "ig"),         # YT+IG activos (IG clipsirl.47, 2026-10-20); falta "tt"
        "first_comment": "Which streamer should we clip next? \U0001F447",
        "sfx_style": "datos",
    },
}


def get_channel(name: str) -> dict:
    if name not in CHANNELS:
        raise KeyError(f"Canal '{name}' no registrado. Opciones: {', '.join(CHANNELS)}")
    return {"name": name, **CHANNELS[name]}


def load_series(ctx: dict):
    """Importa el módulo de guiones del canal (PARTS, KEYWORDS, title_for...)."""
    return importlib.import_module(ctx["series"])
