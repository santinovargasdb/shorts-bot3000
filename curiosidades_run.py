#!/usr/bin/env python
"""Genera un Short de CURIOSIDADES sobre gameplay:
Minecraft de fondo + imágenes que aparecen en el centro solo mientras se narra
cada dato (con 'pop') + título hablado. Flujo: gancho -> título -> resto.

  python curiosidades_run.py
"""
from __future__ import annotations

import sys

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src.curiosidades import generate

TITULO_META = "7 cosas que no sabías"

# Orden = flujo del video. El primer 'fact' es el gancho (el dato más fuerte).
# 'title' es el título hablado que aparece grande y centrado.
SEGMENTS = [
    {"kind": "fact",  "text": "El pulpo tiene tres corazones y su sangre es azul.",           "img": "octopus"},
    {"kind": "title", "text": "Estas son cosas que no sabías."},
    {"kind": "fact",  "text": "En Venus, un solo día dura más que todo un año.",              "img": "venus planet"},
    {"kind": "fact",  "text": "Los tiburones existen desde antes que los árboles.",           "img": "shark underwater"},
    {"kind": "fact",  "text": "La miel nunca se echa a perder, ni en mil años.",              "img": "honey"},
    {"kind": "fact",  "text": "Un rayo es cinco veces más caliente que la superficie del Sol.","img": "lightning"},
    {"kind": "fact",  "text": "Saturno es tan liviano que flotaría en el agua. Seguime para más.","img": "saturn planet"},
]


def main() -> int:
    out = generate(SEGMENTS, title_meta=TITULO_META,
                   background="backgrounds/minecraft_parkour.mp4",
                   music="music/monkeys_spinning_monkeys.mp3")
    print("\nShort:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
