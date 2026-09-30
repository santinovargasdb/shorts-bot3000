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
from pathlib import Path

import requests

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


def download_image(query: str, dest: Path, index: int = 0) -> Path | None:
    """Descarga UNA imagen vertical de Pixabay para `query` a `dest`. Devuelve
    la ruta o None si no hay resultados. Ideal para los planos que cambian."""
    _load_env()
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        raise EnvironmentError("Falta PIXABAY_API_KEY en .env para bajar imágenes.")
    params = {"key": key, "q": query, "image_type": "photo",
              "orientation": "vertical", "safesearch": "true", "per_page": 12}
    r = requests.get(PIXABAY_IMG_API, params=params, timeout=60)
    r.raise_for_status()
    hits = r.json().get("hits", [])
    if not hits:
        return None
    hit = hits[index % len(hits)]
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
    return dest


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
