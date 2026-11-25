@echo off
REM Graba el video para la AUDITORIA de Direct Post de TikTok (Content Posting API).
REM Abre la pantalla "Post to TikTok", graba el recorrido y deja tiktok_audit_demo.mp4.
REM   grabar_auditoria_tiktok.bat            -> graba de verdad (canal faceless)
REM   grabar_auditoria_tiktok.bat ensayo     -> practica SIN grabar y SIN tocar TikTok
REM   grabar_auditoria_tiktok.bat historia   -> graba con otro canal
cd /d "%~dp0"
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

if /i "%~1"=="ensayo" (
    python tiktok_post_ui.py --ensayo
) else if "%~1"=="" (
    python tiktok_post_ui.py --record
) else (
    python tiktok_post_ui.py --record --channel %1
)
echo.
pause
