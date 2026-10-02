# Pedido de aumento de cuota — YouTube Data API v3

Formulario oficial: **https://support.google.com/youtube/contact/yt_api_form**
("YouTube API Services - Audit and Quota Extension Form")
Completarlo logueado con **nofaceshortvids@gmail.com**.

## Dato previo que te va a pedir: el NÚMERO de proyecto

[console.cloud.google.com](https://console.cloud.google.com) → proyecto
`project-f5bb7e33-...` → en el panel principal ("Cloud overview") aparece
**Project number** (es numérico, distinto del ID). Copialo antes de empezar.

## Respuestas por campo (los nombres pueden variar un poco)

| Campo | Respuesta |
|---|---|
| Contact email | nofaceshortvids@gmail.com |
| Individual or organization | Individual developer |
| API Client name | En 60 Segundos uploader (shorts-bot3000) |
| Project number | (el numérico del console) |
| Link to client / website | https://santinovargasdb.github.io/shorts-bot3000/ |
| APIs/endpoints used | YouTube Data API v3 — videos.insert (uploads only) |
| Current daily quota | 10,000 units |
| Requested daily quota | 20,000 units |

**Use case description:**
```
Personal desktop automation tool that uploads my own original short
educational videos (Spanish-language "60 seconds" series) to my own three
YouTube channels (one Google account, brand channels). The tool generates
the videos locally (AI voice-over, captions, licensed footage) and uploads
2 videos per day per channel via videos.insert using OAuth tokens for my
own channels only. No third-party users, no data collection: the only API
usage is uploading my own content to my own channels.
```

**Why the increase:**
```
Each upload costs ~1,600 units. With 3 channels x 2 daily uploads the
project consumes ~9,600 of the 10,000 daily units, leaving no headroom and
blocking planned growth to 4-5 channels (~16,000 units/day). Requesting
20,000 units/day to cover current usage plus planned channels with a
safety margin.
```

**Compliance (si pregunta por datos de usuarios / ToS):**
```
Single-user tool: only the developer authorizes it. It does not access,
store or process any other user's data. It complies with the YouTube API
Services Terms of Service; tokens are stored locally on the developer's
machine.
```

Si piden un **screencast/demo del cliente**: avisarle a Claude — tenemos el
kit de grabación del demo de TikTok adaptable en minutos.

Respuesta típica del equipo de YouTube: días a ~2 semanas, por mail.
