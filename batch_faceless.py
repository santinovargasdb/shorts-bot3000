#!/usr/bin/env python
"""Genera en tanda varios Shorts faceless, cada uno con su guion y su fondo.

Editá la lista JOBS (guion, título, fondo) y corré:
  python batch_faceless.py
"""
from __future__ import annotations

import sys
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src.faceless import generate

BG = "backgrounds"
# Fondos rotando: gameplay (Minecraft/Subway) + slime. La música se toma
# automáticamente de la carpeta music/.
MINECRAFT = f"{BG}/minecraft_parkour.mp4"
SUBWAY = f"{BG}/subway_surfers.mp4"
SLIME1 = f"{BG}/pixabay_slime_376662.mp4"
SLIME2 = f"{BG}/pixabay_slime_139974.mp4"

# (archivo de guion, título/gancho, video de fondo)
JOBS = [
    ("guiones/miel.txt",       "La miel nunca se echa a perder",        MINECRAFT),
    ("guiones/tiburones.txt",  "Los tiburones son más viejos que los árboles", SUBWAY),
    ("guiones/cleopatra.txt",  "Cleopatra vivió más cerca de la Luna",  SLIME1),
    ("guiones/tardigrado.txt", "El animal imposible de matar",          MINECRAFT),
    ("guiones/venus.txt",      "En Venus un día dura más que un año",    SUBWAY),
    ("guiones/platanos.txt",   "Los plátanos son radiactivos",          SLIME2),
    ("guiones/saturno.txt",    "Saturno flotaría en el agua",           MINECRAFT),
    ("guiones/flamencos.txt",  "Los flamencos no nacen rosados",        SUBWAY),
]


def main() -> int:
    results = []
    for i, (guion, title, bg) in enumerate(JOBS, 1):
        text = Path(guion).read_text(encoding="utf-8").strip()
        print(f"\n=== {i}/{len(JOBS)}: {title} ===")
        try:
            # music=None => se toma automáticamente de la carpeta music/
            out = generate(text, channel_name="faceless", title=title, background=bg)
            results.append(out)
        except Exception as e:
            print(f"  ⚠️  Falló '{title}': {e}")
    print(f"\n✅ {len(results)}/{len(JOBS)} shorts generados en output/faceless/")
    for r in results:
        print(" -", r.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
