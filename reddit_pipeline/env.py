"""Utilidades de entorno para el pipeline de Reddit."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env() -> None:
    """Carga variables desde .env (KEY=VALUE) si existe, sin dependencias extra.
    Mismo patrón que src/stock.py:_load_env."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())
