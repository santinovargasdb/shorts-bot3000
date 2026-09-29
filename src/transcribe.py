"""Transcripción con faster-whisper (local, gratis) -> palabras con tiempos.

Devuelve marcas de tiempo por PALABRA, necesarias para los subtítulos
estilo karaoke (resaltar la palabra que se está diciendo) que rinden en Shorts.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import numpy as np

_SR = 16000  # faster-whisper espera 16 kHz mono


@dataclass
class Word:
    start: float   # segundos, relativos al inicio del audio dado
    end: float
    text: str


def _decode_audio(path: Path | str) -> np.ndarray:
    """Decodifica a float32 mono 16 kHz con ffmpeg (evita depender de PyAV)."""
    cmd = [
        "ffmpeg", "-i", str(path),
        "-vn", "-ac", "1", "-ar", str(_SR),
        "-f", "s16le", "-acodec", "pcm_s16le", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"ffmpeg no pudo decodificar audio:\n{proc.stderr.decode(errors='ignore')[-1500:]}"
        )
    return np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0


@lru_cache(maxsize=2)
def _get_model(model_size: str):
    """Carga (y cachea) el modelo Whisper. Descarga automática la 1ª vez."""
    from faster_whisper import WhisperModel

    # int8 en CPU: rápido y ligero, ideal para máquinas sin GPU.
    return WhisperModel(model_size, device="cpu", compute_type="int8")


def transcribe_words(
    audio_or_video: Path | str,
    model_size: str = "small",
    language: str | None = None,
) -> list[Word]:
    """Transcribe y devuelve una lista plana de palabras con tiempos."""
    model = _get_model(model_size)
    audio = _decode_audio(audio_or_video)
    segments, _info = model.transcribe(
        audio,
        language=language,
        word_timestamps=True,
        vad_filter=True,   # ignora silencios largos
    )

    words: list[Word] = []
    for seg in segments:
        for w in (seg.words or []):
            text = w.word.strip()
            if text:
                words.append(Word(start=w.start, end=w.end, text=text))
    return words


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python -m src.transcribe <audio_o_video>")
        raise SystemExit(1)
    for w in transcribe_words(sys.argv[1])[:40]:
        print(f"[{w.start:6.2f}-{w.end:6.2f}] {w.text}")
