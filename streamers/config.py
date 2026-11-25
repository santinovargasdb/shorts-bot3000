"""Canales de clips de streamers (tier riesgoso aislado). Cada canal = una lista de
streamers + su propio backlog. A = hispanos, B = argentinos. D (por-juego) queda para
más adelante (ver [[tier-riesgoso-canales-clips]]).

OJO: los handles son los de TWITCH (twitch.tv/<handle>). Verificá/expandí las listas;
algunos pueden necesitar ajuste. yt-dlp lista `twitch.tv/<handle>/clips?range=...`.
"""
from __future__ import annotations

from datetime import date
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
        # Juego del momento (lanzamiento de GTA VI): sus clips se sourcean ANTES que el resto y
        # saltean la fila del backlog al postear. Se apaga solo en `until`; si rinde, correr la fecha.
        "priority_game": {
            "names": ("grand theft auto vi", "grand theft auto 6"),   # categoría de Twitch, en minúscula
            "tag": "GTA 6",            # va adelante del título y como hashtag
            "period": "7d",            # solo clips frescos
            "min_views": 500,          # views en Twitch: menos que eso, no lo miró nadie
            "until": "2026-12-15",
            # Prueba desde 25-nov-2026: el juego a pantalla completa (sin panel de cara ni
            # satisfactorio) y título que describe el momento. Los 6 clips anteriores, en el
            # formato de siempre, hicieron ~1.465 de mediana. Borrar estas dos líneas para volver.
            "layout": "juego",
            "smart_title": True,
        },
    },
    "streamers_b": {
        "display": "Clips Argentinos",
        # Argentinos aprobados en el ledger. Orden = prioridad del round-robin (= orden del ledger;
        # coscu queda ultimo: casino -> el QC suele rechazar).
        "streamers": approved_for("streamers_b"),
        "db": ROOT / "streamers" / "backlog_b.sqlite",
        "period": "all",               # Kick time 'all' = los bangers del streamer
        "content": "irl",              # IRL/charla: es lo que hacen estos streamers (con gameplay rendía ~0)
        "language": "es",              # argentinos: transcribir/subtitular en español
        "layout_override": "facecam",  # formato facecam-only, igual que el canal C
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


def priority_game(cfg: dict, today: date | None = None) -> dict | None:
    """El juego prioritario del canal si está vigente (hasta `until` inclusive); si no, None."""
    pg = cfg.get("priority_game")
    if not pg or (today or date.today()) > date.fromisoformat(pg["until"]):
        return None
    return pg
