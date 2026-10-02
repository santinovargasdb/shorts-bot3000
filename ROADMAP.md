# 🗺️ Roadmap del proyecto

## ✅ Hecho
- Motor de shorts (voz IA + imágenes + karaoke + gameplay + música), formato validado con audiencia
- Serie "Datos para parecer inteligente" pt.1–10
- Automatización 2/día (11:30 y 18:30): YouTube (público) + Instagram (público) + TikTok (borradores), sincronizadas
- Tokens con auto-renovación (YT, IG semanal, TikTok)
- Captions de TikTok listas (`captions_tiktok/`)

## 🔜 Pendiente corto plazo
- [x] **Demo video de TikTok ENVIADO A REVISIÓN (2026-10-02)** — demo de 118s con el
  flujo completo (consentimiento OAuth, user.info, inbox upload → SEND_TO_USER_INBOX,
  direct post → PUBLISH_COMPLETE). Kit: `grabar_demo_tiktok.bat` + textos en
  `tiktok_review_form.md`.
  → **Al llegar la aprobación**: (1) `.env` a credenciales `TIKTOK_PROD_*`; (2) adaptar
  el OAuth a redirect localhost (la app de producción registra `http://localhost:*/callback/`
  para Desktop — servidor local tipo YouTube, sin copiar códigos); (3) re-autorizar;
  (4) migrar `daily_post.do_tiktok` de `upload_draft` a `publish_direct` = full-auto.
- [ ] Activar canal Historia: canal de marca YT (verificación de Google YA aprobada)
  + OAuth + IG @historia.en60segundos + schtasks 12:30/19:30
- [ ] Recargar backlog cuando queden <4 partes (faceless pt.11+; historia/misterios ep.11+)

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
