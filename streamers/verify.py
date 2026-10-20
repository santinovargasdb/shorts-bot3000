"""QC AUTOMÁTICO con visión (Gemini): para que el canal sea plug-and-forget SIN revisión manual.

Dos chequeos:
- verify_source(): sobre el clip CRUDO recién bajado, ANTES de renderizar. Descarta duds
  (NSFW, subtítulos quemados = clip ya editado, grilla multi-cam, chat) sin gastar el render.
- verify_clip(): sobre NUESTRO short ya renderizado, chequeo final (layout, subs limpios).

Requiere GEMINI_API_KEY en .env (gratis). Sin key -> ok=None y el que llama hace fallback
(deja PENDING para revisión manual). Groq no tiene modelo de visión."""
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

MODEL = os.environ.get("GEMINI_VISION_MODEL", "gemini-3.5-flash")
_FALLBACKS = ("gemini-3.5-flash-lite", "gemini-3.6-flash")   # si el principal da 503/overload
_URL = "https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={k}"

# Lo prende _gemini cuando agota los reintentos por 429 (cuota/rate de Gemini). El auto-refill
# lo chequea para frenar la tanda (no malgastar renders) y reanudar cuando la cuota vuelva.
QUOTA_HIT = False


def reset_quota() -> None:
    """Resetea el flag de cuota antes de una tanda de QC (lo llama el auto-refill)."""
    global QUOTA_HIT
    QUOTA_HIT = False

# Chequeo del clip CRUDO (horizontal), ANTES de editar. Se arma según require_gameplay.
_SRC_DEALBREAKERS = (
    "Es un clip CRUDO (horizontal) de Twitch de UN streamer, todavía SIN editar. Lo vamos a "
    "re-editar a un short vertical con NUESTROS subtítulos. Decime si NO conviene usarlo: ok=false si:\n"
    "- NSFW (lo más grave, banea la cuenta): desnudez, genitales, sexual, gore/sangre extrema. "
    "Ante la duda, false.\n"
    "- SUBTÍTULOS/TEXTO QUEMADOS: el clip YA trae subtítulos o texto grande encima (ya está "
    "editado) -> si lo re-subtitulamos quedarían DOBLES.\n"
    "- MULTI-STREAMER: mosaico/grilla de varias caras de streamers (watch-party).\n"
    "- CHAT de Twitch o ALERTAS de suscripción ocupando parte importante del cuadro.\n"
    "- Pantalla estática / sin nada pasando / solo un menú o texto.\n")
_SRC_GAMEPLAY = (
    "- NO hay ningún VIDEOJUEGO en pantalla: es solo el streamer hablando/IRL. Este canal es de "
    "GAMEPLAY; el contenido IRL/charla va a OTRA cuenta, así que acá IRL = descartar.\n")
_SRC_IRL = (
    "- Es GAMEPLAY (hay un videojuego en pantalla, el streamer está jugando). Este canal es de "
    "IRL/CHARLA (streamer hablando a cámara); el gameplay va a OTRA cuenta, así que acá gameplay "
    "= descartar.\n")
_SRC_END = ('Si pasa todo, ok=true.\n'
            'Respondé SOLO JSON: {"ok": true/false, "problema": "breve o vacío"}')

# Chequeo de NUESTRO short ya renderizado (vertical, 2 paneles o facecam).
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
    """n frames repartidos en el medio del clip (donde suele estar la acción)."""
    dur = _duration(video)
    tmp = Path(tempfile.mkdtemp(prefix="qc_"))
    out = []
    for i in range(n):
        t = dur * (0.3 + 0.5 * i / max(1, n - 1))      # ~30%..80% del clip
        f = tmp / f"f{i}.jpg"
        subprocess.run(["ffmpeg", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
                        "-vf", "scale=640:-1", str(f)], capture_output=True)
        if f.exists():
            out.append(f)
    return out


def _gemini(prompt: str, frames: list[Path], verbose: bool = True) -> dict | None:
    """POST a Gemini con prompt + frames. Devuelve el dict JSON, o None (sin key / error)."""
    global QUOTA_HIT
    try:
        from reddit_pipeline.env import load_env
        load_env()
    except Exception:
        pass
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        if verbose:
            print("[qc] sin GEMINI_API_KEY")
        return None
    parts = [{"text": prompt}]
    for f in frames:
        parts.append({"inline_data": {"mime_type": "image/jpeg",
                                      "data": base64.b64encode(f.read_bytes()).decode()}})
    body = {"contents": [{"parts": parts}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 400,
                                 "responseMimeType": "application/json"}}
    saw_quota = False
    for m in (MODEL, *[x for x in _FALLBACKS if x != MODEL]):
        for _attempt in range(3):
            try:
                req = urllib.request.Request(
                    _URL.format(m=m, k=key), data=json.dumps(body).encode(),
                    headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=60) as resp:
                    data = json.loads(resp.read())
                return json.loads(data["candidates"][0]["content"]["parts"][0]["text"])
            except urllib.error.HTTPError as e:
                if e.code == 429:                        # cuota/rate de Gemini agotada
                    saw_quota = True
                    time.sleep(3)
                    continue
                if e.code in (503, 500):                 # sobrecargado -> reintentar
                    time.sleep(3)
                    continue
                break                                    # otro error http -> siguiente modelo
            except Exception:
                break
    if saw_quota:                                        # agotó reintentos solo por 429 -> cuota
        QUOTA_HIT = True
        if verbose:
            print("[qc] cuota de Gemini agotada (429) -> se reanuda cuando vuelva")
    return None


def _check(video_path, prompt: str, label: str, verbose: bool) -> dict:
    frames = _frames(video_path)
    if not frames:
        return {"ok": None, "problema": "no pude extraer frames"}
    v = _gemini(prompt, frames, verbose)
    if v is None:
        if verbose:
            print(f"[qc] {label}: no disponible -> fallback")
        return {"ok": None, "problema": "QC no disponible"}
    ok = bool(v.get("ok"))
    if verbose:
        print(f"[qc] {label}: {'OK' if ok else 'RECHAZADO'} {v.get('problema', '')[:55]}")
    return {"ok": ok, "problema": str(v.get("problema", ""))}


def verify_source(video_path, want: str = "gameplay", verbose: bool = True) -> dict:
    """Chequeo del clip CRUDO ANTES de renderizar. ok False -> no vale la pena editarlo.
    want: 'gameplay' (A/B, descarta IRL) | 'irl' (C, descarta gameplay) | 'any' (acepta ambos)."""
    clause = {"gameplay": _SRC_GAMEPLAY, "irl": _SRC_IRL}.get(want, "")
    prompt = _SRC_DEALBREAKERS + clause + _SRC_END
    return _check(video_path, prompt, "fuente", verbose)


def verify_clip(video_path, verbose: bool = True) -> dict:
    """Chequeo de NUESTRO short ya renderizado. ok True -> approved, False -> rejected."""
    return _check(video_path, _PROMPT, "final", verbose)


_GAMEPLAY_PROMPT = (
    "Mirá estos frames de un clip de un streamer. ¿Hay un VIDEOJUEGO en pantalla (el streamer "
    "está jugando, se ve gameplay), o es SOLO el streamer hablando/IRL sin juego?\n"
    'Respondé SOLO JSON: {"gameplay": true/false}')


def classify_gameplay(video_path, verbose: bool = True) -> bool | None:
    """True si hay gameplay en pantalla, False si es solo cara/charla, None si el QC no está."""
    frames = _frames(video_path)
    if not frames:
        return None
    v = _gemini(_GAMEPLAY_PROMPT, frames, verbose)
    if v is None:
        return None
    return bool(v.get("gameplay"))
