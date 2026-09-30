#!/usr/bin/env python
"""Genera un Short faceless a partir de un guion de texto.

Ejemplos:
  python faceless_run.py --file guiones/pulpos.txt --title "El pulpo tiene 3 corazones"
  python faceless_run.py --text "Dato corto..." --title "Mi título" --palette 1
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src.faceless import generate


def main() -> int:
    p = argparse.ArgumentParser(description="Genera un Short faceless (guion -> voz -> video).")
    p.add_argument("--file", help="Ruta a un .txt con el guion")
    p.add_argument("--text", help="Guion directo como texto")
    p.add_argument("--title", help="Título/gancho (arriba en pantalla y como título de YouTube)")
    p.add_argument("--channel", default="faceless")
    p.add_argument("--palette", type=int, default=0, help="Índice de paleta de fondo (0-3)")
    p.add_argument("--bg", help="Video de fondo (gameplay/slime/satisfactorio) o carpeta. Si se omite, usa backgrounds/ o gradiente.")
    args = p.parse_args()

    if args.file:
        text = Path(args.file).read_text(encoding="utf-8").strip()
    elif args.text:
        text = args.text.strip()
    else:
        p.error("Indicá --file o --text")

    out = generate(text, channel_name=args.channel, title=args.title,
                   palette_index=args.palette, background=args.bg)
    print("\nShort generado:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
