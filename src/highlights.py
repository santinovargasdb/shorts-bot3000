"""Detección de momentos destacados por ENERGÍA DE AUDIO (gratis, sin IA/API).

Idea: los momentos virales de streamers suelen coincidir con picos de audio
(risas, gritos, reacciones, música que sube). Extraemos el audio como PCM,
calculamos la energía RMS por ventana y elegimos los tramos más intensos.

Para contenido faceless/guionado esto no aplica: ahí se usan clips fijos.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path

import numpy as np

SAMPLE_RATE = 16000  # Hz, mono


@dataclass
class Clip:
    start: float          # segundos
    end: float            # segundos
    score: float          # energía media del tramo (para ranking)

    @property
    def duration(self) -> float:
        return self.end - self.start


def _load_audio_rms(video: Path, window: float = 1.0) -> tuple[np.ndarray, float]:
    """Devuelve (energia_por_ventana, segundos_por_ventana).

    Extrae audio mono 16 kHz con ffmpeg y calcula el RMS por ventana.
    """
    cmd = [
        "ffmpeg", "-i", str(video),
        "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE),
        "-f", "s16le", "-acodec", "pcm_s16le", "-",
    ]
    proc = subprocess.run(cmd, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg no pudo extraer audio:\n{proc.stderr.decode(errors='ignore')[-1500:]}")

    audio = np.frombuffer(proc.stdout, dtype=np.int16).astype(np.float32) / 32768.0
    if audio.size == 0:
        raise RuntimeError("El video no tiene audio utilizable.")

    samples_per_window = int(SAMPLE_RATE * window)
    n_windows = audio.size // samples_per_window
    if n_windows == 0:
        return np.array([np.sqrt(np.mean(audio**2))]), audio.size / SAMPLE_RATE
    trimmed = audio[: n_windows * samples_per_window].reshape(n_windows, samples_per_window)
    rms = np.sqrt(np.mean(trimmed**2, axis=1))
    return rms, window


def find_highlights(
    video: Path | str,
    n_clips: int = 3,
    min_len: float = 15.0,
    max_len: float = 58.0,
    window: float = 1.0,
) -> list[Clip]:
    """Devuelve hasta n_clips tramos candidatos, ordenados por intensidad.

    Estrategia: puntúa cada posible ventana de arranque por la energía media
    del tramo [t, t+max_len] y elige picos separados (sin solaparse).
    """
    video = Path(video)
    rms, win = _load_audio_rms(video, window=window)
    total_sec = len(rms) * win

    if total_sec <= max_len:
        # Video corto: un solo clip con todo (recortado a max_len)
        return [Clip(0.0, min(total_sec, max_len), float(np.mean(rms)))]

    clip_windows = int(round(max_len / win))
    # energía media de cada tramo posible [i, i+clip_windows]
    kernel = np.ones(clip_windows) / clip_windows
    if clip_windows > len(rms):
        clip_windows = len(rms)
    scores = np.convolve(rms, kernel, mode="valid")  # una entrada por posición de arranque

    chosen: list[Clip] = []
    order = np.argsort(scores)[::-1]  # posiciones de mayor a menor energía
    used = np.zeros(len(scores), dtype=bool)
    min_gap = int(round(min_len / win))  # separación mínima entre arranques

    for idx in order:
        if used[idx]:
            continue
        start = idx * win
        end = min(start + max_len, total_sec)
        if end - start < min_len:
            continue
        chosen.append(Clip(float(start), float(end), float(scores[idx])))
        lo = max(0, idx - clip_windows)
        hi = min(len(used), idx + max(clip_windows, min_gap))
        used[lo:hi] = True  # bloquear tramos solapados
        if len(chosen) >= n_clips:
            break

    chosen.sort(key=lambda c: c.start)  # orden cronológico para nombrar salidas
    return chosen


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python -m src.highlights <video>")
        raise SystemExit(1)
    for i, c in enumerate(find_highlights(sys.argv[1]), 1):
        print(f"Clip {i}: {c.start:.1f}s -> {c.end:.1f}s  (energía {c.score:.4f})")
