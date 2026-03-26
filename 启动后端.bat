@echo off
chcp 65001 >nul
title 短剧翻拍 - 后端服务
echo ================================================
echo   短剧翻拍工厂 - 后端服务启动中...
echo ================================================
echo.

cd /d "%~dp0backend"

echo [1/2] 正在安装依赖（首次运行需要1-2分钟）...
pip install -r requirements.txt

echo.
echo [2/2] 启动后端服务...
echo.
echo ✅ 后端已启动！请不要关闭此窗口。
echo    地址：http://localhost:8000
echo.
uvicorn main:app --reload --port 8000

pause
