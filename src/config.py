"""Carga la configuración de canales desde config/channels.yaml.

Une los `defaults` con el perfil de cada canal (el canal pisa los defaults).
"""
from __future__ import annotations

import copy
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "channels.yaml"


def _deep_merge(base: dict, override: dict) -> dict:
    """Une dos dicts de forma recursiva; `override` gana."""
    result = copy.deepcopy(base)
    for key, value in override.items():
        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(value, dict)
        ):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def load_all(config_path: Path | str = CONFIG_PATH) -> dict[str, dict]:
    """Devuelve {nombre_canal: config_fusionada} para todos los canales."""
    data = yaml.safe_load(Path(config_path).read_text(encoding="utf-8"))
    defaults = data.get("defaults", {})
    channels = {}
    for name, profile in data.items():
        if name == "defaults":
            continue
        merged = _deep_merge(defaults, profile or {})
        merged["_name"] = name
        channels[name] = merged
    return channels


def load_channel(name: str, config_path: Path | str = CONFIG_PATH) -> dict[str, Any]:
    """Devuelve la config fusionada de un canal concreto."""
    channels = load_all(config_path)
    if name not in channels:
        disponibles = ", ".join(channels)
        raise KeyError(f"Canal '{name}' no existe. Disponibles: {disponibles}")
    return channels[name]
