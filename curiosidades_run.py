#!/usr/bin/env python
"""Genera un Short de CURIOSIDADES con imágenes que cambian por cada dato.

Editá la lista DATOS (frase + término de imagen) y corré:
  python curiosidades_run.py
"""
from __future__ import annotations

import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src.multidato import generate_multidato

TITULO = "7 datos que no sabías"

# Cada dato = una frase + el término para buscar su imagen (mejor en inglés).
DATOS = [
    {"text": "El pulpo tiene tres corazones y su sangre es azul.",              "img": "octopus"},
    {"text": "Los tiburones existen desde antes que los árboles.",              "img": "shark underwater"},
    {"text": "En Venus, un solo día dura más que todo un año.",                 "img": "venus planet"},
    {"text": "La miel nunca se echa a perder, ni en mil años.",                 "img": "honey"},
    {"text": "Un rayo es cinco veces más caliente que la superficie del Sol.",  "img": "lightning storm"},
    {"text": "Los flamencos nacen grises y se vuelven rosados por lo que comen.","img": "flamingo"},
    {"text": "Saturno es tan liviano que flotaría en el agua. Seguime para más.","img": "saturn planet"},
]


def main() -> int:
    out = generate_multidato(DATOS, title=TITULO,
                             music="music/monkeys_spinning_monkeys.mp3")
    print("\nShort de curiosidades:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
