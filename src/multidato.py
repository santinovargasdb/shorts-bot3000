"""Generador de Shorts de CURIOSIDADES con imágenes que CAMBIAN por cada dato.

Cada dato (una frase) tiene su propia imagen con efecto Ken Burns (zoom lento).
El plano cambia cada pocos segundos -> maximiza la ventana de atención.

Flujo:
  1) Voz IA por cada dato -> audios + duración de cada uno.
  2) Imagen de Pixabay por cada dato -> clip Ken Burns de esa duración.
  3) Se concatenan audios y clips (los planos cambian con cada dato).
  4) Whisper -> subtítulos karaoke. Música de fondo baja. Compone el short.

Uso (ver curiosidades_run.py):
  from src.multidato import generate_multidato
  generate_multidato([{"text": "...", "img": "space"}, ...], title="Curiosidades")
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from . import config as cfg
from . import stock
from .faceless import OUTPUT_DIR, _compose, _resolve_music, _slug
from .subtitles import build_ass
from .transcribe import transcribe_words
from .tts import synthesize

ROOT = Path(__file__).resolve().parent.parent
MUSIC_DIR = ROOT / "music"


def _duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    return float(out.stdout.strip())


def _audio_dur(path: Path) -> float:
    """Duración EXACTA decodificando el audio (ffprobe subestima los mp3 de
    edge-tts, lo que desincroniza los planos)."""
    import re
    r = subprocess.run(["ffmpeg", "-i", str(path), "-f", "null", "-"],
                       capture_output=True, text=True)
    times = re.findall(r"time=(\d+):(\d+):(\d+\.\d+)", r.stderr)
    if not times:
        return _duration(path)
    hh, mm, ss = times[-1]
    return int(hh) * 3600 + int(mm) * 60 + float(ss)


def _music_credit(track: Path | None = None) -> str:
    """Crédito de la música: el de la pista (music/<stem>.credit.txt) si existe,
    si no el global music/CREDITS.txt (pista original del canal 1)."""
    if track is not None:
        per_track = MUSIC_DIR / f"{Path(track).stem}.credit.txt"
        if per_track.exists():
            return per_track.read_text(encoding="utf-8").strip()
    f = MUSIC_DIR / "CREDITS.txt"
    return f.read_text(encoding="utf-8").strip() if f.exists() else ""


def _ken_burns(img: Path, dur: float, out: Path, w: int, h: int) -> Path:
    """Imagen fija -> clip vertical con zoom lento (Ken Burns), oscurecido."""
    bw, bh = w * 3 // 2, h * 3 // 2   # pre-escala para tener margen de zoom
    vf = (
        f"scale={bw}:{bh}:force_original_aspect_ratio=increase,crop={bw}:{bh},"
        f"zoompan=z='min(zoom+0.0012,1.35)':d=1:x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)':s={w}x{h}:fps=30,"
        f"eq=brightness=-0.10:saturation=1.1,setsar=1"
    )
    # -framerate 30 en la ENTRADA: sin esto la imagen entra a 25 fps y zoompan
    # la retiquetea a 30, acortando el clip (se desincroniza con el audio).
    cmd = ["ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-t", f"{dur:.3f}",
           "-i", str(img), "-vf", vf, "-r", "30", "-c:v", "libx264",
           "-preset", "veryfast", "-pix_fmt", "yuv420p", "-an", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"Ken Burns falló:\n{r.stderr[-1500:]}")
    return out


def _color_segment(dur: float, out: Path, w: int, h: int, color: str = "0x1a1a2e") -> Path:
    """Plano de respaldo (color sólido) si no hay imagen para un dato."""
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-t", f"{dur:.3f}",
           "-i", f"color=c={color}:s={w}x{h}:r=30", "-c:v", "libx264",
           "-preset", "veryfast", "-pix_fmt", "yuv420p", str(out)]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return out


def generate_multidato(
    items: list[dict],
    title: str,
    channel_name: str = "faceless",
    music: str | Path | None = None,
    hashtags: list[str] | None = None,
    verbose: bool = True,
) -> Path:
    """items: [{'text': frase, 'img': término_de_búsqueda}]. Devuelve el mp4."""
    channel = cfg.load_channel(channel_name)
    w, h = int(channel["target_width"]), int(channel["target_height"])
    voice = channel.get("tts_voice", "es-MX-DaliaNeural")
    rate = channel.get("tts_rate", "+8%")

    slug = _slug(title)
    out_dir = OUTPUT_DIR / channel_name
    work_dir = out_dir / ".work" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    audio_list, video_list = [], []
    for i, item in enumerate(items):
        if verbose:
            print(f"[multidato] Dato {i+1}/{len(items)}: '{item['img']}'")
        # Voz del dato (duración EXACTA por decodificación)
        seg_audio = work_dir / f"a_{i:02d}.mp3"
        synthesize(item["text"], seg_audio, voice=voice, rate=rate)
        dur = _audio_dur(seg_audio)
        audio_list.append(seg_audio)
        # El último plano se extiende un poco para que el fondo nunca se corte
        vid_dur = dur + (0.6 if i == len(items) - 1 else 0.0)
        # Imagen -> Ken Burns (o respaldo)
        seg_video = work_dir / f"v_{i:02d}.mp4"
        img = None
        try:
            res = stock.download_image(item["img"], work_dir / f"img_{i:02d}.jpg")
            img = res[0] if res else None
        except Exception as e:
            print(f"  ⚠️  imagen '{item['img']}': {e}")
        if img and img.exists():
            _ken_burns(img, vid_dur, seg_video, w, h)
        else:
            print(f"  (sin imagen para '{item['img']}', uso plano de color)")
            _color_segment(vid_dur, seg_video, w, h)
        video_list.append(seg_video)

    # Concatenar audios -> narración; videos -> fondo
    a_txt = work_dir / "alist.txt"
    a_txt.write_text("".join(f"file '{p.name}'\n" for p in audio_list), encoding="utf-8")
    narration = work_dir / "narration.m4a"
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", a_txt.name,
                    "-c:a", "aac", "-b:a", "160k", narration.name],
                   cwd=str(work_dir), capture_output=True, text=True, check=True)

    v_txt = work_dir / "vlist.txt"
    v_txt.write_text("".join(f"file '{p.name}'\n" for p in video_list), encoding="utf-8")
    bg_all = work_dir / "bg_all.mp4"
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", v_txt.name,
                    "-c", "copy", bg_all.name],
                   cwd=str(work_dir), capture_output=True, text=True, check=True)

    duration = _duration(narration)

    # Subtítulos karaoke (Whisper sobre la narración)
    lang = voice.split("-")[0] if "-" in voice else channel.get("language")
    if verbose:
        print(f"[multidato] Transcribiendo ({duration:.1f}s)...")
    words = transcribe_words(narration, model_size=channel["whisper_model"], language=lang)
    ass_file = work_dir / "captions.ass"
    build_ass(words, ass_file, caption=channel["caption"], target_width=w, target_height=h,
              offset=0.0, hook_text=title, clip_duration=duration)

    # Componer (fondo con planos cambiantes + música)
    track = _resolve_music(music, 0)
    if verbose:
        print(f"[multidato] Componiendo... (música: {track.name if track else 'no'})")
    out_name = f"{slug}.mp4"
    rendered = _compose(work_dir, narration, ass_file, out_name, duration,
                        ("0x0f2027", "0x203a43", "0x2c5364"), w, h,
                        background=bg_all, music=track)
    final = out_dir / out_name
    import shutil
    shutil.move(str(rendered), str(final))

    # Metadatos (+ crédito de música CC-BY)
    tags = hashtags or ["#shorts", "#curiosidades", "#datoscuriosos", "#sabiasque", "#viral"]
    desc = " ".join(it["text"] for it in items)[:350] + "\n\n" + " ".join(tags)
    credit = _music_credit()
    if credit:
        desc += "\n\n" + credit
    (out_dir / f"{slug}.json").write_text(
        json.dumps({"title": title[:100], "description": desc, "hashtags": tags},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    if verbose:
        print(f"[multidato] ✅ {final}")
    return final
