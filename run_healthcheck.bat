@echo off
REM Chequeo diario de salud: avisa por mail si algun canal dejo de subir (lo llama el
REM Programador de tareas, 22:30). Ver docs/superpowers/specs/2026-10-21-healthcheck-alert-design.md
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python -m autobuild.healthcheck >> automation_healthcheck.log 2>&1
