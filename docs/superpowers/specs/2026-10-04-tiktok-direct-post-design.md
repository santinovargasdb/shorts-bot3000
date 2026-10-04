# TikTok direct post con caption embebido — diseño

**Fecha:** 2026-10-04
**Estado:** aprobado por el usuario (brainstorming 2026-10-04)

## Contexto y problema

La app **en60segundos-bot** ya pasó la auditoría de TikTok. Hasta ahora
`daily_post.do_tiktok` subía el video a los *borradores* (inbox) con
`upload_draft`, y ese endpoint no acepta título ni caption: había que
escribirlo a mano en la app del teléfono al completar la publicación.

Con la app aprobada, `publish_direct` (ya existente en
`uploaders/tiktok_upload.py`) puede publicar en público con el título
embebido. Objetivo: eliminar el paso manual por completo.

## Decisiones tomadas

- **Flujo:** full-auto público (igual que YouTube hoy). Nada de semi-publicación.
- **Caption:** título del episodio + línea de hashtags. Sin el bloque SEO
  estilo YouTube (queda spammy visible bajo el video).
- **Primer run de ensayo:** con `TT_PRIVACY = "SELF_ONLY"` para verificar
  caption y flujo sin publicar; recién después se cambia a
  `PUBLIC_TO_EVERYONE`.
- Fuente del caption: el `.json` hermano del mp4 (tiene `title`,
  `description` y `hashtags`), sin tocar los módulos de serie.

## Cambios en `daily_post.py`

1. **Config** arriba del archivo, análoga a `YT_PRIVACY`:
   `TT_PRIVACY = "SELF_ONLY"` al momento de mergear (ensayo); se pasa a
   `"PUBLIC_TO_EVERYONE"` tras validar el primer run.
2. **Helper `_tt_caption(video: Path) -> str`:**
   - Lee el `.json` hermano del mp4.
   - Caption = `title` + línea en blanco + línea de hashtags.
   - La línea de hashtags se extrae de `description`: la primera línea cuyo
     texto (strip) empieza con `#`. No usar "la última línea": el crédito de
     música puede venir después de los hashtags.
   - Sin línea de hashtags → título solo. Sin `.json` → stem del archivo.
3. **`do_tiktok` migra de `upload_draft` a `publish_direct`:**
   - Antes de subir llama `creator_info()` y verifica que `TT_PRIVACY` esté
     en `privacy_level_options`.
   - Si NO está (ej. la cuenta quedó en privado): loguea el motivo y cae al
     flujo actual de borradores (`upload_draft`) para no perder el día.
   - Si está OK: `publish_direct(video, title=_tt_caption(video),
     privacy_level=TT_PRIVACY)`.
4. **Poll de estado post-subida:** `fetch_status(publish_id)` cada ~5 s hasta
   ~90 s, solo para loguear `PUBLISH_COMPLETE` o el error. El avance de
   `next_part` NO depende del poll: avanza apenas la subida sale bien
   (comportamiento optimista actual, sin cambiar la semántica del estado).

## Lo que NO cambia

- La sincronización "YouTube publica primero" (`part >= yt next_part` → espera).
- El formato de `automation_state.json` y `_save_state`.
- `uploaders/tiktok_upload.py` (ya tiene `publish_direct`, `creator_info`,
  `fetch_status`).
- El token global `secrets/tiktok_token.json`.

## Manejo de errores

- Cualquier excepción en init/upload → log `⚠️` y `return` sin avanzar el
  contador; reintenta al día siguiente (igual que hoy).
- Fallback a borradores SOLO en el caso de privacidad no disponible en
  `creator_info`.
- Poll de estado: si a los ~90 s sigue `PROCESSING`, loguear el `publish_id`
  y seguir; si reporta `FAILED`, loguearlo (el contador ya avanzó: mismo
  trade-off que hoy con los borradores, un fallo de moderación no bloquea la
  serie).

## Testing

- Test unitario de `_tt_caption` en `tests/` (estilo
  `test_daily_post_state.py`): con hashtags, con crédito de música después de
  los hashtags, sin línea de hashtags, sin `.json`.
- Ensayo real: `python daily_post.py --only tt` con `TT_PRIVACY="SELF_ONLY"`
  → verificar en la app que el video quede privado CON el caption correcto →
  borrar el video de prueba, retroceder `next_part` de tiktok en
  `automation_state.json` y cambiar a `PUBLIC_TO_EVERYONE`.

## Addendum de implementación (2026-10-04)

Al implementar se descubrió que el `.env` seguía con las credenciales sandbox
activas y el token de `secrets/` pertenecía a la app sandbox, así que "Lo que
NO cambia" quedó parcialmente desactualizado:

- `uploaders/tiktok_upload.py` SÍ cambió: se agregó `auth_local()` (OAuth con
  servidor en `http://localhost:PUERTO/callback/`, abre el navegador y canjea
  el code solo — la app de producción Desktop lo exige), `_parse_callback()`
  con validación de state, y `auth_url`/`exchange_code` aceptan
  `redirect_uri`/`state` opcionales. El flujo manual quedó como `auth-manual`.
- `.env`: `TIKTOK_CLIENT_KEY/SECRET` ahora apuntan a la app de producción;
  las sandbox quedaron respaldadas como `TIKTOK_SANDBOX_*`.
- `secrets/tiktok_token.json` (sandbox) se archivó como
  `tiktok_token.sandbox.bak`: hasta re-autorizar, `do_tiktok` saltea con
  "No configurado (sin token)" en vez de fallar con un token ajeno.
- Paso manual previo al ensayo: `python -m uploaders.tiktok_upload auth`
  logueándose con @en60segundos.

## Fuera de alcance (futuro)

- TikTok para historia/misterios: requiere cuenta TikTok propia por canal y
  `tt_token` por canal en `channels_registry` (hoy solo `faceless` tiene
  `"tt"`).
- Actualizar ROADMAP.md marcando la migración a direct post como hecha (se
  hace en la implementación).
