"""Publica un Reel en Instagram con la API de Instagram (inicio de sesión de IG).

IMPORTANTE: la API NO acepta subir el archivo directo; requiere una URL pública
del video (ella lo descarga). Acá se hostea gratis con GitHub Releases
(ver src/gh_release.py).

Requisitos (una sola vez):
  - Cuenta de Instagram Profesional (Creador/Empresa).
  - App de Meta con "Instagram API" + permiso instagram_business_content_publish.
  - Token de larga duración (60 días) y el IG_USER_ID en el .env.

Flujo: crear contenedor (REELS) -> esperar a FINISHED -> publicar.
"""
from __future__ import annotations

import os
import sys
import time

import requests

# API de Instagram con inicio de sesión de Instagram (no la de Facebook)
GRAPH = "https://graph.instagram.com/v21.0"


def _env(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise EnvironmentError(f"Falta la variable de entorno {name} (ver .env).")
    return val


def publish_reel(
    video_url: str,
    caption: str = "",
    ig_user_id: str | None = None,
    access_token: str | None = None,
    poll_seconds: int = 6,
    max_wait: int = 300,
) -> str:
    """Publica un Reel desde una URL pública. Devuelve el ID del media."""
    ig_user_id = ig_user_id or _env("IG_USER_ID")
    access_token = access_token or _env("IG_ACCESS_TOKEN")

    # 1) Crear contenedor
    r = requests.post(
        f"{GRAPH}/{ig_user_id}/media",
        data={
            "media_type": "REELS",
            "video_url": video_url,
            "caption": caption[:2200],
            "access_token": access_token,
        },
        timeout=60,
    )
    r.raise_for_status()
    container_id = r.json()["id"]
    print(f"  Contenedor creado: {container_id}")

    # 2) Esperar a que Instagram procese el video
    waited = 0
    while waited < max_wait:
        s = requests.get(
            f"{GRAPH}/{container_id}",
            params={"fields": "status_code,status", "access_token": access_token},
            timeout=30,
        )
        s.raise_for_status()
        status = s.json().get("status_code")
        if status == "FINISHED":
            break
        if status == "ERROR":
            raise RuntimeError(f"Instagram falló al procesar: {s.json()}")
        print(f"  Procesando... ({status})")
        time.sleep(poll_seconds)
        waited += poll_seconds
    else:
        raise TimeoutError("Instagram tardó demasiado en procesar el video.")

    # 3) Publicar
    p = requests.post(
        f"{GRAPH}/{ig_user_id}/media_publish",
        data={"creation_id": container_id, "access_token": access_token},
        timeout=60,
    )
    p.raise_for_status()
    media_id = p.json()["id"]
    print(f"  [OK] Reel publicado. media_id={media_id}")
    return media_id


def post_comment(media_id: str, message: str, access_token: str | None = None) -> str:
    """Comenta un media PROPIO (requiere el permiso
    instagram_business_manage_comments en el token). Devuelve el ID del comentario."""
    access_token = access_token or _env("IG_ACCESS_TOKEN")
    r = requests.post(
        f"{GRAPH}/{media_id}/comments",
        data={"message": message, "access_token": access_token},
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["id"]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python -m uploaders.instagram_upload <video_url_publica> ["caption"]')
        raise SystemExit(1)
    cap = sys.argv[2] if len(sys.argv) > 2 else ""
    publish_reel(sys.argv[1], caption=cap)
