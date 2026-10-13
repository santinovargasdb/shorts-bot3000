"""Demo para la revisión de YouTube Data API v3 (videos.insert).

Grabá la pantalla corriendo esto: muestra el flujo COMPLETO de subida de un
video a tu propio canal vía la YouTube Data API v3, con el RESULTADO FINAL
(URL en vivo + nombre y ID del canal, leídos de la respuesta de la API).

Uso:
  python yt_api_demo.py <clip.mp4> [token_file]

token_file por defecto: secrets/token.json  (canal "En 60 Segundos").
Para grabar la demo de otro canal:
  python yt_api_demo.py <clip.mp4> secrets/historia/token.json
  python yt_api_demo.py <clip.mp4> secrets/misterios/token.json

El video queda como 'unlisted' (oculto). Borralo después de grabar la demo.
"""
from __future__ import annotations

import sys

from uploaders.youtube_upload import _get_service


def main(clip: str, token_file: str | None = None) -> int:
    from googleapiclient.http import MediaFileUpload

    print("=" * 72)
    print(" DEMO - YouTube Data API v3 : subir un video con videos.insert")
    print("=" * 72)

    print("\n[1/3] Autenticando con OAuth 2.0 (token del dueno del canal)...")
    service = _get_service(token_file)
    print("      OK: credenciales cargadas. Unico scope usado: youtube.upload\n")

    print("[2/3] Llamando youtube.videos().insert(part='snippet,status') ...")
    body = {
        "snippet": {
            "title": "YouTube API demo upload (for API review) - please ignore",
            "description": (
                "Demo upload created by my single-user desktop tool to show the "
                "videos.insert flow for the YouTube Data API quota review. "
                "This video is unlisted and will be deleted after the review."
            ),
            "categoryId": "24",
        },
        "status": {"privacyStatus": "unlisted", "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(clip), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"      subiendo... {int(status.progress() * 100)}%")
    print("      OK: el video lo creo la API (videos.insert).\n")

    vid = response["id"]
    snip = response.get("snippet", {})
    channel_title = snip.get("channelTitle", "(canal autorizado)")
    channel_id = snip.get("channelId", "")

    print("[3/3] RESULTADO FINAL (end result):")
    print(f"      Video ID     : {vid}")
    print(f"      Canal        : {channel_title}")
    print(f"      Channel ID   : {channel_id}")
    print(f"      URL del video: https://www.youtube.com/watch?v={vid}")
    print(f"      Short URL    : https://youtube.com/shorts/{vid}")
    if channel_id:
        print(f"      Canal (URL)  : https://www.youtube.com/channel/{channel_id}")
    print("\n      -> Abri la 'URL del video' en el navegador para mostrar que esta")
    print("         en vivo en el canal. videos.insert es el UNICO endpoint usado.")
    print("      -> Acordate de borrar este video 'unlisted' despues de grabar.\n")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python yt_api_demo.py <clip.mp4> [token_file]")
        raise SystemExit(1)
    raise SystemExit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
