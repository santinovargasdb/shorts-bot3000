@echo off
REM Re-autoriza los tokens de YouTube de los 4 canales del tier seguro.
REM NECESARIO cada ~7 dias mientras la app OAuth este en modo "Testing"
REM (los refresh tokens vencen a los 7 dias). Se abre el navegador 4 veces:
REM logueate con nofaceshortvids@gmail.com y ELEGI EL CANAL QUE DICE CADA PASO.
REM Para eliminar esta tarea semanal: verificar la app en Google (Produccion verificada).
cd /d "C:\Users\accsoc\Desktop\yt short"
set PYTHONIOENCODING=utf-8

echo ============================================================
echo  RE-AUTH YOUTUBE  (hacelo cada ~7 dias)
echo  En cada navegador: avanzado -^> ir a la app (no verificada) -^> ELEGI EL CANAL
echo ============================================================
echo.
echo [1/4] FACELESS  -^> elegi el canal "En 60 Segundos"
python -c "from pathlib import Path; Path('secrets/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/token.json'); print('  faceless OK')"
echo.
echo [2/4] HISTORIA  -^> elegi el canal "Historia en 60 Segundos"
python -c "from pathlib import Path; Path('secrets/historia/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/historia/token.json'); print('  historia OK')"
echo.
echo [3/4] MISTERIOS -^> elegi el canal "Misterios en 60 Segundos"
python -c "from pathlib import Path; Path('secrets/misterios/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/misterios/token.json'); print('  misterios OK')"
echo.
echo [4/4] SOYELMALO -^> elegi el canal "Soy el Malo"
python -c "from pathlib import Path; Path('secrets/soyelmalo/token.json').unlink(missing_ok=True); from uploaders.youtube_upload import _get_service; _get_service('secrets/soyelmalo/token.json'); print('  soyelmalo OK')"
echo.
echo ============================================================
echo  Listo. Verifica que cada upload caiga en el canal correcto.
echo ============================================================
pause
