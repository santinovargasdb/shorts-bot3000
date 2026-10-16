# autobuild/runway.py
"""Mide el colchón (runway) de un canal. Funciones puras: leen automation_state.json
y el PARTS FRESCO del módulo de serie (importlib.reload), no escriben nada."""
from __future__ import annotations

import importlib
import json
from pathlib import Path

from channels_registry import get_channel
from autobuild.config import PLATFORM_MAP, REFILL

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "automation_state.json"


def next_part(channel: str, state_path=STATE) -> int:
    """next_part más adelantado entre las plataformas activas del canal (default 1)."""
    ch = get_channel(channel)
    plats = [PLATFORM_MAP[p] for p in ch["platforms"] if p in PLATFORM_MAP]
    state_path = Path(state_path)
    if not plats or not state_path.exists():
        return 1
    data = json.loads(state_path.read_text(encoding="utf-8"))
    cstate = data.get(channel, {})
    vals = [int(cstate.get(p, {}).get("next_part", 1)) for p in plats]
    return max(vals) if vals else 1


def available_parts(channel: str) -> set[int]:
    """Set FRESCO de las keys de PARTS (episodios listos/aprobados). Relee la fuente:
    recarga el módulo de serie para no ver el PARTS cacheado al importar."""
    ch = get_channel(channel)
    mod = importlib.import_module(ch["series"])
    mod = importlib.reload(mod)
    return set(getattr(mod, "PARTS", {}).keys())


def parts_ahead(channel: str, state_path=STATE) -> int:
    """Cantidad de episodios listos con key >= next_part (gap-safe)."""
    nextp = next_part(channel, state_path)
    return sum(1 for p in available_parts(channel) if p >= nextp)


def runway_days(channel: str, state_path=STATE) -> float:
    ppd = REFILL[channel]["posts_per_day"]
    return parts_ahead(channel, state_path) / ppd
