"""Descarga footage royalty-free para los fondos del canal faceless.

Soporta dos proveedores gratis (uso comercial, sin atribución):
  - Pixabay  -> https://pixabay.com/api/docs/  (key inmediata)
  - Pexels   -> https://www.pexels.com/api/     (a veces pausa keys nuevas)

Poné la key en .env:
  PIXABAY_API_KEY=xxxx     (recomendado)
  PEXELS_API_KEY=xxxx      (alternativa)

Uso:
  python -m src.stock "satisfying" 3
  python -m src.stock "slime" 5 --provider pixabay
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

import requests

# en.wikipedia: los términos de imagen de los episodios están en inglés y matchean mucho
# mejor acá (es.wikipedia fallaba con sujetos no-cognados, ej. "maximilian of habsburg").
WIKI_API = "https://en.wikipedia.org/w/api.php"
_WIKI_UA = {"User-Agent": "shorts-bot/1.0 (https://github.com/santinovargasdb/shorts-bot3000)"}

ROOT = Path(__file__).resolve().parent.parent
BACKGROUNDS_DIR = ROOT / "backgrounds"
PEXELS_API = "https://api.pexels.com/videos/search"
PIXABAY_API = "https://pixabay.com/api/videos/"
PIXABAY_IMG_API = "https://pixabay.com/api/"


def _load_env() -> None:
    """Carga variables desde .env (KEY=VALUE) si existe, sin dependencias extra."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip())


# ─── Wikimedia/Wikipedia: imágenes relevantes para temas con nombre propio ──────────────
# (Pixabay es stock genérico y falla con sujetos históricos; Wikipedia tiene los reales.)

_WIKI_DESCRIPTIVE = {"portrait", "painting", "illustration", "photo", "picture",
                     "image", "drawing", "scene", "closeup"}


def clean_wiki_query(query: str) -> str:
    """Saca palabras descriptivas que confunden la búsqueda de Wikipedia; así encuentra el
    SUJETO y no una pieza random. 'benito juarez portrait' -> 'benito juarez'."""
    return " ".join(w for w in query.split() if w.lower() not in _WIKI_DESCRIPTIVE)


def wiki_url_from_response(data: dict) -> str | None:
    """URL de imagen RASTER de `pageimages`, o None. Prefiere el `thumbnail` (está capeado por
    pithumbsize; el `original` puede ser gigante —ej. PNG 20000px— y ffmpeg lo rechaza, y si es
    SVG tampoco lo compone). Cae al `original` solo si no hay thumbnail; si nada raster, None."""
    pages = (data or {}).get("query", {}).get("pages", {})
    for pg in pages.values():
        thumb = (pg.get("thumbnail") or {}).get("source")
        orig = (pg.get("original") or {}).get("source")
        if thumb and not thumb.lower().endswith(".svg"):
            return thumb
        if orig and not orig.lower().endswith(".svg"):
            return orig
    return None


_RASTER_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a")


def _is_raster_image(path) -> bool:
    """True si el archivo empieza con la firma de un raster que ffmpeg compone
    (JPEG/PNG/GIF/WEBP). Descarta SVG, HTML de error y descargas corruptas."""
    try:
        head = Path(path).read_bytes()[:16]
    except OSError:
        return False
    if any(head.startswith(m) for m in _RASTER_MAGIC):
        return True
    return head[:4] == b"RIFF" and head[8:12] == b"WEBP"


def strip_tracking(url: str) -> str:
    """Saca los parámetros utm_* que mete la API de Wiki (ensucian la URL y disparan 429)."""
    parts = urlsplit(url)
    if not parts.query:
        return url
    kept = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
            if not k.lower().startswith("utm_")]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), parts.fragment))


# ---------------------------------------------------------------- Pixabay
def _search_pixabay(query: str, count: int) -> list[tuple[str, str]]:
    """Devuelve [(url_mp4, id)] priorizando clips verticales."""
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        raise EnvironmentError(
            "Falta PIXABAY_API_KEY. Gratis en https://pixabay.com/api/docs/ -> .env"
        )
    params = {"key": key, "q": query, "per_page": max(count * 3, 12), "safesearch": "true"}
    r = requests.get(PIXABAY_API, params=params, timeout=60)
    r.raise_for_status()
    hits = r.json().get("hits", [])

    def ratio(h: dict) -> float:
        v = h["videos"].get("large") or h["videos"].get("medium") or {}
        w, ht = v.get("width", 1), v.get("height", 1)
        return (ht / w) if w else 0

    hits.sort(key=ratio, reverse=True)   # verticales primero
    out = []
    for h in hits[:count]:
        v = h["videos"].get("large") or h["videos"].get("medium") or h["videos"].get("small")
        if v and v.get("url"):
            out.append((v["url"], str(h["id"])))
    return out


# ---------------------------------------------------------------- Pexels
def _search_pexels(query: str, count: int) -> list[tuple[str, str]]:
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise EnvironmentError("Falta PEXELS_API_KEY.")
    params = {"query": query, "orientation": "portrait", "size": "medium",
              "per_page": max(count * 2, 10)}
    r = requests.get(PEXELS_API, headers={"Authorization": key}, params=params, timeout=60)
    r.raise_for_status()
    out = []
    for v in r.json().get("videos", [])[:count]:
        files = [f for f in v.get("video_files", []) if f.get("file_type") == "video/mp4"]
        files.sort(key=lambda f: f.get("height") or 0, reverse=True)
        if files:
            out.append((files[0]["link"], str(v["id"])))
    return out


_WIKI_CACHE: dict = {}          # query limpia -> URL (o None); evita re-pedir (baja el 429)
_WIKI_MIN_INTERVAL = 0.4        # segundos mínimos entre pedidos a Wikimedia (cortesía anti-429)
_wiki_last_req = [0.0]


def _wiki_pace() -> None:
    """Espacia los pedidos a Wikimedia al menos _WIKI_MIN_INTERVAL seg (evita el rate-limit)."""
    elapsed = time.monotonic() - _wiki_last_req[0]
    if elapsed < _WIKI_MIN_INTERVAL:
        time.sleep(_WIKI_MIN_INTERVAL - elapsed)
    _wiki_last_req[0] = time.monotonic()


def _wiki_search_image_url(query: str) -> str | None:
    """Busca en Wikipedia (en) el artículo de `query` y devuelve la URL de su imagen RASTER
    (sin tracking), o None. Limpia la query, cachea el resultado y reintenta ante 429/errores."""
    q = clean_wiki_query(query) or query
    if q in _WIKI_CACHE:
        return _WIKI_CACHE[q]
    params = {"action": "query", "format": "json", "prop": "pageimages",
              "generator": "search", "gsrsearch": q, "gsrlimit": 1,
              "piprop": "original|thumbnail", "pithumbsize": 1000, "redirects": 1}
    result = None
    for attempt in range(4):
        try:
            _wiki_pace()
            r = requests.get(WIKI_API, params=params, timeout=30, headers=_WIKI_UA)
            if r.status_code == 429:
                time.sleep(2.0 * (attempt + 1)); continue
            r.raise_for_status()
            url = wiki_url_from_response(r.json())
            result = strip_tracking(url) if url else None
            break
        except requests.RequestException:
            time.sleep(1.0 * (attempt + 1))
    _WIKI_CACHE[q] = result
    return result


def _download_url(url: str, dest: Path, headers=None) -> Path | None:
    """Baja `url` a `dest` (stream), reintentando ante 429/errores. None si falla."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            with requests.get(url, stream=True, timeout=120, headers=headers) as resp:
                if resp.status_code == 429:
                    time.sleep(1.5 * (attempt + 1)); continue
                resp.raise_for_status()
                with open(dest, "wb") as f:
                    for chunk in resp.iter_content(chunk_size=1 << 16):
                        f.write(chunk)
            return dest
        except requests.RequestException:
            time.sleep(1.0 * (attempt + 1))
    return None


def download_image(query: str, dest: Path, index: int = 0,
                   exclude_ids=None) -> tuple[Path, str] | None:
    """Descarga UNA imagen para `query`: PRIMERO Wikipedia (sujeto real; Pixabay es stock
    genérico y falla con temas históricos), con fallback a Pixabay. Devuelve (ruta, id)
    o None. `exclude_ids`: ids a evitar (no repetir imágenes dentro de un mismo dato)."""
    exclude = {str(x) for x in (exclude_ids or set())}
    wiki_url = _wiki_search_image_url(query)
    if wiki_url and f"wiki:{wiki_url}" not in exclude:
        _wiki_pace()
        if _download_url(wiki_url, dest, headers=_WIKI_UA) and _is_raster_image(dest):
            return Path(dest), f"wiki:{wiki_url}"
    return _download_image_pixabay(query, dest, index, exclude_ids)


def _download_image_pixabay(query: str, dest: Path, index: int = 0,
                            exclude_ids=None) -> tuple[Path, str] | None:
    """Descarga UNA imagen vertical de Pixabay para `query` a `dest` (fallback).
    Devuelve (ruta, id) o None si no hay resultados. `exclude_ids`: ids a evitar
    (para no repetir imágenes dentro de un mismo dato)."""
    _load_env()
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        raise EnvironmentError("Falta PIXABAY_API_KEY en .env para bajar imágenes.")
    params = {"key": key, "q": query, "image_type": "photo",
              "orientation": "vertical", "safesearch": "true", "per_page": 20}
    r = requests.get(PIXABAY_IMG_API, params=params, timeout=60)
    r.raise_for_status()
    hits = r.json().get("hits", [])
    if not hits:
        return None
    exclude = {str(x) for x in (exclude_ids or set())}
    order = list(range(len(hits)))
    order = order[index:] + order[:index]
    hit = next((hits[i] for i in order if str(hits[i]["id"]) not in exclude), None)
    if hit is None:
        return None   # no hay ninguna distinta disponible
    url = hit.get("largeImageURL") or hit.get("webformatURL")
    if not url:
        return None
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
    return dest, str(hit["id"])


def _resolve_provider(provider: str) -> str:
    if provider != "auto":
        return provider
    if os.environ.get("PIXABAY_API_KEY"):
        return "pixabay"
    if os.environ.get("PEXELS_API_KEY"):
        return "pexels"
    raise EnvironmentError(
        "No hay API key. Poné PIXABAY_API_KEY (o PEXELS_API_KEY) en .env"
    )


def download(query: str, count: int = 3, provider: str = "auto",
             out_dir: Path | str = BACKGROUNDS_DIR) -> list[Path]:
    """Busca y descarga `count` clips para `query`. Devuelve las rutas."""
    _load_env()
    provider = _resolve_provider(provider)
    print(f"Proveedor: {provider} | búsqueda: '{query}'")
    results = _search_pixabay(query, count) if provider == "pixabay" else _search_pexels(query, count)

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    slug = "".join(c if c.isalnum() else "_" for c in query.lower())[:20]
    saved: list[Path] = []
    for url, vid in results:
        dest = out_dir / f"{provider}_{slug}_{vid}.mp4"
        print(f"  Descargando {dest.name} ...")
        with requests.get(url, stream=True, timeout=180) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        saved.append(dest)
    print(f"✅ {len(saved)} clip(s) en {out_dir}")
    return saved


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    provider = "auto"
    for a in sys.argv[1:]:
        if a.startswith("--provider"):
            provider = a.split("=", 1)[1] if "=" in a else "auto"
    if not args:
        print('Uso: python -m src.stock "<búsqueda>" [cantidad] [--provider=pixabay|pexels]')
        raise SystemExit(1)
    q = args[0]
    n = int(args[1]) if len(args) > 1 else 3
    download(q, n, provider=provider)
