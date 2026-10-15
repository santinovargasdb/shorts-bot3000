@echo off
REM Job diario del canal "What On Earth Is This" (tier riesgoso; clips ripeados).
REM Video PRE-RENDERIZADO en whatonearth/videos.sqlite (ver series_whatonearth.py).
REM Agregar al Programador de tareas cuando existan los tokens en secrets/whatonearth/.
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel whatonearth >> automation_whatonearth.log 2>&1
