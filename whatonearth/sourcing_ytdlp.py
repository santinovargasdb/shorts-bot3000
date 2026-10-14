"""Sourcing de clips vía yt-dlp: baja footage REAL del ítem (no stock genérico).

Se usa en whatonearth cuando priorizamos CALIDAD sobre legalidad (canal descartable,
aislado del resto del proyecto). Devuelve el MISMO ClipResult que
`whatonearth/sourcing.find_clip` -> encastra en `build.collect_items` vía `_find`.

Riesgo de copyright asumido: SOLO TikTok/IG, cuentas/apps propias de whatonearth.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

SEARCH_N = 12
SEG_LEN = 8             # segundos a bajar (corto = menos chance de un corte interno)
TRY_TOP = 6             # cuántos candidatos probar a descargar antes de rendirse
MIN_DIM = 640          # dimensión mínima (ancho Y alto) aceptable al escalar a 1080
_YTDLP = ["yt-dlp", "--no-warnings"]

# Títulos de videos EDITADOS o TALKING-HEAD (cortes, alguien hablando, subtítulos
# quemados) -> los bajamos de ranking: queremos footage crudo del ítem, no un explainer.
_JUNK = ("top 10", "top 5", "top10", "compilation", "best of", "tier list",
         "ranking", "reaction", "documentary", "full episode", "every ",
         "you won't believe", " vs ", "explained", "facts about", "facts you",
         "interesting facts", "guide", "interview", "podcast", "news", "vlog",
         "review", "tutorial", "did you know", "story time", "explain")

# Títulos que SUELEN ser footage limpio del ítem -> suben de ranking.
_FOOTAGE = ("drone", "aerial", "4k", "footage", "nature", "scenery", "relaxing",
            "cinematic", "close up", "close-up", "macro", "slow motion", "underwater",
            "wildlife", "walking", "ambience", "scenic", "no music", "no commentary")


def _run(cmd, timeout):
    return subprocess.run(cmd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)


def _terms(text: str) -> set:
    return {t for t in re.sub(r"[^a-z0-9 ]", " ", text.lower()).split() if len(t) > 2}


def search(query: str, n: int = SEARCH_N) -> list:
    """Candidatos {id,title,duration,url,uploader} vía yt-dlp (flat = rápido)."""
    try:
        r = _run([*_YTDLP, f"ytsearch{n}:{query}", "--flat-playlist", "--dump-json"], 90)
    except Exception:
        return []
    cands = []
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        vid = d.get("id")
        if not vid:
            continue
        cands.append({
            "id": vid,
            "title": d.get("title") or "",
            "duration": d.get("duration") or 0,
            "url": d.get("url") or d.get("webpage_url") or f"https://www.youtube.com/watch?v={vid}",
            "uploader": d.get("uploader") or d.get("channel") or "",
        })
    return cands


def ranked(cands: list, query: str) -> list:
    """Candidatos ordenados mejor->peor: relevancia de título + duración manejable."""
    terms = _terms(query)

    def rel(c):
        return len(terms & _terms(c["title"]))

    def score(c):
        dur = c.get("duration") or 0
        if 8 <= dur <= 60:        # clip corto = más probable una sola toma
            dur_ok = 3
        elif 60 < dur <= 180:
            dur_ok = 2
        elif 180 < dur <= 1200:
            dur_ok = 1
        else:
            dur_ok = 0
        title = c["title"].lower()
        not_junk = 0 if any(j in title for j in _JUNK) else 1
        footage = 1 if any(fw in title for fw in _FOOTAGE) else 0
        return (rel(c), not_junk, footage, dur_ok, -dur)   # a igualdad, el más corto

    viable = [c for c in cands if rel(c) >= 1] or cands
    return sorted(viable, key=score, reverse=True)


def rank(cands: list, query: str):
    """Mejor candidato, o None."""
    r = ranked(cands, query)
    return r[0] if r else None


def _section(duration) -> tuple[int, int] | None:
    """(start, end) a bajar: saltea intro y toma ~SEG_LEN s. None = bajar entero."""
    if not duration or duration <= SEG_LEN + 4:
        return None
    start = int(min(max(duration * 0.15, 5), duration - SEG_LEN - 1))
    return start, start + SEG_LEN


def _probe_dims(path: Path) -> tuple[int, int]:
    try:
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height", "-of", "csv=s=x:p=0", str(path)],
            capture_output=True, text=True, timeout=30)
        w, h = (r.stdout or "").strip().split("x")
        return int(w), int(h)
    except Exception:
        return 0, 0


def _download(cand: dict, out: Path) -> tuple[int, int] | None:
    """Baja el clip y devuelve (ancho, alto), o None si falla o es de baja calidad."""
    for f in out.parent.glob(out.stem + ".*"):   # limpiar intentos previos
        f.unlink(missing_ok=True)
    # Orden de formatos: mejor resolución (<=1080) -> más fps -> más bitrate.
    cmd = [*_YTDLP, cand["url"], "-S", "res:1080,fps,vbr,ext:mp4:m4a",
           "--merge-output-format", "mp4", "--recode-video", "mp4",
           "--force-keyframes-at-cuts", "-o", str(out)]
    sec = _section(cand.get("duration"))
    if sec:
        cmd += ["--download-sections", f"*{sec[0]}-{sec[1]}"]
    try:
        _run(cmd, 300)
    except Exception:
        return None
    if not (out.exists() and out.stat().st_size > 10_000):
        return None
    w, h = _probe_dims(out)
    if min(w, h) < MIN_DIM:               # clip feo/pixelado -> descartar, probar el siguiente
        out.unlink(missing_ok=True)
        return None
    return w, h


def _result(out: Path, cand: dict) -> dict:
    return {"local_path": out, "source": "youtube", "author": cand.get("uploader", ""),
            "license": "ripped (TT/IG only)", "source_url": cand["url"]}


def find_clip(query: str, workdir) -> dict | None:
    """Prefiere footage VERTICAL (llena el 9:16 sin zoom ni márgenes). Si no aparece
    ninguno, cae al mejor horizontal (que igual se recorta a 9:16)."""
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-z0-9]+", "_", query.lower()).strip("_")[:40] or "clip"
    out = workdir / f"yt_{safe}.mp4"
    # Pool de candidatos: query normal + variante "shorts" (sesga a vertical).
    seen, pool = set(), []
    for q in (query, f"{query} shorts"):
        for c in search(q):
            if c["id"] not in seen:
                seen.add(c["id"])
                pool.append(c)
    fallback = None   # (cand, path) mejor horizontal, por si no aparece ninguno vertical
    for cand in ranked(pool, query)[:TRY_TOP]:
        dims = _download(cand, out)
        if not dims:
            continue
        w, h = dims
        if h >= w:                         # VERTICAL (o cuadrado): llena el 9:16, ideal
            return _result(out, cand)
        if fallback is None:               # horizontal: guardá de respaldo y seguí buscando
            keep = workdir / f"yt_{safe}__fb.mp4"
            out.replace(keep)
            fallback = (cand, keep)
    if fallback:
        fallback[1].replace(out)
        return _result(out, fallback[0])
    return None
