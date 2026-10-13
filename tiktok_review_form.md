# Formulario "Submit for review" de TikTok — textos listos para pegar

App en developers.tiktok.com (app de producción, no el sandbox).
Ir a la app → completar los campos → Submit for review.

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
| Terms of Service URL | https://santinovargasdb.github.io/shorts-bot3000/terms.html |
| Privacy Policy URL | https://santinovargasdb.github.io/shorts-bot3000/privacy.html |
| Web/Redirect URI | https://santinovargasdb.github.io/shorts-bot3000/callback.html |
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
