"""Busca el mejor clip LEGAL por tema: Pixabay -> Pexels -> Wikimedia.
Rankea por relevancia (tags) + resolución; solo relevantes HD. (Pexels/Wikimedia
se agregan en Task 5; acá quedan como stubs para que find_clip ya los ordene.)"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

from reddit_pipeline.env import load_env

_UA = {"User-Agent": "Mozilla/5.0 (whatonearth bot)"}


def _terms(query: str) -> set:
    return {t for t in query.lower().replace("-", " ").split() if len(t) > 2}


def rank(cands: list, query: str):
    """Mejor candidato relevante (tag match>0) y HD (>=1080), o None."""
    terms = _terms(query)

    def score(c):
        tags = set(str(c.get("tags", "")).lower().replace(",", " ").split())
        tag_hit = len(terms & tags)
        dur_ok = 1 if 3 <= c.get("duration", 0) <= 40 else 0
        return (tag_hit, dur_ok, c.get("height", 0), c.get("downloads", 0))

    viables = [c for c in cands
               if c.get("height", 0) >= 1080 and (_terms(query) & set(
                   str(c.get("tags", "")).lower().replace(",", " ").split()))]
    if not viables:
        return None
    return max(viables, key=score)


def search_pixabay(query: str) -> list:
    load_env()
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        return []
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(
        {"key": key, "q": query, "per_page": 60, "safesearch": "true", "order": "popular"})
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=_UA), timeout=30))
    except Exception:
        return []
    out = []
    for h in d.get("hits", []):
        vids = h.get("videos", {})
        streams = [v for k in ("large", "medium", "small") for v in [vids.get(k)]
                   if v and v.get("url")]
        pick = next((v for v in sorted(streams, key=lambda v: v.get("height", 0))
                     if v.get("height", 0) >= 1080), None)
        if not pick:
            continue
        out.append({"url": pick["url"], "height": pick.get("height", 0),
                    "width": pick.get("width", 0), "duration": h.get("duration", 0),
                    "tags": h.get("tags", ""), "downloads": h.get("downloads", 0),
                    "author": h.get("user", ""), "source_url": h.get("pageURL", ""),
                    "source": "pixabay", "license": "Pixabay Content License"})
    return out


def search_pexels(query: str) -> list:   # implementado en Task 5
    return []


def search_wikimedia(query: str) -> list:   # implementado en Task 5
    return []


def _download(url: str, out: Path) -> None:
    out.write_bytes(urllib.request.urlopen(
        urllib.request.Request(url, headers=_UA), timeout=180).read())


def find_clip(query: str, workdir):
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    for search in (search_pixabay, search_pexels, search_wikimedia):
        best = rank(search(query), query)
        if not best:
            continue
        safe = "".join(ch for ch in query if ch.isalnum() or ch == " ").strip().replace(" ", "_")
        out = workdir / f"{best['source']}_{safe}.mp4"
        try:
            _download(best["url"], out)
        except Exception:
            continue
        return {"local_path": out, "source": best["source"], "author": best.get("author", ""),
                "license": best.get("license", ""), "source_url": best.get("source_url", "")}
    return None
