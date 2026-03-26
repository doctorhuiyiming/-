@echo off
title Frontend UI
echo ================================================
echo   Starting Frontend UI...
echo ================================================
echo.

cd /d "%~dp0frontend"

echo [1/2] Installing dependencies (first run may take 2-3 min)...
npm install

echo.
echo [2/2] Starting frontend...
echo.
echo Frontend started! Open your browser and go to:
echo http://localhost:5173
echo.
npm run dev

pause
