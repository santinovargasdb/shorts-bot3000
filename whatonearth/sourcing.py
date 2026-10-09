"""Busca el mejor clip LEGAL por tema: Pixabay -> Pexels -> Wikimedia.
Rankea por relevancia (tags) + resolución; solo relevantes HD. (Pexels/Wikimedia
se agregan en Task 5; acá quedan como stubs para que find_clip ya los ordene.)"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

import requests

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


def search_pexels(query: str) -> list:
    load_env()
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        return []
    try:
        r = requests.get("https://api.pexels.com/videos/search",
                         headers={"Authorization": key},
                         params={"query": query, "per_page": 30, "size": "medium"}, timeout=30)
        if r.status_code != 200:
            return []
        data = r.json()
    except Exception:
        return []
    out = []
    for v in data.get("videos", []):
        files = [f for f in v.get("video_files", []) if f.get("link")]
        pick = next((f for f in sorted(files, key=lambda f: f.get("height", 0))
                     if f.get("height", 0) >= 1080), None)  # elige el stream más chico >=1080 (eficiencia de banda; 1080 alcanza para 1080w)
        if not pick:
            continue
        out.append({"url": pick["link"], "height": pick.get("height", 0),
                    "width": pick.get("width", 0), "duration": v.get("duration", 0),
                    "tags": " ".join(v.get("tags", [])) or query,
                    "downloads": 0, "author": v.get("user", {}).get("name", ""),
                    "source_url": v.get("url", ""), "source": "pexels",
                    "license": "Pexels License"})
    return out


def search_wikimedia(query: str) -> list:
    try:
        r = requests.get("https://commons.wikimedia.org/w/api.php", headers=_UA, params={
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"filetype:video {query}", "gsrlimit": 20, "gsrnamespace": 6,
            "prop": "imageinfo", "iiprop": "url|size|extmetadata",
        }, timeout=30)
        if r.status_code != 200:
            return []
        pages = r.json().get("query", {}).get("pages", {})
    except Exception:
        return []
    out = []
    for p in pages.values():
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "")
        if not info.get("url") or info.get("height", 0) < 1080 or not lic:
            continue
        out.append({"url": info["url"], "height": info.get("height", 0),
                    "width": info.get("width", 0), "duration": 10,  # la API de Commons no expone duration; placeholder (rank solo lo usa como gate 3-40s)
                    "tags": p.get("title", "").replace("File:", "").replace("_", " ") + " " + query,
                    "downloads": 0, "author": meta.get("Artist", {}).get("value", "")[:80],
                    "source_url": info.get("descriptionurl", ""), "source": "wikimedia",
                    "license": lic})
    return out


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
