# 🗺️ Roadmap del proyecto

## ✅ Hecho
- Motor de shorts (voz IA + imágenes + karaoke + gameplay + música), formato validado con audiencia
- Serie "Datos para parecer inteligente" pt.1–10
- Automatización 2/día (11:30 y 18:30): YouTube (público) + Instagram (público) + TikTok (borradores), sincronizadas
- Tokens con auto-renovación (YT, IG semanal, TikTok)
- Captions de TikTok listas (`captions_tiktok/`)

- **Fórmula viral APLICADA (2026-10-05)** — tandas 1 y 2 completas (ver
  docs/formula-faceless-viral.md): título sin voz (tarjeta visual), loudnorm -14 LUFS,
  Ken Burns + corte aleatorio, SFX por canal (pop/riser+corte de música/boom),
  pregunta binaria en pantalla, karaoke fuera de la UI (margin_v 700), rojo en
  misterios, 30 guiones sin "Seguime" + 11 aperturas in medias res. Verificado con
  3 videos reales (faceless pt.9, misterios ep.4, historia ep.4).

## 🔴 Canal 4 «¿Soy el Malo?» (historias de Reddit) — estado
- **Plan 1 — pipeline de guiones** ✅ (`reddit_pipeline/`): sourcing por Arctic Shift
  (sin cuenta de Reddit) + filtro `viral_score` + reescritura con LLM. Groq key en `.env`
  (`openai/gpt-oss-120b`), **validada y viva**. En la DB: 5 guiones reescritos (seq 1-5),
  105 filtered esperando. CLI: `python -m reddit_pipeline run 5` / `dump 5`.
- **Plan 2 — render** ✅: `render_reddit.py` + perfil `soyelmalo` en `config/channels.yaml`.
  3 videos de prueba aprobados en `output/soyelmalo/`.
- **Plan 3 — automatización** ✅ (2026-10-08): `soyelmalo` integrado a `daily_post.py`
  vía un adaptador `series_reddit.py` que imita la interfaz `series` pero leyendo las
  historias reescritas de `stories.sqlite`, numeradas por un `seq` estable (columna nueva
  en `reddit_pipeline/db.py`, migrada). Voz por historia (Jorge/Dalia según el narrador)
  con un cambio retrocompatible de 1 línea en `_ensure_video`. Entrada en
  `channels_registry.py` + `run_daily_soyelmalo.bat`. Verificado end-to-end: render de la
  parte 4 por el camino de producción se ve idéntico al formato aprobado (título naranja
  arriba, karaoke amarillo, pregunta abajo). Corre con guards: sin tokens, saltea las 3
  plataformas con gracia. 101 tests verdes.
- **Pendiente para salir en vivo:**
  - [ ] **Crear las cuentas** YT/IG/TikTok de «¿Soy el Malo?» + OAuth (como historia/misterios).
    Secretos esperados: `secrets/soyelmalo/{token.json,instagram.json,tiktok_token.json}`.
  - [ ] Registrar la schtask de `run_daily_soyelmalo.bat` (horario escalonado, p.ej. 14:30/21:30)
    recién cuando existan los tokens (con los cmdlets `New-ScheduledTaskAction`/`Set-ScheduledTask`,
    no `schtasks /tr`, por el bug de comillas del espacio en "yt short").
  - [ ] **Rotar la Groq key** (se pegó en un chat anterior) — seguridad; sigue funcionando.
  - [ ] Engordar el backlog: reescribir más de las 105 filtered (`python -m reddit_pipeline rewrite N`).
  - [ ] Sección en el link hub + branding visual final (avatar/banner ya hechos en Descargas).

## 🔜 Pendiente corto plazo
- [ ] **Tanda 3 de la fórmula (manual)**: (1) ~~gameplay propio~~ (el usuario no va a
  grabar) y ~~cuentas a Creador~~ (ya eran Creador de origen — el item solo aplicaba
  a cuentas Empresa); (2) ~~re-autorizar TikTok~~ HECHO 2026-10-05 (sandbox restaurado;
  producción sigue pendiente de auditoría — ver abajo); (3) bajar el pack de SFX de Pixabay (reemplazar sfx/pop|riser|boom.wav
  sintéticos) y 2-3 pistas CC por carpeta de music/phonk|dark_ambient|cinematic
  (ver music/README.md). El usuario NO va a grabar gameplay propio (2026-10-05):
  si el alcance de IG sigue nulo en ~3 semanas, considerar comprar/conseguir
  metraje propio de otra forma. bg_slime_2 ya reemplazado por slime real
  (yt-dlp "no copyright", crudo en backgrounds/slime_raw3.mp4; en Pixabay
  "slime" devuelve BABOSAS — no volver a usar esa query para videos).
- [ ] **App de TikTok: producción PENDIENTE de auditoría (al 2026-10-05)** — corrección:
  la nota anterior decía "APROBADA" pero NO lo está; producción sigue esperando la
  auditoría. El `.env` había quedado con el client_key de producción (`aw...`) y TikTok
  lo RECHAZA con error `client_key` hasta que pase la auditoría. Diagnóstico 2026-10-05:
  probado que no era scope ni redirect ni PKCE — es que el key de prod aún no está vivo.
  - **Corrido ahora (sandbox):** `.env` activo revertido a `TIKTOK_SANDBOX_*`; token
    restaurado desde `secrets/tiktok_token.sandbox.bak` y refrescado OK (vigente,
    auto-renovable ~1 año). `creator_info` responde con la cuenta @en60segundos.
    OJO: sandbox FUERZA los posteos a privados (no hay público automático hasta la
    auditoría); sirve el flujo de borradores (video al inbox → publicar a mano).
  - **Fix de código (2026-10-05):** `uploaders/tiktok_upload.py` ahora implementa PKCE
    (la app Desktop lo exige): `code_challenge` = SHA256 del verifier en HEX + `S256`,
    y `code_verifier` en el canje. Sin esto el OAuth daba error `code_challenge`.
    Tests en `tests/test_tiktok_oauth.py`.
  - **Cuando aprueben producción:** revertir `.env` a `TIKTOK_PROD_*`, re-autorizar
    (`python -m uploaders.tiktok_upload auth` — localhost + PKCE ya listo) con
    @en60segundos, y pasar `TT_PRIVACY` a `"PUBLIC_TO_EVERYONE"` en `daily_post.py`.
  Spec: docs/superpowers/specs/2026-10-04-tiktok-direct-post-design.md
- [ ] Activar canal Historia: canal de marca YT (verificación de Google YA aprobada)
  + OAuth + IG @historia.en60segundos + schtasks 12:30/19:30
- [x] **Pedido de cuota de YouTube ENVIADO (2026-10-04)** — 50.000 unidades/día de
  videos.insert para escalar a 8-10 canales. Machete y evidencia: `cuota_youtube_form.md`
  + PDFs en Descargas. Respuesta esperada por mail en días/semanas.
- [ ] Recargar backlog cuando queden <4 partes (faceless pt.11+; historia/misterios ep.11+)
- [ ] Al aprobarse la cuota: armar canal 4 "Mente en 60 Segundos" (receta de misterios)
  y diseñar pipeline de Historias de Reddit (fase 2)

## 📘 Facebook (declarado: se quiere sumar a la automatización)
La Página "En 60 Segundos" ya existe (hoy es solo el puente de la API de IG). Para postear
Reels en FB automáticamente falta:
1. Un **Page Access Token** de Facebook (no sirve el token de Instagram Login):
   permisos `pages_manage_posts` + `pages_show_list`, obtenible vía Facebook Login
   en la app de Meta o el Graph API Explorer.
2. Agregar `do_facebook` en `daily_post.py` usando la Graph API de la Página
   (subida de Reels a `/{page_id}/video_reels`), con contador y sincronización
   igual que IG/TikTok.

## 🚀 Escala multi-nicho (plan aprobado)
- Refactor multi-canal: registro de canales (`channels_registry`), secretos/estado por canal,
  voces/música/fondos distintos por canal, horarios escalonados
- Canal 2 **"Historia en 60 Segundos"** (historia narrada/episodio): EN MARCHA —
  registro multi-canal + `series_historia` (ep. 1-10) listos; horarios 12:30/19:30.
  Spec: docs/superpowers/specs/2026-10-01-canal2-historia-design.md
- Canal 3 **"Misterios en 60 Segundos"** (misterio narrado/episodio): EN MARCHA —
  series_misterios (ep. 1-10) + registro listos; horarios 13:30/20:30.
- Fase 2: **Historias de Reddit** (requiere pipeline de sourcing propio) y **Clips de streamers**.

### Nota de cuota YT
3 canales a 2 subidas/día ≈ 9.600 de 10.000 unidades diarias de la API (tope). Un 4to canal requiere 1/día, aumento de cuota o segundo proyecto Cloud.
