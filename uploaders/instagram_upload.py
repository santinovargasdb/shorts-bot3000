"""Publica un Reel en Instagram con la Graph API oficial (gratis).

IMPORTANTE: la Graph API NO acepta subir el archivo directo; requiere una
URL pública del video (ella lo descarga). Opciones para hostear gratis el mp4:
  - Un bucket/hosting propio, Cloudflare R2, GitHub Releases, etc.
  - Un túnel temporal (p.ej. servir /output y exponerlo).
Ver setup_instagram_auth.md.

Requisitos (una sola vez):
  - Cuenta de Instagram Profesional (Creador/Empresa) vinculada a una Página de Facebook.
  - App de Meta + token de acceso de larga duración con permisos
    instagram_content_publish, instagram_basic, pages_read_engagement.
  - IG_USER_ID y IG_ACCESS_TOKEN en el .env (o variables de entorno).

Flujo: crear contenedor (REELS) -> esperar a FINISHED -> publicar.
"""
from __future__ import annotations

import os
import sys
import time

import requests

GRAPH = "https://graph.facebook.com/v21.0"


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
    share_to_feed: bool = True,
    poll_seconds: int = 5,
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
            "share_to_feed": "true" if share_to_feed else "false",
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
    print(f"  ✅ Reel publicado. media_id={media_id}")
    return media_id


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python -m uploaders.instagram_upload <video_url_publica> ["caption"]')
        raise SystemExit(1)
    cap = sys.argv[2] if len(sys.argv) > 2 else ""
    publish_reel(sys.argv[1], caption=cap)
