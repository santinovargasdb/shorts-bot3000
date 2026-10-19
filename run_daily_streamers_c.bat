@echo off
REM Job diario del canal "Clips IRL" (tier riesgoso; charla/IRL de streamers espanoles).
REM Video PRE-RENDERIZADO en streamers/backlog_c.sqlite (ver series_streamers_c.py).
REM El colchon lo rellena solo el auto-refill (autobuild, 4x/dia). Este .bat solo PUBLICA.
REM Agregar al Programador de tareas cuando existan los tokens en secrets/streamers_c/
REM y platforms != () en channels_registry.py.
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel streamers_c >> automation_streamers_c.log 2>&1
