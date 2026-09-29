"""Orquestador: un video fuente + un canal -> varios Shorts listos para subir.

Pasos:
  1) Detecta momentos destacados por energía de audio (gratis).
  2) Transcribe el video una sola vez (faster-whisper, local).
  3) Por cada clip: subtítulos karaoke + render vertical 9:16.
  4) Escribe metadatos (título/descr/hashtags borrador) junto a cada short.
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from . import config as cfg
from .edit import render_short
from .highlights import Clip, find_highlights
from .subtitles import build_ass
from .transcribe import Word, transcribe_words

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"


def _words_in(words: list[Word], start: float, end: float) -> list[Word]:
    return [w for w in words if w.start >= start - 0.3 and w.start < end]


def _draft_metadata(channel: dict, clip_words: list[Word], idx: int) -> dict:
    """Título/descr/hashtags borrador a partir del transcript (sin API)."""
    transcript = " ".join(w.text for w in clip_words).strip()
    words_only = transcript.split()
    title = " ".join(words_only[:8]) if words_only else channel["display_name"]
    title = title[:90] + (" 🔥" if len(title) < 88 else "")
    tags = ["#shorts", "#viral", "#fyp"]
    if channel["_name"] == "streamers":
        tags += ["#clips", "#twitch", "#gaming"]
    elif channel["_name"] == "peliculas_series":
        tags += ["#pelicula", "#serie", "#escena"]
    else:
        tags += ["#curiosidades", "#datos", "#sabiasque"]
    return {
        "title": title,
        "description": (transcript[:400] + "\n\n" + " ".join(tags)).strip(),
        "hashtags": tags,
        "clip_index": idx,
    }


def process_source(
    source: Path | str,
    channel_name: str,
    verbose: bool = True,
    overrides: dict | None = None,
) -> list[Path]:
    """Genera todos los shorts de un video fuente para un canal. Devuelve rutas.

    `overrides` pisa claves de la config del canal (ej. {'whisper_model': 'tiny'})."""
    source = Path(source).resolve()
    channel = cfg.load_channel(channel_name)
    if overrides:
        channel.update(overrides)
    if verbose:
        print(f"[{channel_name}] Fuente: {source.name}")
        if channel.get("legal_note"):
            print(f"[{channel_name}] ⚠️  {channel['legal_note']}")

    out_dir = OUTPUT_DIR / channel_name
    work_dir = out_dir / ".work" / source.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)

    # 1) Momentos destacados
    clips: list[Clip] = find_highlights(
        source,
        n_clips=int(channel["clips_per_source"]),
        min_len=float(channel["short_min_seconds"]),
        max_len=float(channel["short_max_seconds"]),
    )
    if verbose:
        print(f"[{channel_name}] {len(clips)} momento(s) detectado(s).")

    # 2) Transcripción (una vez para todo el video)
    if verbose:
        print(f"[{channel_name}] Transcribiendo (Whisper '{channel['whisper_model']}')...")
    words = transcribe_words(
        source,
        model_size=channel["whisper_model"],
        language=channel.get("language"),
    )

    # 3) Render por clip
    outputs: list[Path] = []
    for i, clip in enumerate(clips, 1):
        clip_words = _words_in(words, clip.start, clip.end)
        ass_path = work_dir / f"clip{i:02d}.ass"
        build_ass(
            clip_words,
            ass_path,
            caption=channel["caption"],
            target_width=int(channel["target_width"]),
            target_height=int(channel["target_height"]),
            offset=clip.start,
            hook_text=channel.get("hook_text", "") or "",
            clip_duration=clip.duration,
        )
        tmp_out = f"{source.stem}_clip{i:02d}.mp4"
        if verbose:
            print(f"[{channel_name}] Render {i}/{len(clips)}  ({clip.start:.0f}s → {clip.end:.0f}s)...")
        rendered = render_short(
            source=source,
            start=clip.start,
            duration=clip.duration,
            ass_file=ass_path,
            out_file=Path(tmp_out),
            crop_mode=channel["crop_mode"],
            width=int(channel["target_width"]),
            height=int(channel["target_height"]),
        )
        final = out_dir / tmp_out
        shutil.move(str(rendered), str(final))
        outputs.append(final)

        # 4) Metadatos borrador
        meta = _draft_metadata(channel, clip_words, i)
        (out_dir / f"{source.stem}_clip{i:02d}.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    if verbose:
        print(f"[{channel_name}] ✅ {len(outputs)} short(s) en {out_dir}")
    return outputs
