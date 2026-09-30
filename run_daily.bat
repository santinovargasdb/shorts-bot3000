@echo off
REM Job diario del bot de Shorts (lo llama el Programador de tareas de Windows).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py >> automation.log 2>&1
