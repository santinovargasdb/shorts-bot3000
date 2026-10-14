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


def _punch_filter(interval: float, amount: float, hold: float) -> str:
    """zoom-punch: golpe breve de zoom cada `interval`s (el "corte" de energía viral).
    Falta el `:s=WxH` (lo agrega quien lo use, según el panel). `fps=30` ANTES del zoompan
    conserva la DURACIÓN (zoompan d=1 mapea 1 frame->1; si la fuente no fuera 30fps
    re-etiquetaría el framerate y alteraría la duración —cámara lenta en 60fps)."""
    period = max(15, round(interval * 30))
    hold_f = max(2, round(hold * 30))
    off = period // 2                                      # no arrancar con un punch en el frame 0
    z = f"1+{amount}*lt(mod(in+{off}\\,{period})\\,{hold_f})"
    return f"fps=30,zoompan=z='{z}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':fps=30"


def render_short(
    source: Path | str,
    start: float,
    duration: float,
    ass_file: Path | str,
    out_file: Path | str,
    crop_mode: str = "blur",
    width: int = 1080,
    height: int = 1920,
    grade: str = "",
    music: str = "",
    music_vol: float = 0.2,
    music_start: float = 0.0,
    crop_rect=None,
    fonts_dir: Path | str | None = None,
    zoom_punch: bool = False,
    punch_interval: float = 2.5,
    punch_amount: float = 0.10,
    punch_hold: float = 0.18,
    sfx_whoosh: Path | str | None = None,
    sfx_vol: float = 0.3,
    layout: str = "",
    face_box=None,
    crf: int = 20,
) -> Path:
    """Renderiza un short. `ass_file` y `out_file` deben estar en la misma
    carpeta de trabajo (se ejecuta ffmpeg con cwd ahí). `grade` = filtro de color
    opcional que se aplica al video ANTES de quemar los subtítulos. `music` = bed
    de música (loopeado) que se mezcla BAJO el audio del clip (que trae el diálogo)."""
    source = Path(source).resolve()
    ass_file = Path(ass_file)
    out_file = Path(out_file)
    work_dir = ass_file.parent

    # Fuente embebida: copiamos los .ttf al work_dir y apuntamos fontsdir a una ruta
    # RELATIVA (sin `C:\`, que el filtro subtitles odia en Windows). Así libass usa
    # Montserrat sin tener que instalarla en el sistema.
    subs = f"subtitles={ass_file.name}"
    if fonts_dir and Path(fonts_dir).exists():
        import shutil
        fdst = work_dir / "_fonts"
        fdst.mkdir(exist_ok=True)
        for ttf in Path(fonts_dir).glob("*.ttf"):
            dst = fdst / ttf.name
            if not dst.exists():
                shutil.copy2(ttf, dst)
        subs += ":fontsdir=_fonts"

    punch = _punch_filter(punch_interval, punch_amount, punch_hold) if zoom_punch else ""

    if layout == "gaming" and face_box:
        # Layout 2 PANELES (clips CON gameplay): cara arriba, gameplay al medio, negro abajo
        # (donde va la UI de TikTok). El viewer ve la reacción Y lo que pasa en pantalla.
        fx, fy, fw_, fh_ = [int(v) for v in face_box]
        FACE_H, GAME_H, GAME_Y = 620, 608, 628
        # lanczos = scaler nítido; unsharp en la cara contrarresta el upscale de la facecam
        # (que es una región chica de la fuente -> la parte más propensa a verse blanda).
        face = (f"crop={fw_}:{fh_}:{fx}:{fy},scale=1080:{FACE_H}:"
                f"force_original_aspect_ratio=increase:flags=lanczos,crop=1080:{FACE_H},"
                f"unsharp=5:5:0.8:5:5:0.0,setsar=1")
        game = (f"scale=1080:{GAME_H}:force_original_aspect_ratio=increase:flags=lanczos,"
                f"crop=1080:{GAME_H},setsar=1")
        if punch:                                          # el zoom-punch pumpea el GAMEPLAY
            game += f",{punch}:s=1080x{GAME_H}"
        post = f"{grade}," if grade else ""                # grade sobre todo el compuesto
        vfc = ";".join([
            "[0:v]split=3[fa][gb][bc]",
            f"[fa]{face}[face]",
            f"[gb]{game}[game]",
            "[bc]scale=1080:1920,drawbox=0:0:1080:1920:color=black:t=fill,setsar=1[bg]",
            "[bg][face]overlay=0:0[t1]",
            f"[t1][game]overlay=0:{GAME_Y}:shortest=1[comp]",
            f"[comp]{post}{subs}[v]",
        ])
    else:
        # Formato facecam-only (clips IRL/sin gameplay) o crop/blur normal.
        if crop_rect:                                      # recorte 9:16 a la facecam
            cx, cy, cw, ch = crop_rect
            geom = f"crop={cw}:{ch}:{cx}:{cy},scale={width}:{height},setsar=1"
        else:
            geom = _vertical_filter(crop_mode, width, height)
        chain = f"{geom},{grade}" if grade else geom
        if punch:                                          # zoom-punch ANTES de los subtítulos
            chain += f",{punch}:s={width}x{height}"
        vfc = f"[0:v]{chain},{subs}[v]"

    # --- Grafo de audio: diálogo del clip [0:a] + (música) + (whoosh en cada punch) ---
    extra_inputs: list[str] = []
    a_fc: list[str] = []            # sub-cadenas de audio
    a_labels: list[str] = ["[0:a]"]  # streams que entran al amix (el 1º fija la duración)
    idx = 1
    if music and Path(music).exists():
        # -ss antes del -i: arranca la música en `music_start` (ej. el drop épico a los 0:30).
        extra_inputs += ["-stream_loop", "-1", "-ss", f"{music_start:.2f}", "-i", str(Path(music).resolve())]
        a_fc.append(f"[{idx}:a]volume={music_vol}[m]")
        a_labels.append("[m]")
        idx += 1
    if zoom_punch and sfx_whoosh and Path(sfx_whoosh).exists():
        # El whoosh entra ~0.18s ANTES de cada punch (barre hacia el golpe). Los tiempos de
        # punch se derivan igual que el zoompan: onset = (period-off) + k*period frames.
        period = max(15, round(punch_interval * 30))
        off = period // 2
        first = (period - off) % period
        ptimes = []
        fnum = first
        while fnum / 30.0 < duration:
            ptimes.append(fnum / 30.0)
            fnum += period
        if ptimes:
            extra_inputs += ["-i", str(Path(sfx_whoosh).resolve())]
            n = len(ptimes)
            a_fc.append(f"[{idx}:a]asplit={n}" + "".join(f"[s{j}]" for j in range(n)))
            for j, t in enumerate(ptimes):
                d = max(0, int((t - 0.18) * 1000))
                a_fc.append(f"[s{j}]adelay={d}|{d},volume={sfx_vol}[sd{j}]")
                a_labels.append(f"[sd{j}]")
            idx += 1

    if len(a_labels) == 1:                                  # solo el audio del clip
        fc = vfc
        maps = ["-map", "[v]", "-map", "0:a"]
    else:
        amix = ("".join(a_labels) +
                f"amix=inputs={len(a_labels)}:duration=first:dropout_transition=0:normalize=0[a]")
        fc = ";".join([vfc] + a_fc + [amix])
        maps = ["-map", "[v]", "-map", "[a]"]

    cmd = ["ffmpeg", "-y", "-sws_flags", "lanczos",
           "-ss", f"{start:.3f}", "-t", f"{duration:.3f}", "-i", str(source),
           *extra_inputs, "-filter_complex", fc, *maps,
           "-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-r", "30",
           "-shortest", out_file.name]
    result = subprocess.run(cmd, cwd=str(work_dir), capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló al renderizar:\n{result.stderr[-2000:]}")
    return work_dir / out_file.name
