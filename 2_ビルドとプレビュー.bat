@echo off
chcp 65001 > nul
echo ビルドとプレビューサーバーを起動しています...
cd /d "%~dp0"
call npm run build
npm run preview
pause
