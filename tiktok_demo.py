"""Demo para la revisión de la app de TikTok — OAuth 2.0 + Content Posting API.

Lanzarlo con grabar_demo_tiktok.bat (graba la pantalla durante todo el recorrido
y genera tiktok_review_demo.mp4 para el formulario "Submit for review").
La salida está en inglés porque la ven los revisores de TikTok.

Demuestra los 3 scopes: user.info.basic, video.upload (borradores/inbox)
y video.publish (publicación directa con creator_info + elección de privacidad).
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

import requests

from uploaders.tiktok_upload import (
    INBOX_INIT_URL,
    ROOT,
    SCOPES,
    STATUS_URL,
    TOKEN_URL,
    _env,
    auth_url,
    creator_info,
    publish_direct,
)

TOKEN_FILE = ROOT / "secrets" / "tiktok_token.json"
USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
INBOX_VIDEO = ROOT / "output" / "faceless" / "7_datos_que_no_sab_as.mp4"
DIRECT_VIDEO = ROOT / "output" / "faceless" / "7_datos_que_no_sab_as.mp4"
DEFAULT_TITLE = "Did you know? 5 facts in 60 seconds #facts #learnontiktok"


class _Tee:
    """Duplica stdout/stderr a demo_log.txt para poder diagnosticar una toma
    aunque la grabación pierda los últimos segundos."""

    def __init__(self, *streams):
        self.streams = streams

    def write(self, s):
        for st in self.streams:
            st.write(s)

    def flush(self):
        for st in self.streams:
            st.flush()


def banner(step: str, title: str) -> None:
    print()
    print("=" * 62)
    print(f"  {step}  {title}")
    print("=" * 62)


def _clipboard() -> str:
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", "Get-Clipboard -Raw"],
                           capture_output=True, text=True, timeout=10)
        return (r.stdout or "").strip()
    except Exception:
        return ""


def wait_code_from_clipboard(timeout_s: int = 300) -> str:
    """Espera a que el usuario toque 'Copy code' en el callback (lee el portapapeles).
    Así no hay que tipear nada en la consola durante la grabación."""
    print('Authorize the app, then click "Copy code" on the redirect page.')
    print("The demo picks the code up from the clipboard automatically...")
    initial = _clipboard()
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        clip = _clipboard()
        if clip and clip != initial and len(clip) > 40 and "\n" not in clip and " " not in clip:
            print("[OK] Authorization code received.")
            return clip
        time.sleep(1)
    raise SystemExit("No authorization code appeared in the clipboard.")


def wait_status(token: str, publish_id: str, done: str) -> None:
    """Consulta el status cada 5s hasta `done` o FAILED (máx ~3 min)."""
    print("(Polling every 5s - this can take a minute or two. No action needed.)")
    for _ in range(36):
        st = requests.post(STATUS_URL, headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
        }, json={"publish_id": publish_id}, timeout=60).json()
        status = st.get("data", {}).get("status")
        print(f"  status: {status}")
        if status == done:
            return
        if status and "FAILED" in status:
            print(f"  -> failed: {st.get('data')}")
            return
        time.sleep(5)


def main() -> None:
    print("TikTok Content Posting API - demo for app review")
    print("App: en60segundos-bot | Desktop CLI app (sandbox credentials)")
    print(f"Scopes requested: {SCOPES}")

    banner("STEP 1/7", "User authorizes the app (OAuth 2.0)")
    print("Opening the TikTok authorization page in the browser.")
    print("The account owner logs in and reviews the requested permissions.")
    time.sleep(3)
    # disable_auto_auth=1 fuerza la pantalla de consentimiento aunque la cuenta
    # ya haya autorizado antes (clave para que el demo muestre el botón Authorize)
    webbrowser.open(auth_url() + "&disable_auto_auth=1")

    banner("STEP 2/7", "Exchange the authorization code for an access token")
    code = wait_code_from_clipboard()
    r = requests.post(TOKEN_URL, data={
        "client_key": _env("TIKTOK_CLIENT_KEY"),
        "client_secret": _env("TIKTOK_CLIENT_SECRET"),
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": _env("TIKTOK_REDIRECT_URI"),
    }, headers={"Content-Type": "application/x-www-form-urlencoded"}, timeout=60)
    tok = r.json()
    if "access_token" not in tok:
        raise SystemExit(f"Token exchange failed: {tok}")
    tok["obtained_at"] = int(time.time())
    TOKEN_FILE.parent.mkdir(exist_ok=True)
    TOKEN_FILE.write_text(json.dumps(tok, indent=2), encoding="utf-8")
    token = tok["access_token"]
    print(f"[OK] Access token obtained (expires in {tok.get('expires_in')}s).")
    print(f"     Granted scopes: {tok.get('scope')}")

    banner("STEP 3/7", "user.info.basic - fetch the authorized user's profile")
    info = requests.get(USER_INFO_URL, params={"fields": "open_id,display_name"},
                        headers={"Authorization": f"Bearer {token}"}, timeout=60).json()
    user = info.get("data", {}).get("user", {})
    print(f"[OK] Authorized TikTok user: {user.get('display_name')} "
          f"(open_id {str(user.get('open_id', ''))[:8]}...)")

    banner("STEP 4/7", "video.upload - upload a video to the user's TikTok inbox")
    size = INBOX_VIDEO.stat().st_size
    print(f"Video: {INBOX_VIDEO.name} ({size / 1e6:.1f} MB)")
    init = requests.post(INBOX_INIT_URL, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
    }, json={"source_info": {
        "source": "FILE_UPLOAD",
        "video_size": size,
        "chunk_size": size,
        "total_chunk_count": 1,
    }}, timeout=60).json()
    if init.get("error", {}).get("code") not in (None, "ok"):
        raise SystemExit(f"Upload init failed: {init['error']}")
    publish_id = init["data"]["publish_id"]
    print(f"[OK] Upload initialized. publish_id: {publish_id}")
    print("Uploading the file...")
    with open(INBOX_VIDEO, "rb") as f:
        put = requests.put(init["data"]["upload_url"], headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        }, data=f.read(), timeout=300)
    if put.status_code not in (200, 201):
        raise SystemExit(f"Upload failed ({put.status_code}): {put.text[:300]}")
    print("[OK] File uploaded to TikTok.")

    banner("STEP 5/7", "Check the inbox upload status via the API")
    wait_status(token, publish_id, done="SEND_TO_USER_INBOX")
    print("  -> The video reached the user's TikTok inbox (drafts).")
    print("     The user finishes editing and publishing inside the TikTok app.")

    banner("STEP 6/7", "video.publish - direct post (creator info + post settings)")
    ci = creator_info()
    nickname = ci.get("creator_nickname")
    options = ci.get("privacy_level_options", [])
    print(f"Posting to TikTok account: @{nickname}")
    print(f"Max video duration allowed: {ci.get('max_video_post_duration_sec')}s")
    print(f"Privacy levels available for this account: {', '.join(options)}")
    privacy = "SELF_ONLY" if "SELF_ONLY" in options else options[0]
    print(f"Selected privacy level: {privacy}")
    print("(Unaudited/sandbox apps may only post privately; after the app is")
    print(" approved, the user can choose any of the levels listed above.)")
    title = DEFAULT_TITLE
    print(f"Video title: {title}")
    print(f"Video: {DIRECT_VIDEO.name} ({DIRECT_VIDEO.stat().st_size / 1e6:.1f} MB)")
    time.sleep(4)   # pausa para que el revisor lea las opciones en camara
    try:
        direct_id = publish_direct(DIRECT_VIDEO, title=title, privacy_level=privacy)
    except RuntimeError as e:
        if "unaudited_client_can_only_post_to_private_accounts" in str(e):
            print()
            print("[!] TikTok rejected the direct post: while the app is unaudited,")
            print("    direct posting only works if the TikTok ACCOUNT is private.")
            print("    Set the account to private (Settings > Privacy) and run again.")
            time.sleep(10)
            raise SystemExit(1)
        raise

    banner("STEP 7/7", "Check the direct post status via the API")
    wait_status(token, direct_id, done="PUBLISH_COMPLETE")
    print("  -> The video was published directly to the user's TikTok account.")
    print("     (Unaudited/sandbox apps post as private - visible only to the owner.)")

    print()
    print("[DONE] Demo complete: OAuth consent, user.info.basic, video.upload")
    print("(inbox/drafts) and video.publish (direct post) shown end to end.")
    print("\nThe screen recording stops in 10 seconds...")
    time.sleep(10)


if __name__ == "__main__":
    _log = open(ROOT / "demo_log.txt", "w", encoding="utf-8")
    sys.stdout = _Tee(sys.stdout, _log)
    sys.stderr = _Tee(sys.stderr, _log)
    main()
