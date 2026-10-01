"""Demo para la revisión de la app de TikTok — OAuth 2.0 + Content Posting API.

Lanzarlo con grabar_demo_tiktok.bat (graba la pantalla durante todo el recorrido
y genera tiktok_review_demo.mp4 para el formulario "Submit for review").
La salida está en inglés porque la ven los revisores de TikTok.

Demuestra los 3 scopes: user.info.basic, video.upload (borradores/inbox)
y video.publish (publicación directa con creator_info + elección de privacidad).
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
    creator_info,
    publish_direct,
)

TOKEN_FILE = ROOT / "secrets" / "tiktok_token.json"
USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/"
INBOX_VIDEO = ROOT / "output" / "faceless" / "datos_para_parecer_inteligente_pt_1.mp4"
DIRECT_VIDEO = ROOT / "output" / "faceless" / "7_datos_que_no_sab_as.mp4"
DEFAULT_TITLE = "Did you know? 5 facts in 60 seconds #facts #learnontiktok"


def banner(step: str, title: str) -> None:
    print()
    print("=" * 62)
    print(f"  {step}  {title}")
    print("=" * 62)


def wait_status(token: str, publish_id: str, done: str) -> None:
    """Consulta el status cada 5s hasta `done` o FAILED (máx ~3 min)."""
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

    banner("STEP 6/7", "video.publish - direct post (creator info + user choices)")
    ci = creator_info()
    nickname = ci.get("creator_nickname")
    options = ci.get("privacy_level_options", [])
    print(f"Posting to TikTok account: @{nickname}")
    print(f"Max video duration allowed: {ci.get('max_video_post_duration_sec')}s")
    title = input(f"Video title [{DEFAULT_TITLE}]: ").strip() or DEFAULT_TITLE
    print("Available privacy levels for this account:")
    for i, opt in enumerate(options, 1):
        print(f"  {i}. {opt}")
    choice = input(f"Choose privacy level [1-{len(options)}]: ").strip()
    privacy = options[int(choice) - 1] if choice.isdigit() and 0 < int(choice) <= len(options) else options[0]
    comments = input("Allow comments? [Y/n]: ").strip().lower() != "n"
    print(f"Posting '{title}' as {privacy} (comments {'on' if comments else 'off'})...")
    print(f"Video: {DIRECT_VIDEO.name} ({DIRECT_VIDEO.stat().st_size / 1e6:.1f} MB)")
    direct_id = publish_direct(DIRECT_VIDEO, title=title, privacy_level=privacy,
                               disable_comment=not comments)

    banner("STEP 7/7", "Check the direct post status via the API")
    wait_status(token, direct_id, done="PUBLISH_COMPLETE")
    print("  -> The video was published directly to the user's TikTok account.")
    print("     (Unaudited/sandbox apps post as private - visible only to the owner.)")

    print()
    print("[DONE] Demo complete: OAuth consent, user.info.basic, video.upload")
    print("(inbox/drafts) and video.publish (direct post) shown end to end.")
    input("\nPress ENTER to stop the screen recording...")


if __name__ == "__main__":
    main()
