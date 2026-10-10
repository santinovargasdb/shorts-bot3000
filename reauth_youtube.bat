@echo off
REM Re-autoriza los tokens de YouTube de los 3 canales estaticos.
REM NECESARIO cada ~7 dias mientras la app OAuth este en modo "Testing"
REM (los refresh tokens vencen a los 7 dias). Se abre el navegador 3 veces:
REM logueate con nofaceshortvids@gmail.com y ELEGI EL CANAL QUE DICE CADA PASO.
REM Para eliminar esta tarea semanal: verificar la app en Google (Produccion verificada).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8

echo ============================================================
echo  RE-AUTH YOUTUBE  (hacelo cada ~7 dias)
echo  En cada navegador: avanzado -^> ir a la app (no verificada) -^> ELEGI EL CANAL
echo ============================================================
echo.
echo [1/3] FACELESS  -^> elegi el canal "En 60 Segundos"
python -c "from pathlib import Path; Path('secrets/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/token.json'); print('  faceless OK')"
echo.
echo [2/3] HISTORIA  -^> elegi el canal "Historia en 60 Segundos"
python -c "from pathlib import Path; Path('secrets/historia/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/historia/token.json'); print('  historia OK')"
echo.
echo [3/3] MISTERIOS -^> elegi el canal "Misterios en 60 Segundos"
python -c "from pathlib import Path; Path('secrets/misterios/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/misterios/token.json'); print('  misterios OK')"
echo.
echo ============================================================
echo  Listo. Verifica que cada upload caiga en el canal correcto.
echo ============================================================
pause
