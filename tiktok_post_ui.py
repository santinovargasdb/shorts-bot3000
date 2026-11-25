"""Pantalla "Post to TikTok" (web local) — auditoría de Direct Post de la Content Posting API.

Implementa la UX que exigen las Content Sharing Guidelines de TikTok
(https://developers.tiktok.com/doc/content-sharing-guidelines): cuenta destino a la
vista, vista previa, título editable, privacidad SIN valor por defecto, interacciones
destildadas, divulgación de contenido comercial, declaración de consentimiento y
estado del post después de publicar. La interfaz está en inglés porque la ven los
revisores de TikTok; la consola habla en español.

Uso:
  python tiktok_post_ui.py                      # abre la pantalla (canal faceless)
  python tiktok_post_ui.py --channel historia   # otro canal
  python tiktok_post_ui.py --ensayo             # SIMULADO: no toca TikTok (para practicar)
  python tiktok_post_ui.py --record             # graba la pantalla -> tiktok_audit_demo.mp4

Para grabar el video de la auditoría usar grabar_auditoria_tiktok.bat.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import secrets as pysecrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse

import uploaders.tiktok_upload as tt
from channels_registry import get_channel

ROOT = Path(__file__).resolve().parent
LOG_FILE = ROOT / "tiktok_post_ui.log"
RAW_FILE = ROOT / "tiktok_audit_raw.mkv"
OUT_FILE = ROOT / "tiktok_audit_demo.mp4"
MAX_MB = 50                     # tope del formulario de TikTok por archivo
MAX_RECORD_S = 20 * 60          # corte de seguridad de la grabación
TITLE_MAX = 2200                # límite de la API, en unidades UTF-16

PRIVACY_LABELS = {
    "PUBLIC_TO_EVERYONE": "Everyone",
    "FOLLOWER_OF_CREATOR": "Followers",
    "MUTUAL_FOLLOW_FRIENDS": "Friends",
    "SELF_ONLY": "Only me",
}

# Errores de TikTok -> mensaje claro en pantalla (inglés, lo ve el revisor)
_ERRORES = {
    "unaudited_client_can_only_post_to_private_accounts":
        "This app is pending TikTok's audit, so for now it can only post to private "
        "accounts. Set your TikTok account to private and try again.",
    "spam_risk_too_many_posts":
        "You have reached TikTok's daily posting limit for this account. Please try again later.",
    "spam_risk_user_banned_from_posting":
        "TikTok does not allow this account to post right now. Please try again later.",
    "reached_active_user_cap":
        "The daily limit of accounts that can post through this app was reached. "
        "Please try again later.",
    "privacy_level_option_mismatch":
        "The selected privacy option is no longer available for this account. "
        "Reload the page and choose again.",
    "access_token_invalid":
        "Your TikTok connection expired. Go back and connect your TikTok account again.",
    "scope_not_authorized":
        "This account has not granted permission to post. Connect your TikTok account again.",
}
_NO_PUEDE_POSTEAR = ("spam_risk_too_many_posts", "spam_risk_user_banned_from_posting",
                     "reached_active_user_cap")

# Estado del proceso (un solo usuario local)
S: dict = {
    "channel": "faceless", "token_file": tt.TOKEN_FILE, "videos_dir": ROOT / "output" / "faceless",
    "port": 8765, "mock": False, "record": False, "csrf": pysecrets.token_urlsafe(24),
    "oauth": {}, "job": None, "finished": threading.Event(), "lock": threading.Lock(),
}


def log(msg: str) -> None:
    line = f"[{datetime.now():%H:%M:%S}] {msg}"
    try:
        print(line, flush=True)
    except Exception:
        pass
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


# ------------------------------------------------------------------ lógica pura
def friendly_error(exc: object) -> str:
    """Traduce un error de la API de TikTok a un mensaje entendible en pantalla."""
    texto = str(exc)
    for code, msg in _ERRORES.items():
        if code in texto:
            return msg
    return f"TikTok could not complete the request. Details: {texto[:300]}"


def cannot_post_now(exc: object) -> bool:
    return any(code in str(exc) for code in _NO_PUEDE_POSTEAR)


def _utf16_len(s: str) -> int:
    return len(s.encode("utf-16-le")) // 2


def validate_post(payload: dict, ci: dict, duration: float | None) -> dict:
    """Valida lo que eligió el usuario contra creator_info y devuelve los kwargs de
    publish_direct. Repite del lado servidor las reglas de la pantalla, así un post
    inválido nunca llega a TikTok. Lanza ValueError con el mensaje a mostrar."""
    title = str(payload.get("title") or "").strip()
    if _utf16_len(title) > TITLE_MAX:
        raise ValueError(f"The title is too long (max {TITLE_MAX} characters).")
    privacy = payload.get("privacy")
    if not privacy:
        raise ValueError("Select who can view this video.")
    if privacy not in ci.get("privacy_level_options", []):
        raise ValueError("The selected privacy option is not available for this account.")
    commercial = bool(payload.get("commercial"))
    your_brand = commercial and bool(payload.get("your_brand"))
    branded = commercial and bool(payload.get("branded"))
    if commercial and not (your_brand or branded):
        raise ValueError("You need to indicate if your content promotes yourself, "
                         "a third party, or both.")
    if branded and privacy == "SELF_ONLY":
        raise ValueError("Branded content visibility cannot be set to private.")
    max_s = ci.get("max_video_post_duration_sec")
    if duration and max_s and duration > max_s:
        raise ValueError(f"This video is {duration:.0f}s long, but this account can post "
                         f"videos of up to {max_s}s.")
    # Una interacción deshabilitada en la cuenta nunca se puede prender desde acá
    allow_comment = bool(payload.get("comment")) and not ci.get("comment_disabled")
    allow_duet = bool(payload.get("duet")) and not ci.get("duet_disabled")
    allow_stitch = bool(payload.get("stitch")) and not ci.get("stitch_disabled")
    return {
        "title": title,
        "privacy_level": privacy,
        "disable_comment": not allow_comment,
        "disable_duet": not allow_duet,
        "disable_stitch": not allow_stitch,
        "brand_organic_toggle": your_brand,
        "brand_content_toggle": branded,
    }


def looks_public(ci: dict) -> bool:
    """Una cuenta pública ofrece PUBLIC_TO_EVERYONE; una privada, FOLLOWER_OF_CREATOR."""
    return "PUBLIC_TO_EVERYONE" in ci.get("privacy_level_options", [])


# ------------------------------------------------------------------ videos
def list_videos(limit: int = 12) -> list[Path]:
    d = S["videos_dir"]
    if not d.exists():
        return []
    vids = sorted(d.glob("*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    return vids[:limit]


def video_path(name: str) -> Path | None:
    """Resuelve un nombre de video SOLO dentro de la carpeta del canal."""
    p = S["videos_dir"] / Path(name).name
    return p if p.suffix.lower() == ".mp4" and p.exists() else None


def video_caption(video: Path) -> str:
    """Mismo caption que arma el posteo diario (título + hashtags), editable en pantalla."""
    meta = video.with_suffix(".json")
    if not meta.exists():
        return video.stem
    try:
        data = json.loads(meta.read_text(encoding="utf-8"))
    except Exception:
        return video.stem
    title = data.get("title", video.stem)
    hashtags = next((ln.strip() for ln in data.get("description", "").splitlines()
                     if ln.strip().startswith("#")), "")
    hashtags = " ".join(t for t in hashtags.split() if t.lower() != "#shorts")  # es de YouTube
    return f"{title}\n\n{hashtags}" if hashtags else title


def video_duration(video: Path) -> float | None:
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nw=1:nk=1", str(video)],
                           capture_output=True, text=True, timeout=30)
        return float(r.stdout.strip())
    except Exception:
        return None


# ------------------------------------------------------------------ TikTok (real o ensayo)
_MOCK_CI = {
    "creator_nickname": "En 60 Segundos (rehearsal)", "creator_username": "rehearsal",
    "privacy_level_options": ["FOLLOWER_OF_CREATOR", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"],
    "comment_disabled": False, "duet_disabled": False, "stitch_disabled": True,
    "max_video_post_duration_sec": 600,
}


def get_creator_info() -> dict:
    if S["mock"]:
        return dict(_MOCK_CI)
    return tt.creator_info(token_file=S["token_file"])


def _run_publish(job: dict, video: Path, kwargs: dict) -> None:
    try:
        if S["mock"]:
            time.sleep(4)
            job["publish_id"] = "rehearsal-0000"
            job["mock_t0"] = time.time()
        else:
            job["publish_id"] = tt.publish_direct(video, token_file=S["token_file"], **kwargs)
        job["phase"] = "processing"
        log(f"Video subido a TikTok. publish_id={job['publish_id']}")
    except Exception as e:
        job["phase"] = "failed"
        job["error"] = friendly_error(e)
        log(f"FALLO el post: {e}")
        # App sin auditar: además de cuenta privada, TikTok exige visibilidad "Only me".
        # El error de TikTok es el mismo en los dos casos, así que se aclara acá.
        if ("unaudited_client" in str(e) and kwargs.get("privacy_level") != "SELF_ONLY"):
            job["error"] = ("While this app is pending TikTok's audit, videos can only be posted "
                            "with \"Only me\" visibility. Go back, select \"Only me\" and try again.")
            log('>>> Elegiste otra privacidad. Mientras la app no esté auditada hay que elegir '
                '"Only me" en "Who can view this video". Volvé a intentar con esa opción.')


def poll_job(job: dict) -> dict:
    """Estado del post para la pantalla. Consulta a TikTok mientras procesa."""
    if job["phase"] == "processing":
        try:
            if S["mock"]:
                data = {"status": "PUBLISH_COMPLETE" if time.time() - job["mock_t0"] > 6
                        else "PROCESSING_UPLOAD"}
            else:
                data = tt.fetch_status(job["publish_id"], token_file=S["token_file"]).get("data", {})
            status = data.get("status")
            job["status"] = status
            if status == "PUBLISH_COMPLETE":
                job["phase"] = "done"
                log("PUBLISH_COMPLETE: el video quedó publicado.")
            elif status and "FAILED" in status:
                job["phase"] = "failed"
                job["error"] = friendly_error(data.get("fail_reason") or status)
                log(f"TikTok reportó {status}: {data.get('fail_reason')}")
        except Exception as e:        # un fallo de red al consultar no es un fallo del post
            log(f"(status) no se pudo consultar, reintento: {e}")
    return {k: job.get(k) for k in ("phase", "status", "error", "publish_id")}


def finish_oauth(code: str) -> None:
    """Canjea el code y guarda el token SOLO si es de la misma cuenta que ya tenía el
    canal: si el navegador estaba logueado en otra cuenta, no pisa el token bueno."""
    final = S["token_file"]
    tmp = final.with_name(final.stem + ".nuevo.json")
    o = S["oauth"]
    data = tt.exchange_code(code, redirect_uri=o["redirect"], code_verifier=o["verifier"],
                            token_file=tmp)
    try:
        if final.exists():
            previo = json.loads(final.read_text(encoding="utf-8")).get("open_id")
            if previo and data.get("open_id") and previo != data["open_id"]:
                raise RuntimeError("wrong_account")
        os.replace(tmp, final)
    finally:
        if tmp.exists():
            tmp.unlink()


# ------------------------------------------------------------------ HTML
_CSS = """
*{box-sizing:border-box}
body{margin:0;font-family:"Segoe UI",system-ui,sans-serif;background:#f4f5f7;color:#161823;font-size:16px;line-height:1.45}
header{background:#fff;border-bottom:1px solid #e3e5ea;padding:14px 28px;display:flex;align-items:center;gap:12px}
.logo{width:34px;height:34px;border-radius:9px;background:#161823;color:#fff;display:grid;place-items:center;font-weight:700;font-size:15px}
.brand{font-weight:700;font-size:18px}
.sub{color:#6b6f7b;font-size:14px;margin-left:auto}
main{max-width:1020px;margin:28px auto;padding:0 20px}
h1{font-size:24px;margin:0 0 6px}
.lead{color:#555a66;margin:0 0 22px}
.card{background:#fff;border:1px solid #e3e5ea;border-radius:14px;padding:22px}
.center{max-width:520px;margin:60px auto;text-align:center}
.btn{display:inline-block;border:0;border-radius:10px;padding:12px 22px;font-size:16px;font-weight:600;cursor:pointer;text-decoration:none;background:#fe2c55;color:#fff}
.btn:hover{background:#e62a4d}
.btn[disabled]{background:#c9ccd3;cursor:not-allowed}
.btn.sec{background:#eef0f3;color:#161823}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}
.vid{background:#fff;border:1px solid #e3e5ea;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px}
.vid video{width:100%;aspect-ratio:9/16;border-radius:10px;background:#000;object-fit:cover}
.vid .t{font-size:14px;font-weight:600;min-height:40px}
.cols{display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:start}
.cols video{width:100%;border-radius:12px;background:#000}
label.f{display:block;font-weight:600;margin:18px 0 6px}
textarea,select{width:100%;font:inherit;padding:10px 12px;border:1px solid #cfd2d9;border-radius:10px;background:#fff}
textarea{min-height:110px;resize:vertical}
.hint{color:#6b6f7b;font-size:13px;margin-top:4px}
.acct{display:flex;align-items:center;gap:12px;background:#f4f5f7;border-radius:12px;padding:12px 14px}
.acct img,.acct .av{width:42px;height:42px;border-radius:50%;background:#161823;color:#fff;display:grid;place-items:center;font-weight:700}
.acct b{display:block}
.acct span{color:#6b6f7b;font-size:14px}
.chk{display:flex;align-items:center;gap:9px;margin:8px 0}
.chk input{width:18px;height:18px}
.chk.off{color:#a3a7b0}
.row{display:flex;gap:22px;flex-wrap:wrap}
.sw{display:flex;align-items:center;justify-content:space-between;gap:16px}
.box{border:1px solid #e3e5ea;border-radius:12px;padding:14px 16px;margin-top:8px}
.note{background:#eef6ff;border:1px solid #c9e0fb;border-radius:10px;padding:10px 12px;font-size:14px;margin-top:10px}
.warn{background:#fff4e5;border:1px solid #ffd9a0}
.err{background:#ffecee;border:1px solid #f7b9c1}
.ok{background:#e9f9ef;border:1px solid #aee3c0}
.consent{font-size:14px;color:#3d414c;margin:22px 0 12px}
a{color:#0b6bcb}
.steps{list-style:none;padding:0;margin:18px 0}
.steps li{padding:10px 0 10px 34px;position:relative;color:#8a8e99}
.steps li:before{content:"";position:absolute;left:6px;top:14px;width:14px;height:14px;border-radius:50%;border:2px solid #c9ccd3;background:#fff}
.steps li.on{color:#161823;font-weight:600}
.steps li.on:before{border-color:#fe2c55}
.steps li.done{color:#161823}
.steps li.done:before{border-color:#1faa59;background:#1faa59}
.banner{background:#ffd400;color:#161823;text-align:center;font-weight:700;padding:8px}
[hidden]{display:none!important}
"""


def page(title: str, body: str, script: str = "") -> bytes:
    banner = ('<div class="banner">REHEARSAL MODE — simulated, nothing is sent to TikTok</div>'
              if S["mock"] else "")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} · En 60 Segundos</title><style>{_CSS}</style></head>
<body>{banner}
<header><div class="logo">60</div><div class="brand">En 60 Segundos</div>
<div class="sub">Publishing tool for short-form video creators</div></header>
<main>{body}</main>
<script>{script}</script></body></html>""".encode("utf-8")


def page_home() -> bytes:
    extra = ""
    if not S["record"] and (S["mock"] or S["token_file"].exists()):
        extra = '<p style="margin-top:16px"><a href="/videos">Continue with the connected account</a></p>'
    return page("Connect", f"""
<div class="card center">
  <h1>Connect your TikTok account</h1>
  <p class="lead">En 60 Segundos publishes your own videos to your TikTok account.
  You will be asked to authorize the app on TikTok. You choose the caption, who can
  view each video and its interaction settings before anything is posted.</p>
  <a class="btn" href="/connect">Continue with TikTok</a>
  {extra}
</div>""")


def page_message(title: str, msg: str, kind: str = "err", back: str = "/",
                 back_label: str = "Go back") -> bytes:
    return page(title, f"""
<div class="card center">
  <h1>{html.escape(title)}</h1>
  <div class="note {kind}" style="text-align:left">{html.escape(msg)}</div>
  <p style="margin-top:20px"><a class="btn sec" href="{back}">{html.escape(back_label)}</a></p>
</div>""")


def page_videos() -> bytes:
    cards = []
    for v in list_videos():
        titulo = video_caption(v).splitlines()[0]
        q = quote(v.name)
        cards.append(f"""<div class="vid">
  <video src="/media/{q}#t=1" preload="metadata" muted></video>
  <div class="t">{html.escape(titulo)}</div>
  <a class="btn" href="/post?v={q}">Post to TikTok</a></div>""")
    cuerpo = ('<div class="grid">' + "".join(cards) + "</div>") if cards else \
        '<div class="note warn">There are no videos ready to post yet.</div>'
    return page("Your videos", f"""
<h1>Your videos</h1>
<p class="lead">Choose a video to post to your TikTok account.</p>{cuerpo}""")


def page_post(video: Path, ci: dict, duration: float | None) -> bytes:
    cfg = {
        "csrf": S["csrf"], "video": video.name, "ci": ci, "labels": PRIVACY_LABELS,
        "duration": duration, "titleMax": TITLE_MAX,
    }
    nick = ci.get("creator_nickname") or ci.get("creator_username") or "TikTok account"
    user = ci.get("creator_username")
    avatar = ci.get("creator_avatar_url")
    av = (f'<img src="{html.escape(avatar)}" alt="">' if avatar
          else f'<div class="av">{html.escape(nick[:1].upper())}</div>')
    body = f"""
<div id="form">
<h1>Post to TikTok</h1>
<p class="lead">Review your video and choose your settings. Nothing is sent to TikTok until you press Post.</p>
<div class="cols">
  <div><video src="/media/{quote(video.name)}#t=1" controls preload="metadata"></video>
    <div class="hint">Preview of the video that will be posted.</div></div>
  <div class="card">
    <div class="acct">{av}<div><span>Posting to</span><b>{html.escape(nick)}</b>
      {f'<span>@{html.escape(user)}</span>' if user else ''}</div></div>
    <div id="durErr" class="note err" hidden></div>

    <label class="f" for="title">Title</label>
    <textarea id="title" maxlength="{TITLE_MAX}">{html.escape(video_caption(video))}</textarea>
    <div class="hint"><span id="count"></span> · You can edit the title and hashtags.</div>

    <label class="f" for="privacy">Who can view this video</label>
    <select id="privacy"><option value="" selected disabled>Select an option</option></select>
    <div id="privNote" class="note warn" hidden>Branded content visibility cannot be set to private.</div>

    <label class="f">Allow users to</label>
    <div class="row">
      <label class="chk" id="lc"><input type="checkbox" id="comment"> Comment</label>
      <label class="chk" id="ld"><input type="checkbox" id="duet"> Duet</label>
      <label class="chk" id="ls"><input type="checkbox" id="stitch"> Stitch</label>
    </div>
    <div id="intNote" class="hint" hidden>Greyed-out options are turned off in your TikTok account settings.</div>

    <label class="f">Disclose video content</label>
    <div class="box">
      <div class="sw"><div>Turn on to disclose that this video promotes goods or services
        in exchange for something of value. Your video could promote yourself, a third
        party, or both.</div>
        <label class="chk"><input type="checkbox" id="commercial"></label></div>
      <div id="comOpts" hidden>
        <label class="chk"><input type="checkbox" id="your_brand"> <span><b>Your brand</b> — you are
          promoting yourself or your own business.</span></label>
        <label class="chk" id="lb"><input type="checkbox" id="branded"> <span><b>Branded content</b> — you
          are promoting another brand or a third party.</span></label>
        <div id="comLabel" class="note" hidden></div>
      </div>
    </div>

    <p class="consent" id="consent"></p>
    <div id="formErr" class="note err" hidden></div>
    <button class="btn" id="post" disabled>Post to TikTok</button>
    <a class="btn sec" href="/videos">Cancel</a>
  </div>
</div>
</div>

<div id="result" class="card" style="max-width:620px;margin:0 auto" hidden>
  <h1 id="resTitle">Posting your video…</h1>
  <div class="note">After publishing, it may take a few minutes for the content to
    process and be visible on your TikTok profile.</div>
  <ul class="steps">
    <li id="s1" class="on">Uploading your video to TikTok</li>
    <li id="s2">TikTok is processing your video</li>
    <li id="s3">Published to your TikTok account</li>
  </ul>
  <div id="resMsg" class="note" hidden></div>
  <div id="resBtns" hidden><a class="btn" href="/videos">Post another video</a>
    <button class="btn sec" id="finish">Done</button></div>
</div>"""
    script = "const CFG=" + json.dumps(cfg).replace("</", "<\\/") + ";" + _POST_JS
    return page("Post to TikTok", body, script)


_POST_JS = r"""
const $=id=>document.getElementById(id), ci=CFG.ci;
const MUSIC='<a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank">Music Usage Confirmation</a>';
const BC='<a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank">Branded Content Policy</a>';
// Privacidad: opciones de creator_info, sin valor por defecto
for(const o of ci.privacy_level_options||[]){
  const e=document.createElement('option'); e.value=o; e.textContent=CFG.labels[o]||o; $('privacy').appendChild(e);
}
// Interacciones: destildadas; grises si la cuenta las tiene apagadas
let anyOff=false;
for(const [k,l] of [['comment','lc'],['duet','ld'],['stitch','ls']]){
  if(ci[k+'_disabled']){ $(k).disabled=true; $(l).classList.add('off');
    $(l).title='Turned off in your TikTok account settings'; anyOff=true; }
}
$('intNote').hidden=!anyOff;
let blocked=false;
if(CFG.duration && ci.max_video_post_duration_sec && CFG.duration>ci.max_video_post_duration_sec){
  blocked=true; $('durErr').hidden=false;
  $('durErr').textContent='This video is '+Math.round(CFG.duration)+'s long, but this account can post videos of up to '+ci.max_video_post_duration_sec+'s.';
}
function refresh(){
  $('count').textContent=$('title').value.length+' / '+CFG.titleMax;
  const com=$('commercial').checked, yb=com&&$('your_brand').checked, br=com&&$('branded').checked;
  $('comOpts').hidden=!com;
  // Contenido de marca no puede ser privado: se bloquea "Only me" (y viceversa)
  const self=[...$('privacy').options].find(o=>o.value==='SELF_ONLY');
  if(br && $('privacy').value==='SELF_ONLY'){ $('privacy').value=''; $('privNote').hidden=false; }
  if(!br) $('privNote').hidden=true;
  if(self){ self.disabled=br; self.title=br?'Branded content visibility cannot be set to private.':''; }
  const lab=$('comLabel');
  if(br){ lab.hidden=false; lab.textContent="Your video will be labeled as 'Paid partnership'"; }
  else if(yb){ lab.hidden=false; lab.textContent="Your video will be labeled as 'Promotional content'"; }
  else lab.hidden=true;
  $('consent').innerHTML = br ? "By posting, you agree to TikTok's "+BC+" and "+MUSIC+"."
                              : "By posting, you agree to TikTok's "+MUSIC+".";
  const needOpt=com&&!yb&&!br, needPriv=!$('privacy').value;
  $('post').disabled=blocked||needOpt||needPriv;
  $('post').title=needOpt?'You need to indicate if your content promotes yourself, a third party, or both.'
                 :(needPriv?'Select who can view this video.':'');
}
for(const id of ['title','privacy','commercial','your_brand','branded']) $(id).addEventListener('input',refresh);
refresh();

async function api(path,body){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF':CFG.csrf},body:JSON.stringify(body||{})});
  return r.json();
}
function step(n,failed){
  for(let i=1;i<=3;i++){ $('s'+i).className = i<n?'done':(i===n?(failed?'':'on'):''); }
}
function end(ok,msg){
  $('resMsg').hidden=false; $('resMsg').className='note '+(ok?'ok':'err'); $('resMsg').textContent=msg;
  $('resBtns').hidden=false;
}
async function poll(){
  let j;
  try{ j=await (await fetch('/api/status')).json(); }catch(e){ setTimeout(poll,3000); return; }
  if(j.phase==='uploading') step(1);
  else if(j.phase==='processing') step(2);
  else if(j.phase==='done'){ step(4); $('resTitle').textContent='Your video was posted';
    end(true,'Published to your TikTok account. It may take a few minutes to be visible on your profile.'); return; }
  else if(j.phase==='failed'){ $('resTitle').textContent='The video could not be posted';
    end(false,j.error||'TikTok could not publish this video.'); return; }
  setTimeout(poll,3000);
}
$('post').addEventListener('click',async()=>{
  $('post').disabled=true; $('formErr').hidden=true;
  const j=await api('/api/publish',{video:CFG.video,title:$('title').value,privacy:$('privacy').value,
    comment:$('comment').checked,duet:$('duet').checked,stitch:$('stitch').checked,
    commercial:$('commercial').checked,your_brand:$('your_brand').checked,branded:$('branded').checked});
  if(j.error){ $('formErr').hidden=false; $('formErr').textContent=j.error; refresh(); return; }
  $('form').hidden=true; $('result').hidden=false; window.scrollTo(0,0); poll();
});
$('finish').addEventListener('click',async()=>{
  await api('/api/finish'); $('resBtns').innerHTML='<div class="hint">All done. You can close this tab.</div>';
});
"""


# ------------------------------------------------------------------ servidor
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, body: bytes, status: int = 200, ctype: str = "text/html; charset=utf-8") -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj: dict, status: int = 200) -> None:
        self._send(json.dumps(obj).encode("utf-8"), status, "application/json; charset=utf-8")

    def _redirect(self, url: str) -> None:
        self.send_response(302)
        self.send_header("Location", url)
        self.end_headers()

    def _media(self, name: str) -> None:
        p = video_path(name)
        if not p:
            self._send(b"not found", 404, "text/plain")
            return
        size = p.stat().st_size
        start, end, status = 0, size - 1, 200
        rng = self.headers.get("Range", "")
        if rng.startswith("bytes="):
            a, _, b = rng[6:].split(",")[0].partition("-")
            try:
                if a:
                    start, end = int(a), (int(b) if b else size - 1)
                elif b:
                    start = max(0, size - int(b))
                end = min(end, size - 1)
                if start > end:
                    raise ValueError
                status = 206
            except ValueError:
                start, end, status = 0, size - 1, 200
        self.send_response(status)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        try:
            with open(p, "rb") as f:
                f.seek(start)
                left = end - start + 1
                while left > 0:
                    chunk = f.read(min(262144, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (ConnectionError, OSError):
            pass        # el navegador corta la descarga al saltar en el video: normal

    def do_GET(self):
        try:
            self._get()
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as e:
            log(f"ERROR en {self.path}: {e!r}")
            try:
                self._send(page_message("Something went wrong", friendly_error(e)), 500)
            except Exception:
                pass

    def _get(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        if u.path == "/":
            self._send(page_home())
        elif u.path == "/connect":
            if S["mock"]:
                self._redirect("/videos")
                return
            verifier = tt._pkce_verifier()
            state = pysecrets.token_urlsafe(16)
            redirect = f"http://localhost:{S['port']}/callback/"
            S["oauth"] = {"verifier": verifier, "state": state, "redirect": redirect}
            # disable_auto_auth=1: muestra siempre la pantalla de permisos de TikTok
            url = tt.auth_url(redirect_uri=redirect, state=state,
                              code_challenge=tt._pkce_challenge(verifier)) + "&disable_auto_auth=1"
            log("Abriendo la pantalla de autorización de TikTok...")
            self._redirect(url)
        elif u.path.startswith("/callback"):
            o = S["oauth"]
            if not o:
                self._send(page_message("Connection expired", "Please start the connection again."))
                return
            try:
                code = tt._parse_callback(self.path, o["state"])
                finish_oauth(code)
            except Exception as e:
                if "wrong_account" in str(e):
                    log("OJO: autorizaste con OTRA cuenta de TikTok. No se guardó nada. "
                        "Reintentá y tocá 'Cambiar de cuenta' en la pantalla de TikTok.")
                    msg = ("You authorized a different TikTok account than the one linked to "
                           "this channel. Nothing was changed. Try again and use \"Switch "
                           "account\" on the TikTok screen.")
                else:
                    log(f"Falló la conexión con TikTok: {e}")
                    msg = friendly_error(e)
                self._send(page_message("Could not connect your account", msg,
                                        back_label="Try again"))
                return
            S["oauth"] = {}
            log("Cuenta de TikTok conectada OK.")
            self._redirect("/videos")
        elif u.path == "/videos":
            self._send(page_videos())
        elif u.path == "/post":
            v = video_path(q.get("v", [""])[0])
            if not v:
                self._send(page_message("Video not found", "Choose a video from your library.",
                                        back="/videos"), 404)
                return
            try:
                ci = get_creator_info()
            except Exception as e:
                log(f"creator_info falló: {e}")
                titulo = "You can't post right now" if cannot_post_now(e) else "Could not load your TikTok account"
                self._send(page_message(titulo, friendly_error(e), back="/videos"))
                return
            self._send(page_post(v, ci, video_duration(v)))
        elif u.path.startswith("/media/"):
            from urllib.parse import unquote
            self._media(unquote(u.path[len("/media/"):]))
        elif u.path == "/api/status":
            job = S["job"]
            self._json(poll_job(job) if job else {"phase": "none"})
        else:
            self._send(b"not found", 404, "text/plain")

    def do_POST(self):
        try:
            if self.headers.get("X-CSRF") != S["csrf"]:
                self._json({"error": "Session expired. Reload the page."}, 403)
                return
            n = int(self.headers.get("Content-Length") or 0)
            payload = json.loads(self.rfile.read(n) or b"{}") if n else {}
            path = urlparse(self.path).path
            if path == "/api/publish":
                self._publish(payload)
            elif path == "/api/finish":
                self._json({"ok": True})
                S["finished"].set()
            else:
                self._json({"error": "not found"}, 404)
        except (ConnectionError, BrokenPipeError):
            pass
        except Exception as e:
            log(f"ERROR en {self.path}: {e!r}")
            self._json({"error": friendly_error(e)}, 500)

    def _publish(self, payload: dict) -> None:
        video = video_path(str(payload.get("video") or ""))
        if not video:
            self._json({"error": "Video not found. Go back and choose it again."})
            return
        with S["lock"]:
            job = S["job"]
            if job and job["phase"] in ("uploading", "processing"):
                self._json({"error": "Another video is still being posted. Please wait."})
                return
            try:
                # creator_info FRESCO justo antes de publicar (lo piden las guidelines)
                ci = get_creator_info()
                kwargs = validate_post(payload, ci, video_duration(video))
            except ValueError as e:
                self._json({"error": str(e)})
                return
            except Exception as e:
                log(f"creator_info falló al publicar: {e}")
                self._json({"error": friendly_error(e)})
                return
            job = {"phase": "uploading", "status": None, "error": None, "publish_id": None}
            S["job"] = job
        log(f"Publicando {video.name} | privacidad={kwargs['privacy_level']} "
            f"comentarios={'si' if not kwargs['disable_comment'] else 'no'}")
        threading.Thread(target=_run_publish, args=(job, video, kwargs), daemon=True).start()
        self._json({"ok": True})


# ------------------------------------------------------------------ grabación
class Recorder:
    """Graba el escritorio con ffmpeg (gdigrab). Graba a .mkv (sobrevive a un corte)
    y al terminar lo convierte a un .mp4 chico para el formulario."""

    def __init__(self) -> None:
        self.proc: subprocess.Popen | None = None
        self.errlog = None

    @staticmethod
    def kill_orphans() -> None:
        """Mata grabadores que quedaron vivos de una corrida anterior (pasa si se cierra
        la ventana con la X en vez de tocar Done): siguen grabando y traban el archivo."""
        ps = ("Get-CimInstance Win32_Process -Filter \"Name='ffmpeg.exe'\" | "
              f"Where-Object {{ $_.CommandLine -like '*{RAW_FILE.name}*' }} | "
              "ForEach-Object { Stop-Process -Id $_.ProcessId -Force; $_.ProcessId }")
        try:
            r = subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                               capture_output=True, text=True, timeout=30)
            if r.stdout.strip():
                print("  (Había una grabación anterior colgada; la cerré.)")
                time.sleep(1.5)
        except Exception:
            pass

    def _on_console_close(self) -> None:
        """Si cierran la ventana con la X, frena ffmpeg antes de morir."""
        try:
            import ctypes

            def handler(_event):
                if self.proc and self.proc.poll() is None:
                    self.proc.kill()
                return False        # seguir con el cierre normal
            self._handler = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_uint)(handler)
            ctypes.windll.kernel32.SetConsoleCtrlHandler(self._handler, True)
        except Exception:
            pass

    def start(self) -> None:
        self.kill_orphans()
        self._on_console_close()
        for _ in range(5):          # Windows tarda un toque en soltar el archivo
            try:
                RAW_FILE.unlink(missing_ok=True)
                break
            except PermissionError:
                time.sleep(1)
        else:
            raise RuntimeError(f"No puedo borrar {RAW_FILE.name}: otro programa lo tiene abierto "
                               "(¿un reproductor de video?). Cerralo y probá de nuevo.")
        self.errlog = open(ROOT / "rec_ffmpeg.log", "w", encoding="utf-8")
        self.proc = subprocess.Popen(
            ["ffmpeg", "-y", "-f", "gdigrab", "-rtbufsize", "256M", "-framerate", "15",
             "-draw_mouse", "1", "-i", "desktop", "-c:v", "libx264", "-preset", "ultrafast",
             "-crf", "24", "-pix_fmt", "yuv420p", str(RAW_FILE)],
            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=self.errlog,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        time.sleep(2.5)
        if self.proc.poll() is not None:
            raise RuntimeError("ffmpeg no pudo empezar a grabar (mirá rec_ffmpeg.log).")

    def stop(self) -> None:
        if not self.proc:
            return
        try:
            if self.proc.poll() is None:
                self.proc.stdin.write(b"q")
                self.proc.stdin.flush()
                self.proc.wait(timeout=20)
        except Exception:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=10)
            except Exception:
                self.proc.kill()
        finally:
            if self.errlog:
                self.errlog.close()

    @staticmethod
    def convert() -> Path | None:
        """mkv -> mp4 <= 50 MB. Prueba calidades de mayor a menor hasta que entre."""
        if not RAW_FILE.exists() or RAW_FILE.stat().st_size < 10000:
            return None
        for ancho, crf in ((1280, 28), (1280, 34), (960, 38)):
            r = subprocess.run(
                ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(RAW_FILE),
                 "-vf", f"scale='min({ancho},iw)':-2", "-r", "15", "-c:v", "libx264",
                 "-preset", "veryfast", "-crf", str(crf), "-pix_fmt", "yuv420p", "-an",
                 "-movflags", "+faststart", str(OUT_FILE)],
                capture_output=True, text=True)
            if r.returncode != 0:
                log(f"ffmpeg falló al convertir: {r.stderr[-300:]}")
                return None
            if OUT_FILE.stat().st_size <= MAX_MB * 1024 * 1024:
                RAW_FILE.unlink()
                return OUT_FILE
        return OUT_FILE     # quedó >50 MB aun en la calidad más baja; se avisa afuera


# ------------------------------------------------------------------ chequeos previos
def preflight() -> bool:
    """Revisa todo ANTES de abrir la pantalla/grabar. Devuelve False si hay un bloqueo."""
    ok = True

    def bien(m):
        print(f"  [OK]   {m}")

    def mal(m):
        nonlocal ok
        ok = False
        print(f"  [FALTA] {m}")

    print("\nChequeos previos:")
    with socket.socket() as s:
        try:
            s.bind(("127.0.0.1", S["port"]))
            bien(f"Puerto {S['port']} libre")
        except OSError:
            mal(f"El puerto {S['port']} está ocupado (¿quedó otra ventana de esto abierta? cerrala).")
    vids = list_videos()
    if vids:
        bien(f"{len(vids)} videos listos en {S['videos_dir'].relative_to(ROOT)}")
    else:
        mal(f"No hay videos .mp4 en {S['videos_dir']}")
    if S["record"]:
        if shutil.which("ffmpeg"):
            bien("ffmpeg disponible para grabar")
        else:
            mal("No encuentro ffmpeg en el PATH (hace falta para grabar).")
    if S["mock"]:
        print("  [ENSAYO] modo simulado: no se consulta TikTok.")
        return ok
    try:
        key = tt._env("TIKTOK_CLIENT_KEY")
        tt._env("TIKTOK_CLIENT_SECRET")
        if key.startswith("sb"):
            mal("El .env tiene las credenciales de SANDBOX (client key 'sb...'). "
                "Para la auditoría tienen que ser las de producción ('aw...').")
        else:
            bien("Credenciales de producción en .env")
    except Exception as e:
        mal(str(e))
        return ok
    if not S["token_file"].exists():
        print("  [AVISO] Este canal todavía no tiene token: se crea al conectar la cuenta.")
        return ok
    try:
        ci = tt.creator_info(token_file=S["token_file"])
        bien(f"Cuenta conectada: {ci.get('creator_nickname')} (@{ci.get('creator_username')})")
        if looks_public(ci):
            mal("La cuenta de TikTok está PÚBLICA. Mientras la app no esté auditada, TikTok "
                "rechaza el post. Pasala a PRIVADA: app de TikTok > Perfil > menú > "
                "Configuración y privacidad > Privacidad > Cuenta privada. Después volvé a correr esto.")
        else:
            bien("La cuenta está en privado (requisito mientras la app no esté auditada)")
        max_s = ci.get("max_video_post_duration_sec")
        d = video_duration(vids[0]) if vids else None
        if d and max_s and d > max_s:
            mal(f"El video más nuevo dura {d:.0f}s y la cuenta admite hasta {max_s}s.")
    except Exception as e:
        if cannot_post_now(e):
            mal(f"TikTok no deja postear ahora con esta cuenta (límite diario). Probá mañana. [{e}]")
        else:
            print(f"  [AVISO] No pude consultar la cuenta ({e}). Al conectar de nuevo en la "
                  "pantalla se renueva el permiso.")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description='Pantalla "Post to TikTok" para la auditoría de Direct Post.')
    ap.add_argument("--channel", default="faceless")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--record", action="store_true", help="graba la pantalla durante el recorrido")
    ap.add_argument("--ensayo", action="store_true", help="simulado: no envía nada a TikTok")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    if a.record and a.ensayo:
        print("No se puede grabar en modo ensayo: el video de la auditoría tiene que ser el flujo REAL.")
        return 2

    ctx = get_channel(a.channel)
    S.update(channel=a.channel, port=a.port, mock=a.ensayo, record=a.record,
             token_file=(ROOT / ctx["tt_token"]) if ctx.get("tt_token") else tt.TOKEN_FILE,
             videos_dir=ROOT / "output" / a.channel)
    print(f'Pantalla "Post to TikTok" — canal {a.channel} ({ctx["display"]})'
          + ("  [ENSAYO]" if a.ensayo else ""))
    if not preflight():
        print("\nHay cosas para resolver arriba ([FALTA]). No se abrió ni se grabó nada.")
        return 1

    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://localhost:{a.port}/"
    rec = Recorder() if a.record else None
    try:
        if rec:
            print("\nEmpieza la grabación de pantalla en 3 segundos (cerrá lo que no quieras que se vea)...")
            time.sleep(3)
            try:
                rec.start()
            except RuntimeError as e:
                print(f"\nNo se pudo empezar a grabar: {e}")
                srv.shutdown()
                return 1
        print(f"\nAbriendo {url}\nSeguí los pasos en el navegador. Al final tocá el botón \"Done\".")
        if not a.ensayo:
            print('IMPORTANTE: en "Who can view this video" elegí "Only me" (con la app sin '
                  "auditar, TikTok rechaza cualquier otra opción).")
        print("(Para cortar antes: Ctrl+C en esta ventana.)\n")
        if not a.no_browser:
            webbrowser.open(url)
        S["finished"].wait(timeout=MAX_RECORD_S if rec else None)
        if rec and not S["finished"].is_set():
            print("Pasaron 20 minutos: corto la grabación por seguridad.")
        time.sleep(3)       # que la grabación llegue a mostrar la pantalla final
    except KeyboardInterrupt:
        print("\nCortado a mano.")
    finally:
        if rec:
            rec.stop()
        srv.shutdown()

    job = S["job"] or {}
    if rec:
        print("\nConvirtiendo la grabación a mp4...")
        out = rec.convert()
        if not out:
            print(f"No pude convertir la grabación. El original quedó en {RAW_FILE.name} (no lo borres).")
            return 1
        mb = out.stat().st_size / 1e6
        print(f"Video listo: {out}  ({mb:.1f} MB)")
        if mb > MAX_MB:
            print(f"OJO: pesa más de {MAX_MB} MB y el formulario no lo va a aceptar. Avisame y lo achicamos.")
        if job.get("phase") != "done":
            print("OJO: la grabación terminó SIN un post publicado (PUBLISH_COMPLETE). "
                  "Ese video no sirve para la auditoría: hay que repetir la toma.")
            return 1
    if job.get("phase") == "done" and not S["mock"]:
        print("\nAcordate después:")
        print("  1. Borrá de TikTok el video de prueba que quedó publicado (privado).")
        print("  2. Volvé a poner la cuenta en PÚBLICO.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
