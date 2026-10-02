@echo off
REM Graba la pantalla mientras corre el demo de TikTok para la revision de la app.
REM Resultado: tiktok_review_demo.mp4 (subirlo en "Submit for review").
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

echo La grabacion de pantalla empieza en 3 segundos (cerra ventanas privadas)...
timeout /t 3 >nul
start "REC-ffmpeg" /min cmd /c "ffmpeg -y -f gdigrab -rtbufsize 512M -framerate 30 -i desktop -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p tiktok_demo_raw.mkv 2> rec_ffmpeg.log"

python tiktok_demo.py %*

taskkill /f /im ffmpeg.exe >nul 2>&1
timeout /t 2 >nul
ffmpeg -y -hide_banner -loglevel error -i tiktok_demo_raw.mkv -c copy tiktok_review_demo.mp4
if exist tiktok_review_demo.mp4 del tiktok_demo_raw.mkv >nul 2>&1
echo.
echo Listo: tiktok_review_demo.mp4 (en esta carpeta)
pause
