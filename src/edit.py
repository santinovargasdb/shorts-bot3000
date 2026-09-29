"""Renderiza un short vertical con FFmpeg: recorta un tramo, lo pasa a 9:16
(recorte o fondo borroso) y quema los subtítulos .ass.

Truco Windows: el filtro `subtitles` odia las rutas con `C:\\`. Por eso
ejecutamos ffmpeg con cwd = carpeta del .ass y lo referenciamos por su nombre.
"""
from __future__ import annotations

import subprocess
from pathlib import Path


def _vertical_filter(mode: str, w: int, h: int) -> str:
    """Devuelve el filtro que lleva el video a w x h (9:16)."""
    if mode == "crop":
        # Recorta a 9:16 centrado y escala. Inmersivo para gameplay/cara.
        return f"crop=ih*{w}/{h}:ih,scale={w}:{h},setsar=1"
    # blur: video encajado sobre fondo borroso del mismo video (no recorta contenido)
    return (
        f"split=2[bg][fg];"
        f"[bg]scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},boxblur=luma_radius=40:luma_power=1[bgb];"
        f"[fg]scale={w}:{h}:force_original_aspect_ratio=decrease[fgs];"
        f"[bgb][fgs]overlay=(W-w)/2:(H-h)/2,setsar=1"
    )


def render_short(
    source: Path | str,
    start: float,
    duration: float,
    ass_file: Path | str,
    out_file: Path | str,
    crop_mode: str = "blur",
    width: int = 1080,
    height: int = 1920,
) -> Path:
    """Renderiza un short. `ass_file` y `out_file` deben estar en la misma
    carpeta de trabajo (se ejecuta ffmpeg con cwd ahí)."""
    source = Path(source).resolve()
    ass_file = Path(ass_file)
    out_file = Path(out_file)
    work_dir = ass_file.parent

    geom = _vertical_filter(crop_mode, width, height)
    # Encadena geometría + subtítulos. El .ass se referencia por nombre (cwd).
    vf = f"{geom},subtitles={ass_file.name}"

    cmd = [
        "ffmpeg", "-y",
        "-ss", f"{start:.3f}", "-t", f"{duration:.3f}",
        "-i", str(source),
        "-filter_complex", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-r", "30",
        out_file.name,
    ]
    result = subprocess.run(cmd, cwd=str(work_dir), capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló al renderizar:\n{result.stderr[-2000:]}")
    return work_dir / out_file.name
