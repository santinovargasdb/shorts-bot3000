"""Generador de Shorts FACELESS (contenido original, sin clipar nada ajeno).

Flujo: guion -> voz IA (edge-tts) -> fondo animado (FFmpeg gradients)
       -> subtítulos karaoke (tiempos exactos de edge-tts) -> short 9:16.

Cero costo, cero riesgo de copyright: la voz, el fondo y el texto son propios.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from . import config as cfg
from .subtitles import build_ass
from .transcribe import transcribe_words
from .tts import synthesize

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"
BACKGROUNDS_DIR = ROOT / "backgrounds"
VIDEO_EXTS = (".mp4", ".mov", ".webm", ".mkv", ".avi")


def _resolve_background(background: str | Path | None, index: int) -> Path | None:
    """Devuelve un video de fondo: archivo dado, elegido de una carpeta, o de
    backgrounds/. None => se usa el gradiente animado."""
    if background:
        p = Path(background)
        if p.is_file():
            return p
        if p.is_dir():
            vids = sorted(f for f in p.iterdir() if f.suffix.lower() in VIDEO_EXTS)
            return vids[index % len(vids)] if vids else None
        return None
    if BACKGROUNDS_DIR.is_dir():
        vids = sorted(f for f in BACKGROUNDS_DIR.iterdir() if f.suffix.lower() in VIDEO_EXTS)
        return vids[index % len(vids)] if vids else None
    return None

# Paletas de fondo (hex) por si se quieren variar
PALETTES = [
    ("0x0f2027", "0x203a43", "0x2c5364"),   # teal oscuro
    ("0x1a2a6c", "0x2a5298", "0x1a2a6c"),   # azul profundo
    ("0x232526", "0x414345", "0x232526"),   # grafito
    ("0x3a1c71", "0xd76d77", "0xffaf7b"),   # violeta-coral
]


def _slug(text: str, maxlen: int = 40) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", text.lower()).strip("_")
    return (s[:maxlen] or "faceless").rstrip("_")


def _duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    return float(out.stdout.strip())


def _compose(
    work_dir: Path,
    narration_mp3: Path,
    ass_file: Path,
    out_name: str,
    duration: float,
    palette: tuple[str, str, str],
    width: int,
    height: int,
    background: Path | None = None,
) -> Path:
    """Compone el short. Si `background` es un video (gameplay/slime/satisfactorio),
    lo usa de fondo (en loop, recortado a 9:16 y oscurecido para que lean los
    subtítulos). Si no, usa un gradiente animado. Ejecuta en cwd=work_dir."""
    if background is not None:
        # Fondo de video: loop infinito recortado a la duración de la narración.
        vf = (
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},setsar=1,eq=brightness=-0.12:saturation=1.15,"
            f"subtitles={ass_file.name},format=yuv420p[v]"
        )
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-t", f"{duration:.3f}", "-i", str(background.resolve()),
            "-i", narration_mp3.name,
            "-filter_complex", vf,
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "160k",
            "-r", "30", "-movflags", "+faststart", "-shortest",
            out_name,
        ]
    else:
        c0, c1, c2 = palette
        grad = (
            f"gradients=s={width}x{height}:c0={c0}:c1={c1}:c2={c2}"
            f":x0=0:y0=0:x1={width}:y1={height}:nb_colors=3:d={duration:.3f}:speed=0.006:type=radial"
        )
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-t", f"{duration:.3f}", "-i", grad,
            "-i", narration_mp3.name,
            "-filter_complex", f"[0:v]subtitles={ass_file.name},format=yuv420p[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
            "-c:a", "aac", "-b:a", "160k",
            "-r", "30", "-movflags", "+faststart", "-shortest",
            out_name,
        ]
    result = subprocess.run(cmd, cwd=str(work_dir), capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg falló al componer faceless:\n{result.stderr[-2000:]}")
    return work_dir / out_name


def generate(
    text: str,
    channel_name: str = "faceless",
    title: str | None = None,
    hashtags: list[str] | None = None,
    palette_index: int = 0,
    background: str | Path | None = None,
    verbose: bool = True,
) -> Path:
    """Genera un short faceless a partir de un guion. Devuelve la ruta del mp4.

    `background`: video de fondo (gameplay/slime/satisfactorio) o carpeta con
    varios. Si no se indica, usa backgrounds/ o un gradiente animado."""
    channel = cfg.load_channel(channel_name)
    width = int(channel["target_width"])
    height = int(channel["target_height"])
    voice = channel.get("tts_voice", "es-MX-DaliaNeural")
    rate = channel.get("tts_rate", "+8%")

    slug = _slug(title or text)
    out_dir = OUTPUT_DIR / channel_name
    work_dir = out_dir / ".work" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    # 1) Voz (edge-tts genera el mp3)
    if verbose:
        print(f"[{channel_name}] Generando voz ({voice})...")
    narration = work_dir / "narration.mp3"
    synthesize(text, narration, voice=voice, rate=rate)
    duration = _duration(narration) + 0.4

    # 2) Tiempos por palabra: Whisper transcribe la narración (sincronía exacta).
    lang = voice.split("-")[0] if "-" in voice else channel.get("language")
    if verbose:
        print(f"[{channel_name}] Transcribiendo narración (Whisper '{channel['whisper_model']}', {lang})...")
    words = transcribe_words(narration, model_size=channel["whisper_model"], language=lang)
    if verbose:
        print(f"[{channel_name}] Narración: {duration:.1f}s, {len(words)} palabras.")

    # 3) Subtítulos karaoke (+ título como gancho arriba)
    ass_file = work_dir / "captions.ass"
    build_ass(
        words, ass_file,
        caption=channel["caption"],
        target_width=width, target_height=height,
        offset=0.0,
        hook_text=title or channel.get("hook_text", "") or "",
        clip_duration=duration,
    )

    # 4) Componer (con fondo de video si hay, si no gradiente)
    bg = _resolve_background(background, palette_index)
    if verbose:
        print(f"[{channel_name}] Componiendo video... (fondo: {bg.name if bg else 'gradiente'})")
    out_name = f"{slug}.mp4"
    rendered = _compose(
        work_dir, narration, ass_file, out_name, duration,
        PALETTES[palette_index % len(PALETTES)], width, height,
        background=bg,
    )
    final = out_dir / out_name
    import shutil
    shutil.move(str(rendered), str(final))

    # 5) Metadatos
    tags = hashtags or ["#shorts", "#curiosidades", "#datos", "#sabiasque", "#viral"]
    meta = {
        "title": (title or text[:60]).strip()[:100],
        "description": (text[:400] + "\n\n" + " ".join(tags)).strip(),
        "hashtags": tags,
    }
    (out_dir / f"{slug}.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if verbose:
        print(f"[{channel_name}] ✅ Short faceless: {final}")
    return final
