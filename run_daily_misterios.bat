@echo off
REM Job diario del canal Misterios en 60 Segundos (Programador de tareas).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel misterios >> automation_misterios.log 2>&1
