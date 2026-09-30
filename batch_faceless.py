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

# (archivo de guion, título/gancho, video de fondo)
JOBS = [
    ("guiones/miel.txt",       "La miel nunca se echa a perder",        f"{BG}/pixabay_satisfying_363890.mp4"),
    ("guiones/tiburones.txt",  "Los tiburones son más viejos que los árboles", f"{BG}/pixabay_ink_water_21536.mp4"),
    ("guiones/cleopatra.txt",  "Cleopatra vivió más cerca de la Luna",  f"{BG}/pixabay_paint_mixing_354090.mp4"),
    ("guiones/tardigrado.txt", "El animal imposible de matar",          f"{BG}/pixabay_slime_376662.mp4"),
    ("guiones/venus.txt",      "En Venus un día dura más que un año",    f"{BG}/pixabay_lava_lamp_2818.mp4"),
    ("guiones/platanos.txt",   "Los plátanos son radiactivos",          f"{BG}/pixabay_paint_mixing_344401.mp4"),
    ("guiones/saturno.txt",    "Saturno flotaría en el agua",           f"{BG}/pixabay_ink_water_27803.mp4"),
    ("guiones/flamencos.txt",  "Los flamencos no nacen rosados",        f"{BG}/pixabay_slime_139974.mp4"),
]


def main() -> int:
    results = []
    for i, (guion, title, bg) in enumerate(JOBS, 1):
        text = Path(guion).read_text(encoding="utf-8").strip()
        print(f"\n=== {i}/{len(JOBS)}: {title} ===")
        try:
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
