@echo off
REM Job diario del canal "Clips Hispanos" (tier riesgoso; clips de gameplay ripeados).
REM Video PRE-RENDERIZADO en streamers/backlog_a.sqlite (ver series_streamers_a.py).
REM El colchon lo rellena solo el auto-refill (autobuild, 4x/dia). Este .bat solo PUBLICA.
REM Agregar al Programador de tareas cuando existan los tokens en secrets/streamers_a/
REM y platforms != () en channels_registry.py.
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel streamers_a >> automation_streamers_a.log 2>&1
