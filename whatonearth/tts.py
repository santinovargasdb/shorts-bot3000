"""Voces del meme vía TikTok TTS (proxy público gratis, sin login/key)."""
from __future__ import annotations

import base64
from pathlib import Path

import requests

# (url, clave del base64 en la respuesta JSON)
_ENDPOINTS = [
    ("https://tiktok-tts.weilnet.workers.dev/api/generation", "data"),
    ("https://gesserit.co/api/tiktok-tts", "base64"),
]


def synth(text: str, voice: str, out_path) -> None:
    """Genera TTS de TikTok y lo escribe como mp3 en out_path.
    Prueba los endpoints en orden; RuntimeError si todos fallan."""
    for url, key in _ENDPOINTS:
        try:
            r = requests.post(url, json={"text": text, "voice": voice},
                              timeout=30, headers={"Content-Type": "application/json"})
            if r.status_code != 200:
                continue
            b64 = r.json().get(key)
            if not b64:
                continue
            Path(out_path).write_bytes(base64.b64decode(b64))
            return
        except Exception:
            continue
    raise RuntimeError(f"TikTok TTS falló para: {text!r}")
