"""Demo para la revisión de la app de TikTok — flujo OAuth 2.0 + Content Posting API.

Lanzarlo con grabar_demo_tiktok.bat (graba la pantalla durante todo el recorrido
y genera tiktok_review_demo.mp4 para el formulario "Submit for review").
La salida está en inglés porque la ven los revisores de TikTok.
"""
from __future__ import annotations

import json
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
)

TOKEN_FILE = ROOT / "secrets" / "tiktok_token.json"
USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
DEFAULT_VIDEO = ROOT / "output" / "faceless" / "datos_para_parecer_inteligente_pt_1.mp4"


def banner(step: str, title: str) -> None:
    print()
    print("=" * 62)
    print(f"  {step}  {title}")
    print("=" * 62)


def main() -> None:
    video = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_VIDEO

    print("TikTok Content Posting API - demo for app review")
    print("App: en60segundos-bot | Desktop CLI app (sandbox credentials)")
    print(f"Scopes requested: {SCOPES}")

    banner("STEP 1/5", "User authorizes the app (OAuth 2.0)")
    print("Opening the TikTok authorization page in the browser.")
    print("The account owner logs in and reviews the requested permissions.")
    time.sleep(3)
    webbrowser.open(auth_url())

    banner("STEP 2/5", "Exchange the authorization code for an access token")
    code = input("Paste the authorization code shown on the redirect page: ").strip()
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

    banner("STEP 3/5", "user.info.basic - fetch the authorized user's profile")
    info = requests.get(USER_INFO_URL, params={"fields": "open_id,display_name"},
                        headers={"Authorization": f"Bearer {token}"}, timeout=60).json()
    user = info.get("data", {}).get("user", {})
    print(f"[OK] Authorized TikTok user: {user.get('display_name')} "
          f"(open_id {str(user.get('open_id', ''))[:8]}...)")

    banner("STEP 4/5", "video.upload - upload a video to the user's TikTok inbox")
    size = video.stat().st_size
    print(f"Video: {video.name} ({size / 1e6:.1f} MB)")
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
    with open(video, "rb") as f:
        put = requests.put(init["data"]["upload_url"], headers={
            "Content-Type": "video/mp4",
            "Content-Range": f"bytes 0-{size - 1}/{size}",
        }, data=f.read(), timeout=300)
    if put.status_code not in (200, 201):
        raise SystemExit(f"Upload failed ({put.status_code}): {put.text[:300]}")
    print("[OK] File uploaded to TikTok.")

    banner("STEP 5/5", "Check the publish status via the API")
    for _ in range(10):
        st = requests.post(STATUS_URL, headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
        }, json={"publish_id": publish_id}, timeout=60).json()
        status = st.get("data", {}).get("status")
        print(f"  status: {status}")
        if status == "SEND_TO_USER_INBOX":
            break
        time.sleep(3)

    print()
    print("[DONE] The video is now in the user's TikTok inbox notifications.")
    print("The account owner opens the TikTok app, taps the notification and")
    print("finishes publishing inside TikTok's own editor (user stays in control).")
    input("\nPress ENTER to stop the screen recording...")


if __name__ == "__main__":
    main()
