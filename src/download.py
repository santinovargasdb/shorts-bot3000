"""Descarga videos fuente con yt-dlp (binario del sistema).

IMPORTANTE (legal): descargá solo contenido para el que tengas permiso o
derecho de uso (clips de streamers que lo permiten, contenido propio,
material con licencia). yt-dlp es la herramienta; el uso responsable es tuyo.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = ROOT / "input"


def download(url: str, out_dir: Path | str = INPUT_DIR, max_height: int = 1080) -> Path:
    """Descarga la mejor versión <= max_height. Devuelve la ruta del archivo."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_tmpl = str(out_dir / "%(id)s.%(ext)s")

    cmd = [
        "yt-dlp",
        "-f", f"bestvideo[height<={max_height}]+bestaudio/best[height<={max_height}]",
        "--merge-output-format", "mp4",
        "--no-playlist",
        "--restrict-filenames",
        "-o", out_tmpl,
        "--print", "after_move:filepath",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp falló:\n{result.stderr}")
    # La última línea impresa por --print es la ruta final del archivo
    path_line = result.stdout.strip().splitlines()[-1].strip()
    return Path(path_line)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python -m src.download <URL>")
        raise SystemExit(1)
    print("Descargado en:", download(sys.argv[1]))
