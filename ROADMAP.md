# 🗺️ Roadmap del proyecto

## ✅ Hecho
- Motor de shorts (voz IA + imágenes + karaoke + gameplay + música), formato validado con audiencia
- Serie "Datos para parecer inteligente" pt.1–10
- Automatización 2/día (11:30 y 18:30): YouTube (público) + Instagram (público) + TikTok (borradores), sincronizadas
- Tokens con auto-renovación (YT, IG semanal, TikTok)
- Captions de TikTok listas (`captions_tiktok/`)

## 🔜 Pendiente corto plazo
- [ ] **Demo video de TikTok** (grabación del flujo OAuth + subida) → **Submit for review**
  - Kit listo: correr `grabar_demo_tiktok.bat` (graba pantalla + corre `tiktok_demo.py`,
    deja `tiktok_review_demo.mp4`). Solo falta grabarlo y subirlo al formulario.
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
- Canal 2: **Datos Históricos** (mismo motor) → canales de marca de YouTube (misma cuenta
  Google, mismo proyecto Cloud) + testers extra en la misma app de Meta
- Canal 3: **Historias de Reddit** (narración sobre gameplay)
- Canal 4: **Clips de streamers** (pipeline original `src/highlights.py`, con permisos)
