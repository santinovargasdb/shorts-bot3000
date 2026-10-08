@echo off
REM Job diario del canal "¿Soy el Malo?" (historias de Reddit; Programador de tareas).
REM Guiones dinámicos desde reddit_pipeline/stories.sqlite (ver series_reddit.py).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8
python daily_post.py --channel soyelmalo >> automation_soyelmalo.log 2>&1
