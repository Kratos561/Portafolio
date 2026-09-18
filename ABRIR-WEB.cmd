@echo off
rem ============================================================
rem  ABRIR LA WEB CON LOS VIDEOS FUNCIONANDO
rem  Doble clic en este archivo.
rem
rem  Por que hace falta: los videos son de YouTube y YouTube
rem  exige que la pagina envie el header Referer. Una pagina
rem  abierta con doble clic (file://) no tiene origen y YouTube
rem  responde "Error 153". Con este servidor la web se abre en
rem  http://localhost y los videos se reproducen dentro de ella.
rem
rem  Deja esta ventana abierta mientras navegas. Para el servidor:
rem  cierra la ventana o pulsa Ctrl+C.
rem ============================================================
chcp 65001 >nul
title Portafolio AISAK 3D - servidor local
cd /d "%~dp0"
start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & start "" http://localhost:8000/index.html"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-local.ps1" -NoBrowser
echo.
echo El servidor se ha detenido.
pause
