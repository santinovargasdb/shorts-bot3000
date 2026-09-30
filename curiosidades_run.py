#!/usr/bin/env python
"""Genera un Short de la serie "Datos para parecer inteligente".
Minecraft de fondo + imágenes en el centro (whoosh + animación) por cada dato,
título hablado que aparece grande. Flujo: gancho -> título -> resto.

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

# --- Serie ---
PARTE = 1
TITULO_META = f"Datos para parecer inteligente pt. {PARTE}"

# Orden = flujo. El primer 'fact' es el gancho (el dato más fuerte).
# 'title' es el título hablado que aparece grande y centrado.
SEGMENTS = [
    {"kind": "fact",  "text": "El pulpo tiene tres corazones y su sangre es azul.",            "img": "octopus"},
    {"kind": "title", "text": "Datos para parecer más inteligente."},
    {"kind": "fact",  "text": "En Venus, un solo día dura más que todo un año.",               "img": "venus planet"},
    {"kind": "fact",  "text": "Los tiburones existen desde antes que los árboles.",            "img": "shark underwater"},
    {"kind": "fact",  "text": "La miel nunca se echa a perder, ni en mil años.",               "img": "honey"},
    {"kind": "fact",  "text": "Un rayo es cinco veces más caliente que la superficie del Sol.","img": "lightning"},
    {"kind": "fact",  "text": "Saturno es tan liviano que flotaría en el agua. Seguime para la parte dos.","img": "saturn planet"},
]

# Descripción con gancho, framing de serie y keywords para el buscador de YouTube.
DESCRIPCION = (
    "¿Querés parecer más inteligente? 🧠 Bienvenido a la serie donde te tiro datos "
    "curiosos que casi nadie conoce para que dejes a todos con la boca abierta.\n\n"
    f"📌 Parte {PARTE}: el pulpo y su sangre azul, por qué en Venus un día dura más que "
    "un año, los tiburones más antiguos que los árboles, la miel que nunca caduca, los "
    "rayos más calientes que el Sol y por qué Saturno flotaría en el agua.\n\n"
    "💡 Seguime para no perderte la Parte 2 con más curiosidades y cultura general en 60 segundos.\n\n"
    "datos curiosos, curiosidades, cosas que no sabías, cultura general, sabías que, "
    "datos interesantes, datos para parecer inteligente, aprender rápido.\n\n"
    "#shorts #curiosidades #datoscuriosos #sabiasque #culturageneral #datos"
)

# Palabras clave / tags para el motor de búsqueda de YouTube (sin #).
KEYWORDS = [
    "shorts", "curiosidades", "datos curiosos", "sabias que", "cultura general",
    "datos interesantes", "datos para parecer inteligente", "cosas que no sabias",
    "aprender rapido", "curiosidades del mundo", "datos random", "viral",
]


def main() -> int:
    out = generate(SEGMENTS, title_meta=TITULO_META, description=DESCRIPCION, hashtags=KEYWORDS,
                   background="backgrounds/minecraft_parkour.mp4",
                   music="music/monkeys_spinning_monkeys.mp3")
    print("\nShort:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
