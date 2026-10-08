@echo off
REM Subida EXTRA de TikTok (solo borradores) a las 15:00 para emparejar TikTok con
REM YouTube/IG en los 3 canales de la familia. Cada --only tt NO toca YouTube: solo
REM adelanta TikTok, así el atraso se achica 1 por día. Cuando un canal alcanza a
REM YouTube, la sincro lo auto-saltea. Quitar esta tarea cuando estén todos al día.
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel faceless --only tt  >> automation_tiktok_catchup.log 2>&1
python daily_post.py --channel historia --only tt  >> automation_tiktok_catchup.log 2>&1
python daily_post.py --channel misterios --only tt >> automation_tiktok_catchup.log 2>&1
