#!/usr/bin/env python
"""Genera una parte de la serie 'Datos para parecer inteligente'.

  python serie_run.py --part 2
  python serie_run.py --part 3
"""
from __future__ import annotations

import argparse
import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src.curiosidades import generate
from series_data import KEYWORDS, PARTS, background_for, descripcion


def main() -> int:
    p = argparse.ArgumentParser(description="Genera una parte de la serie.")
    p.add_argument("--part", type=int, default=1, help="Número de parte (ver series_data.py)")
    args = p.parse_args()

    if args.part not in PARTS:
        p.error(f"Parte {args.part} no existe. Disponibles: {sorted(PARTS)}")
    part = PARTS[args.part]

    out = generate(
        part["segments"],
        title_meta=f"Datos para parecer inteligente pt. {args.part}",
        description=descripcion(args.part, part["resumen"]),
        hashtags=KEYWORDS,
        background=background_for(args.part),
        music="music/monkeys_spinning_monkeys.mp3",
    )
    print("\nShort:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
