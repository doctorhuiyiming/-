@echo off
title Backend Service
echo ================================================
echo   Starting Backend Service...
echo ================================================
echo.

cd /d "%~dp0backend"

echo [1/2] Installing dependencies (first run may take 1-2 min)...
python -m pip install -r requirements.txt

echo.
echo [2/2] Starting backend server...
echo.
echo Backend started! Keep this window open.
echo URL: http://localhost:8000
echo.
python -m uvicorn main:app --reload --port 8000

pause
