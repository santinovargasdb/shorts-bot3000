"""Allowlist de streamers 'clip-friendly' (tier riesgoso): LOGICA publica.

Los DATOS (que streamers + evidencia) viven en `allowlist_data.py`, GITIGNOREADO
(estrategia privada del tier riesgoso). Sin ese archivo, la allowlist queda vacia y ningun
streamer se sourcea -> gate seguro por defecto.

Schema de cada entrada de CLIP_FRIENDLY (en allowlist_data.py):
    "<handle>": {
        "platform": "twitch" | "kick",
        "tier": "streamers_a" | "streamers_b" | "streamers_c",
        "status": "approved" | "rejected",
        "evidence": str,   # link/cita del permiso o senal de tolerancia
        "vetted": str,     # fecha YYYY-MM-DD del vetting
        "notes": str,      # motivo si rejected, u observaciones
    }
El ORDEN de las entradas por tier = prioridad del round-robin del build.
"""
from __future__ import annotations

try:
    from streamers.allowlist_data import CLIP_FRIENDLY
except ImportError:            # repo publico / sin data file -> allowlist vacia (gate seguro)
    CLIP_FRIENDLY: dict = {}


def approved_for(tier: str, ledger: dict | None = None) -> list[tuple[str, str]]:
    """Handles APROBADOS de un tier, como (handle, platform), en orden de prioridad.

    build._name_platform acepta tuplas, asi que esto se enchufa directo en cfg['streamers']
    sin tocar sourcing/build. Un streamer no listado o 'rejected' nunca sale -> gate duro.
    """
    data = CLIP_FRIENDLY if ledger is None else ledger
    return [(h, e["platform"]) for h, e in data.items()
            if e.get("tier") == tier and e.get("status") == "approved"]
