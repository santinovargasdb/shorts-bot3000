@echo off
REM Auto-refill nocturno del backlog (lo llama el Programador de tareas, 03:00).
REM Ver docs/superpowers/plans/2026-10-16-auto-refill-infinito.md
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python -m autobuild.supervisor >> automation_autobuild.log 2>&1
