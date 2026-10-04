# 🗺️ Roadmap del proyecto

## ✅ Hecho
- Motor de shorts (voz IA + imágenes + karaoke + gameplay + música), formato validado con audiencia
- Serie "Datos para parecer inteligente" pt.1–10
- Automatización 2/día (11:30 y 18:30): YouTube (público) + Instagram (público) + TikTok (borradores), sincronizadas
- Tokens con auto-renovación (YT, IG semanal, TikTok)
- Captions de TikTok listas (`captions_tiktok/`)

## 🔜 Pendiente corto plazo
- [x] **App de TikTok APROBADA (2026-10-04)** — hecho: `daily_post.do_tiktok` migrado
  de `upload_draft` a `publish_direct` con caption embebido (título + hashtags) y
  fallback a borradores si la privacidad no está disponible; OAuth de producción con
  servidor localhost (`python -m uploaders.tiktok_upload auth`); `.env` activo con
  credenciales de producción (sandbox respaldada como `TIKTOK_SANDBOX_*`; token viejo
  en `secrets/tiktok_token.sandbox.bak`). Spec: docs/superpowers/specs/2026-10-04-tiktok-direct-post-design.md
  → **Queda (manual)**: (1) re-autorizar: `python -m uploaders.tiktok_upload auth`
  con la cuenta @en60segundos; (2) validar el run de ensayo (`TT_PRIVACY="SELF_ONLY"`:
  video privado con caption OK → borrarlo y retroceder `next_part` de tiktok en
  `automation_state.json`); (3) pasar `TT_PRIVACY` a `"PUBLIC_TO_EVERYONE"` en
  `daily_post.py` = full-auto.
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
