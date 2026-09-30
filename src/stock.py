"""Descarga footage royalty-free de Pexels (gratis, uso comercial sin atribución).

Sirve para conseguir fondos "satisfactorios/abstractos/gameplay" limpios para el
canal faceless, sin riesgo de copyright.

Requiere una API key gratuita de Pexels: https://www.pexels.com/api/
Ponela en .env como  PEXELS_API_KEY=xxxx  (o exportala como variable de entorno).

Uso:
  python -m src.stock "satisfying" 3          # baja 3 clips verticales a backgrounds/
  python -m src.stock "abstract loop" 5
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
BACKGROUNDS_DIR = ROOT / "backgrounds"
API = "https://api.pexels.com/videos/search"


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


def _api_key() -> str:
    _load_env()
    key = os.environ.get("PEXELS_API_KEY")
    if not key:
        raise EnvironmentError(
            "Falta PEXELS_API_KEY. Conseguí una gratis en https://www.pexels.com/api/ "
            "y ponela en .env como PEXELS_API_KEY=xxxx"
        )
    return key


def _best_portrait_mp4(video: dict, max_height: int = 1920) -> str | None:
    """Elige el mejor archivo mp4 vertical (más alto sin pasarse)."""
    candidates = [
        f for f in video.get("video_files", [])
        if f.get("file_type") == "video/mp4"
        and (f.get("height") or 0) >= (f.get("width") or 0)   # vertical o cuadrado
    ]
    if not candidates:
        candidates = [f for f in video.get("video_files", []) if f.get("file_type") == "video/mp4"]
    if not candidates:
        return None
    ok = [f for f in candidates if (f.get("height") or 0) <= max_height] or candidates
    ok.sort(key=lambda f: f.get("height") or 0, reverse=True)
    return ok[0].get("link")


def download(query: str, count: int = 3, out_dir: Path | str = BACKGROUNDS_DIR) -> list[Path]:
    """Busca y descarga `count` clips verticales para `query`. Devuelve rutas."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    headers = {"Authorization": _api_key()}
    params = {"query": query, "orientation": "portrait", "size": "medium",
              "per_page": max(count * 2, 10)}
    r = requests.get(API, headers=headers, params=params, timeout=60)
    r.raise_for_status()
    videos = r.json().get("videos", [])

    saved: list[Path] = []
    for v in videos:
        if len(saved) >= count:
            break
        link = _best_portrait_mp4(v)
        if not link:
            continue
        slug = "".join(c if c.isalnum() else "_" for c in query.lower())[:20]
        dest = out_dir / f"pexels_{slug}_{v['id']}.mp4"
        print(f"  Descargando {dest.name} ...")
        with requests.get(link, stream=True, timeout=120) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(chunk_size=1 << 16):
                    f.write(chunk)
        saved.append(dest)
    print(f"✅ {len(saved)} clip(s) en {out_dir}")
    return saved


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python -m src.stock "<búsqueda>" [cantidad]')
        raise SystemExit(1)
    q = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    download(q, n)
