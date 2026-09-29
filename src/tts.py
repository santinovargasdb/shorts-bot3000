"""Voz por IA con edge-tts (gratis, voces neuronales de Microsoft, sin API key).

Ventaja clave: edge-tts entrega los tiempos por PALABRA (WordBoundary), así que
generamos subtítulos karaoke exactos sin necesidad de Whisper.

Requiere internet (usa el endpoint gratuito de Microsoft).
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import edge_tts

from .transcribe import Word


async def _synth(text: str, voice: str, rate: str, out_mp3: Path) -> list[Word]:
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    words: list[Word] = []
    with open(out_mp3, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7      # ticks de 100ns -> segundos
                dur = chunk["duration"] / 1e7
                words.append(Word(start=start, end=start + dur, text=chunk["text"]))
    return words


def synthesize(
    text: str,
    out_mp3: Path | str,
    voice: str = "es-MX-DaliaNeural",
    rate: str = "+8%",
) -> list[Word]:
    """Genera la narración (mp3) y devuelve las palabras con sus tiempos."""
    out_mp3 = Path(out_mp3)
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    return asyncio.run(_synth(text, voice, rate, out_mp3))


async def _list_es_voices() -> list[str]:
    voices = await edge_tts.list_voices()
    return sorted(v["ShortName"] for v in voices if v["ShortName"].startswith("es-"))


if __name__ == "__main__":
    # Lista las voces en español disponibles
    for v in asyncio.run(_list_es_voices()):
        print(v)
