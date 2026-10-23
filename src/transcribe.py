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


def align_script_to_words(script_text: str, asr_words: list[Word]) -> list[Word]:
    """Alinea el TEXTO CANÓNICO del guion a los tiempos de la transcripción.

    El karaoke necesita tiempos por palabra, pero las PALABRAS deben salir del
    guion que ya conocemos, no de re-transcribir el audio (que metía errores:
    "HAY UN ESTRELLA", "FEL" por "Torre Eiffel"). Esta función conserva el timing
    de Whisper y reemplaza los tokens por los del guion:

    - Si el conteo de palabras coincide, mapeo 1:1 (mejor timing posible).
    - Si difiere (Whisper juntó o partió palabras), reparte las palabras del
      guion proporcionalmente sobre el span temporal total [t0, tN], de forma
      monótona (los tiempos nunca retroceden).

    `script_text` vacío -> devuelve el ASR tal cual (nada que alinear).
    `asr_words` vacío   -> devuelve [] (no hay tiempos a los que anclar)."""
    tokens = script_text.split()
    if not tokens:
        return asr_words
    if not asr_words:
        return []

    # Conteo exacto: 1:1, conservando cada par de tiempos del ASR.
    if len(tokens) == len(asr_words):
        return [Word(start=a.start, end=a.end, text=tok)
                for tok, a in zip(tokens, asr_words)]

    # Conteos distintos: reparto proporcional sobre el span total del ASR.
    t0 = asr_words[0].start
    tN = asr_words[-1].end
    span = tN - t0
    n = len(tokens)
    if span <= 0:                      # todos los tiempos colapsados: reparte igual
        return [Word(start=t0, end=tN, text=tok) for tok in tokens]
    step = span / n
    out: list[Word] = []
    for i, tok in enumerate(tokens):
        start = t0 + i * step
        end = t0 + (i + 1) * step if i < n - 1 else tN
        out.append(Word(start=start, end=end, text=tok))
    return out


def align_segments_to_words(
    segments: list[tuple[str, float, float]],
    asr_words: list[Word],
) -> list[Word]:
    """Alinea el guion canónico a los tiempos del ASR, SEGMENTO por SEGMENTO.

    `segments`: lista de (texto, start, end) por dato, en orden (los mismos
    límites que el render usa como `boundaries`). Para cada segmento toma las
    palabras transcritas que caen en su ventana [start, end) y les superpone el
    texto del guion con `align_script_to_words`. Si el ASR no detectó palabras en
    esa ventana (silencio/VAD), reparte el texto del guion sobre la ventana
    declarada. Así cada dato queda con SU texto correcto, sin que un error de
    transcripción de un dato contamine a otro."""
    out: list[Word] = []
    for text, start, end in segments:
        span = [w for w in asr_words if start - 1e-6 <= w.start < end - 1e-6]
        if span:
            out.extend(align_script_to_words(text, span))
        else:
            # Sin anclas del ASR: repartir el guion sobre la ventana declarada.
            out.extend(align_script_to_words(text, [Word(start=start, end=end, text="")]))
    return out


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python -m src.transcribe <audio_o_video>")
        raise SystemExit(1)
    for w in transcribe_words(sys.argv[1])[:40]:
        print(f"[{w.start:6.2f}-{w.end:6.2f}] {w.text}")
