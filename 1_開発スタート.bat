@echo off
chcp 65001 > nul
echo 開発サーバーを起動しています...
cd /d "%~dp0"
npm run dev
pause
