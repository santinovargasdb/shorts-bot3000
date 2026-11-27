"""Junta cuadros sueltos (out/still_<t>.jpg de `node capture.mjs --stills`) en una hoja para revisarlos.

    python anim3d/hoja.py alc_2 6 0.6 3 6 9 12.5 16.5        # nombre, columnas, tiempos...
    python anim3d/hoja.py zoom 4 --prefix zoom 3.2 3.5       # los recortes de la persona
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

OUT = Path(__file__).resolve().parent / "out"


def main(argv):
    prefix = "still"
    if "--prefix" in argv:
        i = argv.index("--prefix"); prefix = argv[i + 1]; del argv[i:i + 2]
    name, cols, times = argv[0], int(argv[1]), argv[2:]
    rows = -(-len(times) // cols)
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            shutil.copy(OUT / f"{prefix}_{t.replace('.', '_')}.jpg", Path(tmp) / f"{i:03d}.jpg")
        width = 1920 // cols
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(Path(tmp) / "%03d.jpg"),
                        "-vf", f"scale={width}:-1,tile={cols}x{rows}", "-frames:v", "1", str(OUT / f"{name}.jpg")], check=True)
    print(OUT / f"{name}.jpg")


if __name__ == "__main__":
    main(sys.argv[1:])
