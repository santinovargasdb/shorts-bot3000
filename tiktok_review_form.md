# Formulario "Submit for review" de TikTok — textos listos para pegar

App en developers.tiktok.com (app de producción, no el sandbox).
Ir a la app → completar los campos → Submit for review.

## Por qué lo rechazaron (27-oct-2026) — 3ª devolución y qué cambiamos

Rebotó por el **riesgo residual** que ya estaba anotado: el nombre de la app
("En 60 Segundos") no coincidía con la URL del sitio (`…/shorts-bot3000/`).

> App name — "must be clearly displayed on the website and must match the website
> title, website URL and desktop URL."

**FIX (Opción B, bajo riesgo — NO se renombró el repo de código):** se creó un
repo **solo-web** aparte, `santinovargasdb/en60segundos`, con copia del sitio
(home + privacy + terms + links), servido en
**https://santinovargasdb.github.io/en60segundos/**. Ahí apuntan Website / Terms /
Privacy. El **Redirect URI se deja en `shorts-bot3000`** (ya verificado) → no hay
que re-verificar propiedad de URL ni re-autorizar YouTube/TikTok/IG. Solo se mudan
las URLs "de vitrina" que mira el reviewer, y ahora matchean el nombre.

> Por qué NO se renombró el repo principal: `shorts-bot3000` hostea el código de
> TODOS los canales (no solo En 60 Segundos) y su `docs/` sirve el callback OAuth
> de los 3 canales; renombrarlo rompía los redirect URIs de Google/TikTok/Meta.

## Por qué lo rechazaron (20-oct-2026) — 2ª devolución y qué cambiamos

El reviewer rechazó por TRES puntos, todos del sitio (no de los scopes):

1. **Website URL** — "must lead to an externally facing fully developed website
   and should not be a landing page or login page." → Casi seguro visitó el
   **Redirect URI** (`callback.html`, que es la pantalla de OAuth/login) tomándolo
   como el sitio, o el campo **Website URL** de la app estaba vacío/apuntando ahí.
   **FIX:** en la app (Basic Information) poner **Website URL = el homepage**
   (`https://santinovargasdb.github.io/shorts-bot3000/`), NO el callback. Además
   el homepage ahora es un sitio desarrollado (nav, funciones, cómo funciona,
   plataformas, FAQ, contacto) y no una landing pelada.
2. **Terms of Service insuficientes.** → `terms.html` reescrito COMPLETO: 14
   secciones (aceptación, servicio, elegibilidad, autorización OAuth,
   responsabilidades, uso aceptable, PI, plataformas de terceros, garantías,
   limitación de responsabilidad, indemnidad, terminación, cambios, ley/contacto),
   bilingüe ES+EN.
3. **Privacy Policy insuficiente.** → `privacy.html` reescrito COMPLETO: 12
   secciones (datos que trata, uso, dónde se guardan, terceros, retención,
   derechos/revocar, YouTube API, menores, seguridad, cambios, contacto, ley),
   bilingüe ES+EN.

> ⚠️ El **Redirect URI** SÍ debe seguir siendo `callback.html` (es el callback de
> OAuth, no el sitio). Lo que cambia es que el campo **Website URL** debe apuntar
> al homepage. Son dos campos distintos: no confundirlos.

## Por qué lo rechazaron (13-oct-2026) y qué cambiamos

El reviewer rechazó por dos motivos:
1. **"Apps para uso personal o interno NO son elegibles."** → Reposicionamos todo
   (sitio + esta descripción) como **producto para creadores**, sin lenguaje de
   "personal / privado / single-user / uso interno".
2. **El nombre de la app debe verse en el sitio y coincidir con el título del
   sitio y la URL.** → El nombre de la app pasa a **`En 60 Segundos`** y el sitio
   ahora se titula "En 60 Segundos" y lo muestra en el header.

> ⚠️ Riesgo residual (camino gratis): la URL sigue siendo
> `santinovargasdb.github.io/shorts-bot3000/`, que no matchea 100% con el nombre
> "En 60 Segundos". Si vuelve a rebotar por ese punto, **Fase 2**: renombrar el
> repo a `en60segundos` (→ `.../en60segundos/`) — hacerlo DESPUÉS de que YouTube
> apruebe, porque el form de YT apunta a las URLs actuales.

## Datos generales

| Campo | Valor |
|---|---|
| **App name** | **`En 60 Segundos`** (debe coincidir con el título del sitio) |
| App icon | `C:\Users\accsoc\Downloads\icono_tiktok_1024_fix.png` |
| Category | Utilities (o Productivity si no aparece) |
| Platform | Desktop |
| **Website URL** | **https://santinovargasdb.github.io/shorts-bot3000/** (el homepage/index — NO el callback) |
| Terms of Service URL | https://santinovargasdb.github.io/shorts-bot3000/terms.html |
| Privacy Policy URL | https://santinovargasdb.github.io/shorts-bot3000/privacy.html |
| Web/Redirect URI | https://santinovargasdb.github.io/shorts-bot3000/callback.html (callback de OAuth, distinto del Website URL) |
| Products | Login Kit + Content Posting API (con Direct Post) |
| Demo video | `tiktok_review_demo.mp4` (la toma 7) |

## App description (campo corto — MÁX 120 caracteres)

> En 60 Segundos helps creators schedule and auto-publish their own short videos to their connected TikTok account.

(113 caracteres. El framing largo "para creadores" va en las justificaciones por
scope de más abajo, que no tienen ese límite.)

## Justificación por scope (campo "How will your app use this scope?")

### user.info.basic

> After the OAuth flow, the app calls /v2/user/info/ once to display the
> authorized account's display name and open_id in the console, so the user can
> confirm the correct TikTok account is connected before any content is posted.

### video.upload

> The app uploads locally generated videos to the authorized user's TikTok
> inbox (Content Posting API inbox upload, FILE_UPLOAD). The user then reviews,
> edits and completes the post inside the TikTok app, keeping full editorial
> control of what gets published on their account.

### video.publish

> The app publishes the scheduled video of the day directly to the authorized
> user's own account. Before each post it queries
> /v2/post/publish/creator_info/query/ and applies the user's configured
> choices: title, a privacy level taken from the returned
> privacy_level_options, and comment/duet/stitch settings. This enables
> hands-free scheduled publishing of the creator's own original content; the
> app never posts to any account other than the one that authorized it.

## Nota para el demo video (si hay campo de comentarios para el revisor)

> The demo shows the full flow end to end: OAuth consent screen, token
> exchange, user info fetch (user.info.basic), an inbox upload reaching
> SEND_TO_USER_INBOX (video.upload), and a direct post reaching
> PUBLISH_COMPLETE (video.publish). The direct post is made with privacy level
> SELF_ONLY against a private account, as required for unaudited clients.

## Checklist del día del envío

- [ ] Cuenta @en60segundos en PRIVADO antes de grabar (requisito de direct post sin auditar)
- [ ] Cupo de inbox libre (máx 5 pendientes/24h; se liberan 24h después de cada subida)
- [ ] Grabar con `grabar_demo_tiktok.bat` → verificar `demo_log.txt` termina en [DONE]
- [ ] Completar formulario con estos textos → Submit for review
- [ ] Volver la cuenta a público + borrar posts privados de prueba y borradores
- [ ] Al aprobarse: `.env` → credenciales TIKTOK_PROD_*, re-autorizar, y migrar
      `daily_post.do_tiktok` de `upload_draft` a `publish_direct` (full-auto)
