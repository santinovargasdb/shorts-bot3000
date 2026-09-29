#!/usr/bin/env python
"""CLI del motor de Shorts.

Ejemplos:
  # A partir de un archivo local:
  python run.py --channel streamers --file "input/mi_video.mp4"

  # Descargando primero la fuente (usa contenido con permiso/derecho):
  python run.py --channel streamers --url "https://..."

  # Ver canales disponibles:
  python run.py --list
"""
from __future__ import annotations

import argparse
import sys

# La consola de Windows usa cp1252 y no puede imprimir emojis/acentos.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from src import config as cfg
from src.pipeline import process_source


def main() -> int:
    p = argparse.ArgumentParser(description="Genera Shorts verticales con subtítulos.")
    p.add_argument("--channel", help="Nombre del canal (ver config/channels.yaml)")
    p.add_argument("--file", help="Ruta a un video fuente local")
    p.add_argument("--url", help="URL a descargar con yt-dlp antes de procesar")
    p.add_argument("--model", help="Forzar modelo Whisper (tiny/base/small/medium)")
    p.add_argument("--list", action="store_true", help="Lista los canales configurados")
    args = p.parse_args()

    if args.list:
        for name, ch in cfg.load_all().items():
            print(f"  {name:18} — {ch['display_name']}  ({ch['crop_mode']}, {ch['clips_per_source']} clips)")
        return 0

    if not args.channel:
        p.error("--channel es obligatorio (o usá --list)")
    if not args.file and not args.url:
        p.error("Indicá --file o --url")

    source = args.file
    if args.url:
        from src.download import download
        print(f"Descargando: {args.url}")
        source = download(args.url)
        print(f"Descargado: {source}")

    overrides = {"whisper_model": args.model} if args.model else None
    outs = process_source(source, args.channel, overrides=overrides)
    print("\nShorts generados:")
    for o in outs:
        print(" -", o)
    return 0


if __name__ == "__main__":
    sys.exit(main())
