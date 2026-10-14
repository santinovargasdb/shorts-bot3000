"""QC AUTOMÁTICO con visión (Gemini): mira frames del clip YA RENDERIZADO y decide
aprobar/rechazar, para que el canal sea plug-and-forget SIN revisión manual del usuario.

Caza los duds que vimos: subtítulos DOBLES (el clip de origen ya traía subs quemados),
grilla multi-cámara / watch-party, chat/alertas de Twitch encima, borroso, cara mal encuadrada.

Requiere GEMINI_API_KEY en .env (gratis, aistudio.google.com). Sin key -> devuelve ok=None
y el clip queda PENDING (fallback a revisión manual). Groq no tiene modelo de visión."""
from __future__ import annotations

import base64
import json
import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

_FALLBACKS = ("gemini-3.5-flash-lite", "gemini-3.6-flash")   # si el principal da 503/overload

MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-3.5-flash")
_URL = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={k}"

_PROMPT = (
    "Sos control de calidad de un canal de TikTok de clips de UN streamer. El video YA fue "
    "editado por NOSOTROS con este formato VÁLIDO (NO es un error): arriba la cara del streamer, "
    "en el medio el gameplay (o solo la cara grande si es charla/IRL), y abajo una banda negra "
    "con NUESTROS subtítulos (Montserrat blanca con una palabra en ROJO, en itálica). Una facecam "
    "chica en una esquina del gameplay es NORMAL.\n"
    "Marcá ok=false si ves CUALQUIERA de estos problemas:\n"
    "- CONTENIDO NSFW (lo más grave, banea la cuenta): desnudez, genitales, contenido sexual, "
    "gore/sangre extrema, o cualquier cosa que viole las políticas de TikTok/IG. Ante la duda, false.\n"
    "- SUBTÍTULOS DOBLES: además de los nuestros (abajo), hay OTROS subtítulos quemados del clip "
    "original (otra tipografía/posición, ej. a mitad de pantalla).\n"
    "- WATCH-PARTY: el panel del gameplay es un MOSAICO de MUCHAS caras de streamers distintos "
    "(no un juego).\n"
    "- CHAT de Twitch o ALERTAS de suscripción visibles dentro del cuadro.\n"
    "- Imagen MUY borrosa/pixelada, o la cara del streamer cortada/ausente.\n"
    "Si está limpio (nuestro formato, sin esos problemas), ok=true.\n"
    'Respondé SOLO JSON: {"ok": true/false, "problema": "breve o vacío"}'
)


def _duration(video) -> float:
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
            capture_output=True, text=True, timeout=30)
        return float((r.stdout or "").strip())
    except Exception:
        return 12.0


def _frames(video, n: int = 3) -> list[Path]:
    """n frames repartidos en el medio del clip (donde el subtítulo está activo)."""
    dur = _duration(video)
    tmp = Path(tempfile.mkdtemp(prefix="qc_"))
    out = []
    for i in range(n):
        t = dur * (0.3 + 0.5 * i / max(1, n - 1))      # ~30%..80% del clip
        f = tmp / f"f{i}.jpg"
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", "scale=540:-1", str(f)], capture_output=True)
        if f.exists():
            out.append(f)
    return out


def verify_clip(video_path, verbose: bool = True) -> dict:
    """Devuelve {'ok': True|False|None, 'problema': str}. None = no se pudo verificar
    (sin key o error) -> el que llama lo deja PENDING para revisión manual."""
    try:
        from reddit_pipeline.env import load_env
        load_env()
    except Exception:
        pass
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        if verbose:
            print("[qc] sin GEMINI_API_KEY -> PENDING (revisión manual)")
        return {"ok": None, "problema": "sin GEMINI_API_KEY"}

    frames = _frames(video_path)
    if not frames:
        return {"ok": None, "problema": "no pude extraer frames"}

    parts = [{"text": _PROMPT}]
    for f in frames:
        parts.append({"inline_data": {"mime_type": "image/jpeg",
                                      "data": base64.b64encode(f.read_bytes()).decode()}})
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 400,
                                 "responseMimeType": "application/json"}}
    for m in (MODEL, *[x for x in _FALLBACKS if x != MODEL]):
        for _attempt in range(3):
            try:
                req = urllib.request.Request(
                    _URL.format(m=m, k=key), data=json.dumps(body).encode(),
                    headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read())
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                v = json.loads(text)
                ok = bool(v.get("ok"))
                if verbose:
                    print(f"[qc] {'APROBADO' if ok else 'RECHAZADO'} ({m}): {v.get('problema', '')[:60]}")
                return {"ok": ok, "problema": str(v.get("problema", ""))}
            except urllib.error.HTTPError as e:
                if e.code in (503, 429, 500):           # sobrecargado -> reintentar
                    time.sleep(3)
                    continue
                break                                    # otro error http -> siguiente modelo
            except Exception:
                break
    if verbose:
        print("[qc] QC no disponible (reintentos agotados) -> PENDING")
    return {"ok": None, "problema": "QC no disponible (reintentos)"}
