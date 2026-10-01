"""Sube videos a los BORRADORES de TikTok (Content Posting API, inbox upload).

Flujo sin auditoría de app: el video llega a la bandeja de notificaciones de
TikTok y el dueño de la cuenta completa la publicación en la app (2 toques).
Cuando la app pase la auditoría se puede migrar a publicación directa.

Comandos:
  python -m uploaders.tiktok_upload auth            # imprime la URL para autorizar
  python -m uploaders.tiktok_upload code <CODE>     # canjea el código por tokens
  python -m uploaders.tiktok_upload upload <video>  # sube un mp4 a borradores
  python -m uploaders.tiktok_upload publish <video> [titulo]  # direct post PRIVADO (test)
  python -m uploaders.tiktok_upload status <id>     # consulta estado de una subida

Credenciales en .env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI.
Tokens en secrets/tiktok_token.json (access 24h, refresh ~1 año; se renueva solo).
"""
from __future__ import annotations

import json
import os
import secrets as pysecrets
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = ROOT / "secrets" / "tiktok_token.json"
AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
INBOX_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
DIRECT_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/"
CREATOR_INFO_URL = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/"
STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
SCOPES = "user.info.basic,video.upload,video.publish"


def _load_env() -> None:
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def _env(name: str) -> str:
    _load_env()
    val = os.environ.get(name)
    if not val:
        raise EnvironmentError(f"Falta {name} en .env")
    return val


# ---------------------------------------------------------------- OAuth
def auth_url() -> str:
    """URL para que el dueño de la cuenta autorice la app (abrir en navegador)."""
    from urllib.parse import urlencode

    params = {
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": _env("TIKTOK_REDIRECT_URI"),
        "state": pysecrets.token_urlsafe(16),
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Canjea el código del callback por access_token + refresh_token."""
    r = requests.post(TOKEN_URL, data={
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "client_secret": _env("TIKTOK_CLIENT_SECRET"),
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": _env("TIKTOK_REDIRECT_URI"),
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=60)
    data = r.json()
    if "access_token" not in data:
        raise RuntimeError(f"TikTok no devolvió token: {data}")
    data["obtained_at"] = int(time.time())
    TOKEN_FILE.parent.mkdir(exist_ok=True)
    TOKEN_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[OK] Token guardado. open_id={data.get('open_id', '?')} scope={data.get('scope')}")
    return data


def _refresh(tok: dict) -> dict:
    r = requests.post(TOKEN_URL, data={
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "client_secret": _env("TIKTOK_CLIENT_SECRET"),
        "grant_type": "refresh_token",
        "refresh_token": tok["refresh_token"],
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=60)
    data = r.json()
    if "access_token" not in data:
        raise RuntimeError(f"No se pudo refrescar el token de TikTok: {data}")
    data["obtained_at"] = int(time.time())
    TOKEN_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def _get_token() -> str:
    """Access token vigente (refresca solo si venció)."""
    if not TOKEN_FILE.exists():
        raise RuntimeError("No hay token de TikTok. Corré: python -m uploaders.tiktok_upload auth")
    tok = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
    age = time.time() - tok.get("obtained_at", 0)
    if age > tok.get("expires_in", 86400) - 600:   # 10 min de margen
        tok = _refresh(tok)
    return tok["access_token"]


# ---------------------------------------------------------------- Subida
def upload_draft(video_path: Path | str) -> str:
    """Sube el mp4 a los borradores (inbox) de TikTok. Devuelve el publish_id."""
    video_path = Path(video_path)
    size = video_path.stat().st_size
    token = _get_token()

    # 1) Iniciar la subida (archivo < 64MB => un solo chunk)
    init = requests.post(INBOX_INIT_URL, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }, json={"source_info": {
        "source": "FILE_UPLOAD",
        "video_size": size,
        "chunk_size": size,
        "total_chunk_count": 1,
    }}, timeout=60)
    data = init.json()
    if data.get("error", {}).get("code") not in (None, "ok"):
        raise RuntimeError(f"TikTok init falló: {data['error']}")
    publish_id = data["data"]["publish_id"]
    upload_url = data["data"]["upload_url"]
    print(f"  Subida iniciada: {publish_id}")

    # 2) Subir el archivo
    with open(video_path, "rb") as f:
        put = requests.put(upload_url, headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        }, data=f.read(), timeout=300)
    if put.status_code not in (200, 201):
        raise RuntimeError(f"TikTok upload falló ({put.status_code}): {put.text[:300]}")
    print("  [OK] Video en tus borradores de TikTok (revisá las notificaciones de la app).")
    return publish_id


def creator_info() -> dict:
    """Consulta creator_info (obligatorio antes de un direct post): nickname,
    opciones de privacidad disponibles y toggles de interacción."""
    r = requests.post(CREATOR_INFO_URL, headers={
        "Authorization": f"Bearer {_get_token()}",
        "Content-Type": "application/json; charset=UTF-8",
    }, timeout=60)
    data = r.json()
    if data.get("error", {}).get("code") not in (None, "ok"):
        raise RuntimeError(f"creator_info falló: {data['error']}")
    return data["data"]


def publish_direct(video_path: Path | str, title: str, privacy_level: str,
                   disable_comment: bool = False, disable_duet: bool = False,
                   disable_stitch: bool = False) -> str:
    """Publica el mp4 DIRECTO en TikTok (requiere scope video.publish y app
    auditada; con app sin auditar el post queda privado). Devuelve publish_id."""
    video_path = Path(video_path)
    size = video_path.stat().st_size
    token = _get_token()

    init = requests.post(DIRECT_INIT_URL, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }, json={
        "post_info": {
            "title": title,
            "privacy_level": privacy_level,
            "disable_comment": disable_comment,
            "disable_duet": disable_duet,
            "disable_stitch": disable_stitch,
        },
        "source_info": {
            "source": "FILE_UPLOAD",
            "video_size": size,
            "chunk_size": size,
            "total_chunk_count": 1,
        },
    }, timeout=60)
    data = init.json()
    if data.get("error", {}).get("code") not in (None, "ok"):
        raise RuntimeError(f"TikTok direct post init falló: {data['error']}")
    publish_id = data["data"]["publish_id"]
    upload_url = data["data"]["upload_url"]
    print(f"  Publicación directa iniciada: {publish_id}")

    with open(video_path, "rb") as f:
        put = requests.put(upload_url, headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        }, data=f.read(), timeout=300)
    if put.status_code not in (200, 201):
        raise RuntimeError(f"TikTok upload falló ({put.status_code}): {put.text[:300]}")
    print("  [OK] Video subido; TikTok lo está procesando para publicarlo.")
    return publish_id


def fetch_status(publish_id: str) -> dict:
    token = _get_token()
    r = requests.post(STATUS_URL, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }, json={"publish_id": publish_id}, timeout=60)
    return r.json()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    cmd = sys.argv[1]
    if cmd == "auth":
        print("Abrí esta URL, logueate con la cuenta de TikTok del canal y autorizá:")
        print(auth_url())
    elif cmd == "code":
        exchange_code(sys.argv[2])
    elif cmd == "upload":
        upload_draft(sys.argv[2])
    elif cmd == "publish":
        _title = sys.argv[3] if len(sys.argv) > 3 else "Test direct post (private)"
        _pid = publish_direct(sys.argv[2], title=_title, privacy_level="SELF_ONLY")
        for _ in range(24):
            _st = fetch_status(_pid)
            _s = _st.get("data", {}).get("status")
            print(f"  status: {_s}")
            if _s == "PUBLISH_COMPLETE" or (_s and "FAILED" in _s):
                print(json.dumps(_st.get("data", {}), indent=2))
                break
            time.sleep(5)
    elif cmd == "status":
        print(json.dumps(fetch_status(sys.argv[2]), indent=2))
    else:
        print(f"Comando desconocido: {cmd}")
        raise SystemExit(1)
