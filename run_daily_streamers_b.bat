@echo off
REM Job diario del canal "Clips Argentina" (tier riesgoso; clips de gameplay AR, fuente Kick).
REM Video PRE-RENDERIZADO en streamers/backlog_b.sqlite (ver series_streamers_b.py).
REM El colchon lo rellena solo el auto-refill (autobuild, 4x/dia). Este .bat solo PUBLICA.
REM Agregar al Programador de tareas cuando existan los tokens en secrets/streamers_b/
REM y platforms != () en channels_registry.py.
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel streamers_b >> automation_streamers_b.log 2>&1
