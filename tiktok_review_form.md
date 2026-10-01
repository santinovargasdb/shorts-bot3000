# Formulario "Submit for review" de TikTok — textos listos para pegar

App: **en60segundos-bot** en developers.tiktok.com (app de producción, no el sandbox).
Ir a la app → completar los campos → Submit for review.

## Datos generales

| Campo | Valor |
|---|---|
| App icon | `C:\Users\accsoc\Downloads\icono_tiktok_1024_fix.png` |
| Category | Utilities (o Productivity si no aparece) |
| Platform | Desktop |
| Terms of Service URL | https://santinovargasdb.github.io/shorts-bot3000/terms.html |
| Privacy Policy URL | https://santinovargasdb.github.io/shorts-bot3000/privacy.html |
| Web/Redirect URI | https://santinovargasdb.github.io/shorts-bot3000/callback.html |
| Products | Login Kit + Content Posting API (con Direct Post) |
| Demo video | `tiktok_review_demo.mp4` (la toma 7) |

## App description

> Desktop automation tool used by the owner of the @en60segundos TikTok account
> to schedule and publish the channel's own original short educational videos
> (the Spanish-language "facts in 60 seconds" series). The app runs locally on
> the creator's computer, generates the videos (AI voice-over, captions and
> licensed background footage), and posts them to the creator's own TikTok
> account through the Content Posting API. It is a single-user tool: it only
> ever manages the account of the person who authorizes it via Login Kit.

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
