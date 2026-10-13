# Respuesta al pedido de YouTube API Services review

Responder **al mismo hilo** del mail de `youtube-disputes+...@google.com`.
Reemplazá lo que está `<ENTRE CORCHETES>` antes de enviar.

---

**Subject:** Re: YouTube API Services review — Project 927702472633

Hello,

Thank you for the review. Please find the requested information below.

**1) Script / screencast showing how the YouTube API is used to upload videos**

My tool is a single-user desktop script that runs locally on my own computer and
uploads my own finished videos to my own channels using the YouTube Data API v3
(`videos.insert`). There are no third-party users, it manages no other accounts,
and it does not read, store or process any YouTube user data.

The exact code that performs the upload (Python, YouTube Data API v3 client):

```python
service = build("youtube", "v3", credentials=creds)   # OAuth 2.0, scope: youtube.upload
body = {
    "snippet": {"title": title, "description": description,
                "tags": tags, "categoryId": "24"},
    "status": {"privacyStatus": privacy, "selfDeclaredMadeForKids": False},
}
media = MediaFileUpload(path, chunksize=-1, resumable=True, mimetype="video/mp4")
request = service.videos().insert(part="snippet,status", body=body, media_body=media)
response = request.execute()   # videos.insert — the only endpoint the tool calls
```

`videos.insert` is the only YouTube API endpoint the tool uses.

**End result:** I just ran this script and it uploaded a test video to my channel
via `videos.insert`. Console output:

    [1/3] Authenticating with OAuth 2.0 (channel owner's token)...
          OK. Only scope used: youtube.upload
    [2/3] Calling youtube.videos().insert(part='snippet,status') ...
          OK: the video was created by the API (videos.insert).
    [3/3] FINAL RESULT:
          Video ID   : 2US9KaLsz54
          Channel    : En 60 Segundos
          Channel ID : UC-EHSEAXCIjX6-6PHPUuO2w
          Video URL  : https://www.youtube.com/watch?v=2US9KaLsz54

The resulting video is live on my channel (set to unlisted for this demo):
**https://www.youtube.com/watch?v=2US9KaLsz54** — channel **En 60 Segundos**
(https://www.youtube.com/channel/UC-EHSEAXCIjX6-6PHPUuO2w). A screen recording of
the same flow is available on request.

**2) All YouTube channels where the videos are uploaded**

- En 60 Segundos — https://www.youtube.com/@En60Segundos.47
- Historia en 60 Segundos — https://www.youtube.com/@Historia.En60Segundos
- Misterios en 60 Segundos — https://www.youtube.com/@misterioen60.s

All three channels are owned and operated by me. Every upload goes only to these
channels, using OAuth tokens I authorized myself for my own account.

**3) How many videos are uploaded per day**

Currently **6 videos per day**: 2 videos per channel per day, across the 3
channels above (= 6 `videos.insert` calls/day). The quota increase request is to
support scaling this same single-user setup to 8–10 of my own channels at 2
uploads each (~16–20 videos/day).

Please let me know if you need anything else.

Best regards,
Santino Vargas
Project number: 927702472633

---

## Estado: la prueba YA está hecha (no necesitás grabar)

Corrí `yt_api_demo.py` y subió el video de demo vía `videos.insert`. La salida de
consola y la URL en vivo (punto 1 de arriba) son el "end result" que pide YouTube.
El mail queda listo: solo poné tu nombre real y enviá (respondé al mismo hilo).

- Video de demo (unlisted): https://www.youtube.com/watch?v=2US9KaLsz54
- ⚠️ **NO lo borres hasta que YouTube termine la review.** Recién ahí, borralo.

### Opcional: si además querés un video de pantalla
Puedo generar `grabar_demo_youtube.bat` (mismo método que el de TikTok): lo
doble-clickeás, graba la pantalla mientras corre la subida, y guarda
`yt_api_review_demo.mp4`. **No hace falta para aprobar** — el script + los
resultados ya alcanzan.
