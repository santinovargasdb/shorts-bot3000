@echo off
REM Job diario del canal Historia en 60 Segundos (Programador de tareas).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel historia >> automation_historia.log 2>&1
