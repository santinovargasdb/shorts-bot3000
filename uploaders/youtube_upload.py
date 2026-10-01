"""Sube un short a YouTube con la YouTube Data API v3 (gratis).

Requisitos (una sola vez, ver setup_youtube_auth.md):
  1. Proyecto en Google Cloud + YouTube Data API v3 activada.
  2. Credenciales OAuth de escritorio -> secrets/client_secret.json
  3. La 1ª ejecución abre el navegador para autorizar y guarda secrets/token.json

Uso:
  python -m uploaders.youtube_upload <clip.mp4> [private|unlisted|public] [token_file]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECRETS = ROOT / "secrets"
CLIENT_SECRET = SECRETS / "client_secret.json"
TOKEN = SECRETS / "token.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def _resolve_token(token_file: str | Path | None) -> Path:
    """Ruta del token OAuth: la del canal (relativa a la raíz) o la legacy."""
    if token_file is None:
        return TOKEN
    p = Path(token_file)
    return p if p.is_absolute() else ROOT / p


def _get_service(token_file: str | Path | None = None):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    tok = _resolve_token(token_file)
    creds = None
    if tok.exists():
        creds = Credentials.from_authorized_user_file(str(tok), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CLIENT_SECRET.exists():
                raise FileNotFoundError(
                    f"Falta {CLIENT_SECRET}. Seguí setup_youtube_auth.md."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET), SCOPES)
            creds = flow.run_local_server(port=0)
        tok.parent.mkdir(parents=True, exist_ok=True)
        tok.write_text(creds.to_json(), encoding="utf-8")
    return build("youtube", "v3", credentials=creds)


def upload(
    video_path: Path | str,
    title: str,
    description: str = "",
    tags: list[str] | None = None,
    privacy: str = "private",       # "private" | "unlisted" | "public"
    category_id: str = "24",        # 24 = Entertainment
    token_file: str | Path | None = None,
) -> str:
    """Sube el video y devuelve el ID del video de YouTube."""
    from googleapiclient.http import MediaFileUpload

    service = _get_service(token_file)
    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:4900],
            "tags": (tags or [])[:15],
            "categoryId": category_id,
        },
        "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
    }
    media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True, mimetype="video/mp4")
    request = service.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Subiendo... {int(status.progress() * 100)}%")
    video_id = response["id"]
    print(f"  [OK] Publicado: https://youtube.com/shorts/{video_id}  (privacy={privacy})")
    return video_id


def upload_from_folder(clip_path: Path | str, privacy: str = "private", token_file: str | Path | None = None) -> str:
    """Sube un clip usando su .json de metadatos hermano si existe."""
    clip_path = Path(clip_path)
    meta_path = clip_path.with_suffix(".json")
    title, description, tags = clip_path.stem, "", None
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        title = meta.get("title", title)
        description = meta.get("description", "")
        tags = [t.lstrip("#") for t in meta.get("hashtags", [])]
    return upload(clip_path, title, description, tags, privacy=privacy, token_file=token_file)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m uploaders.youtube_upload <clip.mp4> [private|unlisted|public] [token_file]")
        raise SystemExit(1)
    priv = sys.argv[2] if len(sys.argv) > 2 else "private"
    tok = sys.argv[3] if len(sys.argv) > 3 else None
    upload_from_folder(sys.argv[1], privacy=priv, token_file=tok)
