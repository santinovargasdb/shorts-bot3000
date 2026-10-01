# 🗺️ Roadmap del proyecto

## ✅ Hecho
- Motor de shorts (voz IA + imágenes + karaoke + gameplay + música), formato validado con audiencia
- Serie "Datos para parecer inteligente" pt.1–10
- Automatización 2/día (11:30 y 18:30): YouTube (público) + Instagram (público) + TikTok (borradores), sincronizadas
- Tokens con auto-renovación (YT, IG semanal, TikTok)
- Captions de TikTok listas (`captions_tiktok/`)

## 🔜 Pendiente corto plazo
- [ ] **Demo video de TikTok** (grabación del flujo OAuth + subida) → **Submit for review**
  - Kit listo y probado: `grabar_demo_tiktok.bat` (2 clicks en el navegador, resto solo;
    deja `tiktok_review_demo.mp4` + `demo_log.txt`). Textos del formulario en
    `tiktok_review_form.md`.
  - Requisitos de la toma: cuenta en PRIVADO (direct post sin auditar) y cupo de
    inbox libre (máx 5 subidas pendientes/24h; el 2026-10-01 se agotó con las tomas
    de prueba → grabar a partir del 2026-10-02 ~8:30).
  → al aprobarse: cambiar `.env` a credenciales de producción + scope `video.publish` = TikTok full-auto
- [ ] Recargar backlog cuando queden <4 partes (generar pt.11+)

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
