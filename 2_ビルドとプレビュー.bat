@echo off
chcp 65001 > nul
echo ビルドとプレビューサーバーを起動しています...
cd /d "%~dp0"
if exist "C:\Users\soroe\node-v22.13.1-win-x64" (
    set "PATH=C:\Users\soroe\node-v22.13.1-win-x64;%PATH%"
)
call npm run build
npm run preview
pause
