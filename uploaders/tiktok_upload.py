"""Sube videos a los BORRADORES de TikTok (Content Posting API, inbox upload).

Flujo sin auditoría de app: el video llega a la bandeja de notificaciones de
TikTok y el dueño de la cuenta completa la publicación en la app (2 toques).
Cuando la app pase la auditoría se puede migrar a publicación directa.

Comandos:
  python -m uploaders.tiktok_upload auth [token.json]  # OAuth localhost (token.json opcional = por canal)
  python -m uploaders.tiktok_upload auth-manual        # imprime la URL (flujo viejo, copiar code)
  python -m uploaders.tiktok_upload code <CODE> [token.json]  # canjea el código por tokens
  python -m uploaders.tiktok_upload upload <video>     # sube un mp4 a borradores
  python -m uploaders.tiktok_upload publish <video> [titulo]  # direct post PRIVADO (test)
  python -m uploaders.tiktok_upload status <id>        # consulta estado de una subida

Credenciales en .env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI.
Token global en secrets/tiktok_token.json (faceless, legacy). Para multi-canal, cada
canal usa su propio token (ver `token_file`): secrets/<canal>/tiktok_token.json.
Access 24h, refresh ~1 año; se renueva solo.
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets as pysecrets
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
TOKEN_FILE = ROOT / "secrets" / "tiktok_token.json"
PKCE_FILE = ROOT / "secrets" / "tiktok_pkce.tmp"
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
def _pkce_verifier() -> str:
    """code_verifier PKCE: aleatorio URL-safe (~86 chars, dentro de 43-128)."""
    return pysecrets.token_urlsafe(64)


def _pkce_challenge(verifier: str) -> str:
    """code_challenge de TikTok: SHA256 del verifier en HEX (no base64url)."""
    return hashlib.sha256(verifier.encode("ascii")).hexdigest()


def auth_url(redirect_uri: str | None = None, state: str | None = None,
             code_challenge: str | None = None) -> str:
    """URL para que el dueño de la cuenta autorice la app (abrir en navegador).

    La app Desktop de TikTok exige PKCE: si se pasa `code_challenge` se agregan
    `code_challenge` + `code_challenge_method=S256` a la URL."""
    from urllib.parse import urlencode

    params = {
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "scope": SCOPES,
        "response_type": "code",
        "redirect_uri": redirect_uri or _env("TIKTOK_REDIRECT_URI"),
        "state": state or pysecrets.token_urlsafe(16),
    }
    if code_challenge:
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"
    return f"{AUTH_URL}?{urlencode(params)}"


def _parse_callback(path: str, expected_state: str) -> str:
    """Extrae el code del path del callback OAuth, validando el state."""
    from urllib.parse import parse_qs, urlparse

    q = parse_qs(urlparse(path).query)
    if "error" in q:
        detalle = q.get("error_description", q["error"])[0]
        raise RuntimeError(f"TikTok devolvió error: {detalle}")
    if q.get("state", [None])[0] != expected_state:
        raise RuntimeError("state inválido en el callback (posible CSRF); reintentá el auth.")
    code = q.get("code", [None])[0]
    if not code:
        raise RuntimeError(f"Callback sin code: {path}")
    return code


def auth_local(token_file: Path | None = None) -> None:
    """OAuth de la app (Desktop): levanta un servidor local en
    http://localhost:PUERTO/callback/, abre el navegador y canjea el code solo
    — sin copiar códigos a mano. `token_file` guarda el token del canal
    (default: global secrets/tiktok_token.json)."""
    import socket
    import webbrowser
    from http.server import BaseHTTPRequestHandler, HTTPServer

    state = pysecrets.token_urlsafe(16)
    verifier = _pkce_verifier()
    challenge = _pkce_challenge(verifier)
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    redirect = f"http://localhost:{port}/callback/"
    resultado: dict = {}

    class _Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if not self.path.startswith("/callback"):   # favicon y demás
                self.send_response(404)
                self.end_headers()
                return
            try:
                resultado["code"] = _parse_callback(self.path, state)
                cuerpo = "✅ Autorizado. Cerrá esta pestaña y volvé a la terminal."
            except Exception as e:
                resultado["error"] = str(e)
                cuerpo = f"⚠️ {e}"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(f"<h2 style='font-family:sans-serif'>{cuerpo}</h2>".encode())

        def log_message(self, *args):
            pass

    srv = HTTPServer(("127.0.0.1", port), _Handler)
    url = auth_url(redirect_uri=redirect, state=state, code_challenge=challenge)
    print("Abriendo el navegador: logueate con la cuenta de TikTok del canal y autorizá.")
    print(f"Si no se abre solo, pegá esta URL:\n{url}")
    webbrowser.open(url)
    try:
        while "code" not in resultado and "error" not in resultado:
            srv.handle_request()
    finally:
        srv.server_close()
    if "error" in resultado:
        raise RuntimeError(resultado["error"])
    exchange_code(resultado["code"], redirect_uri=redirect, code_verifier=verifier,
                  token_file=token_file)


def exchange_code(code: str, redirect_uri: str | None = None,
                  code_verifier: str | None = None,
                  token_file: Path | None = None) -> dict:
    """Canjea el código del callback por access_token + refresh_token.

    `code_verifier` es obligatorio para la app Desktop (PKCE). `token_file`
    guarda el token del canal (default: global secrets/tiktok_token.json)."""
    payload = {
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "client_secret": _env("TIKTOK_CLIENT_SECRET"),
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri or _env("TIKTOK_REDIRECT_URI"),
    }
    if code_verifier:
        payload["code_verifier"] = code_verifier
    r = requests.post(TOKEN_URL, data=payload,
                      headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=60)
    data = r.json()
    if "access_token" not in data:
        raise RuntimeError(f"TikTok no devolvió token: {data}")
    data["obtained_at"] = int(time.time())
    tf = token_file or TOKEN_FILE
    tf.parent.mkdir(parents=True, exist_ok=True)
    tf.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"[OK] Token guardado en {tf}. open_id={data.get('open_id', '?')} scope={data.get('scope')}")
    return data


def _refresh(tok: dict, token_file: Path | None = None) -> dict:
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
    (token_file or TOKEN_FILE).write_text(json.dumps(data, indent=2), encoding="utf-8")
    return data


def _get_token(token_file: Path | None = None) -> str:
    """Access token vigente del canal (refresca solo si venció). `token_file`
    None = token global (secrets/tiktok_token.json, legacy de faceless)."""
    tf = token_file or TOKEN_FILE
    if not tf.exists():
        raise RuntimeError(f"No hay token de TikTok en {tf}. Corré: python -m uploaders.tiktok_upload auth")
    tok = json.loads(tf.read_text(encoding="utf-8"))
    age = time.time() - tok.get("obtained_at", 0)
    if age > tok.get("expires_in", 86400) - 600:   # 10 min de margen
        tok = _refresh(tok, token_file=tf)
    return tok["access_token"]


# ---------------------------------------------------------------- Subida
def upload_draft(video_path: Path | str, token_file: Path | None = None) -> str:
    """Sube el mp4 a los borradores (inbox) de TikTok. Devuelve el publish_id."""
    video_path = Path(video_path)
    size = video_path.stat().st_size
    token = _get_token(token_file)

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


def creator_info(token_file: Path | None = None) -> dict:
    """Consulta creator_info (obligatorio antes de un direct post): nickname,
    opciones de privacidad disponibles y toggles de interacción."""
    r = requests.post(CREATOR_INFO_URL, headers={
        "Authorization": f"Bearer {_get_token(token_file)}",
        "Content-Type": "application/json; charset=UTF-8",
    }, timeout=60)
    data = r.json()
    if data.get("error", {}).get("code") not in (None, "ok"):
        raise RuntimeError(f"creator_info falló: {data['error']}")
    return data["data"]


def publish_direct(video_path: Path | str, title: str, privacy_level: str,
                   disable_comment: bool = False, disable_duet: bool = False,
                   disable_stitch: bool = False, token_file: Path | None = None) -> str:
    """Publica el mp4 DIRECTO en TikTok (requiere scope video.publish y app
    auditada; con app sin auditar el post queda privado). Devuelve publish_id."""
    video_path = Path(video_path)
    size = video_path.stat().st_size
    token = _get_token(token_file)

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


def fetch_status(publish_id: str, token_file: Path | None = None) -> dict:
    token = _get_token(token_file)
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
        # Token por canal opcional: python -m ... auth secrets/historia/tiktok_token.json
        _tf = Path(sys.argv[2]) if len(sys.argv) > 2 else None
        auth_local(token_file=_tf)
    elif cmd == "auth-manual":
        _ver = _pkce_verifier()
        PKCE_FILE.parent.mkdir(exist_ok=True)
        PKCE_FILE.write_text(_ver, encoding="utf-8")
        print("Abrí esta URL, logueate con la cuenta de TikTok del canal y autorizá:")
        print(auth_url(code_challenge=_pkce_challenge(_ver)))
    elif cmd == "code":
        _ver = PKCE_FILE.read_text(encoding="utf-8").strip() if PKCE_FILE.exists() else None
        _tf = Path(sys.argv[3]) if len(sys.argv) > 3 else None
        exchange_code(sys.argv[2], code_verifier=_ver, token_file=_tf)
        if PKCE_FILE.exists():
            PKCE_FILE.unlink()
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
