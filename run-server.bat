@echo off
REM ============================================================
REM  TickFlow SYNC SERVER for Windows (multi-device, same data)
REM  Put this in your project folder and double-click it.
REM  It pulls the latest code, builds the app, and starts a
REM  server that ALL devices on your Wi-Fi can open to share
REM  one synced dataset.
REM ============================================================
setlocal EnableExtensions
set "TARGET=%~dp0"
set "BRANCH=claude/ticktick-premium-clone-E051B"

echo(
echo ==========================================
echo   TickFlow sync server
echo ==========================================
echo(

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Run setup-windows.bat first.
  pause & exit /b 1
)

cd /d "%TARGET%"

REM update to the latest code if this is a git checkout
where git >nul 2>nul
if not errorlevel 1 if exist "%TARGET%.git" (
  echo Updating to the latest code...
  git fetch origin %BRANCH% && git checkout %BRANCH% && git reset --hard origin/%BRANCH%
)

echo Installing dependencies...
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )

echo Building the app...
call npm run build
if errorlevel 1 ( echo Build failed. & pause & exit /b 1 )

echo(
echo Starting the sync server. Open the "Network" URL below on your other devices.
echo It uses HTTPS with a self-signed certificate, so each device shows a one-time
echo "your connection is not private" warning - click Advanced then Proceed/Continue.
echo Keep this window open while you use the app. Press Ctrl+C to stop.
echo(
start "" https://localhost:3000
node server/index.mjs

pause
