"""Hosting gratis del mp4 vía GitHub Releases (para darle a Instagram una URL pública).

Sube el video como "asset" de un release del repo (público) y devuelve el link
directo de descarga, que Instagram puede leer.

Requiere en .env:
  GITHUB_TOKEN=<PAT con permiso de escritura en el repo>
  GITHUB_REPO=santinovargasdb/shorts-bot3000   (opcional; este es el default)
"""
from __future__ import annotations

import os
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPO = "santinovargasdb/shorts-bot3000"
RELEASE_TAG = "media"   # un release reutilizable donde viven los mp4


def _load_env() -> None:
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def _headers() -> dict:
    _load_env()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise EnvironmentError("Falta GITHUB_TOKEN en .env (PAT con escritura en el repo).")
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}


def _repo() -> str:
    _load_env()
    return os.environ.get("GITHUB_REPO", DEFAULT_REPO)


def _get_or_create_release(repo: str, headers: dict) -> dict:
    r = requests.get(f"https://api.github.com/repos/{repo}/releases/tags/{RELEASE_TAG}", headers=headers)
    if r.status_code == 200:
        return r.json()
    r = requests.post(
        f"https://api.github.com/repos/{repo}/releases", headers=headers,
        json={"tag_name": RELEASE_TAG, "name": "media", "body": "Hosting de videos para IG."},
    )
    r.raise_for_status()
    return r.json()


def upload(video_path: Path | str) -> str:
    """Sube el mp4 al release y devuelve la URL pública de descarga."""
    video_path = Path(video_path)
    repo = _repo()
    headers = _headers()
    release = _get_or_create_release(repo, headers)
    name = video_path.name

    # Borrar un asset previo con el mismo nombre (para reemplazar limpio)
    for asset in release.get("assets", []):
        if asset["name"] == name:
            requests.delete(f"https://api.github.com/repos/{repo}/releases/assets/{asset['id']}", headers=headers)

    upload_url = release["upload_url"].split("{")[0]
    with open(video_path, "rb") as f:
        r = requests.post(
            f"{upload_url}?name={name}",
            headers={**headers, "Content-Type": "video/mp4"},
            data=f.read(), timeout=300,
        )
    r.raise_for_status()
    return r.json()["browser_download_url"]


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Uso: python -m src.gh_release <video.mp4>")
        raise SystemExit(1)
    print(upload(sys.argv[1]))
