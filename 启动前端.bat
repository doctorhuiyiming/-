@echo off
chcp 65001 >nul
title 短剧翻拍 - 前端界面
echo ================================================
echo   短剧翻拍工厂 - 前端界面启动中...
echo ================================================
echo.

cd /d "%~dp0frontend"

echo [1/2] 正在安装依赖（首次运行需要2-3分钟）...
npm install

echo.
echo [2/2] 启动前端界面...
echo.
echo ✅ 启动成功后，请在浏览器打开：
echo    http://localhost:5173
echo.
npm run dev

pause
