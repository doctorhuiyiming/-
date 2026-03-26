@echo off
title Frontend UI
echo ================================================
echo   Starting Frontend UI...
echo ================================================
echo.

cd /d "%~dp0frontend"

echo [1/2] Installing dependencies (first run may take 2-3 min)...
npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed! See error above.
    pause
    exit /b 1
)

echo.
echo [2/2] Starting frontend...
echo.
echo Open browser and go to: http://localhost:5173
echo.
npm run dev
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend failed to start! See error above.
    pause
    exit /b 1
)

pause
