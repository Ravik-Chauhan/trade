@echo off
REM ============================================================
REM  TickFlow updater for Windows
REM  Put this file in your TickFlow project folder
REM  (e.g. C:\Users\admin\Downloads\Tickflow) and double-click.
REM  It pulls the latest fixes from the branch, updates
REM  dependencies, and starts the app at http://localhost:5173
REM ============================================================
setlocal EnableExtensions

set "TARGET=%~dp0"
set "REPO=https://github.com/Ravik-Chauhan/trade.git"
set "BRANCH=claude/ticktick-premium-clone-E051B"
set "ZIPURL=https://codeload.github.com/Ravik-Chauhan/trade/zip/refs/heads/%BRANCH%"

echo(
echo ==========================================
echo   TickFlow updater
echo   Folder: %TARGET%
echo ==========================================
echo(

REM ---- 0. Make sure Node.js is available ----------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not on PATH.
  echo Run setup-windows.bat first, or install Node LTS from https://nodejs.org
  echo(
  pause
  exit /b 1
)

cd /d "%TARGET%"

REM ---- 1. Get the latest code --------------------------------------
where git >nul 2>nul
set "HAS_GIT=%errorlevel%"

if exist "%TARGET%.git" if "%HAS_GIT%"=="0" (
  echo [1/3] Updating via Git ^(force-syncing to latest %BRANCH%^)...
  git fetch origin %BRANCH%
  if errorlevel 1 ( echo Fetch failed - check your internet connection. & pause & exit /b 1 )
  git checkout %BRANCH%
  git reset --hard origin/%BRANCH%
  if errorlevel 1 ( echo Update failed. & pause & exit /b 1 )
  goto :install
)

REM ---- Fallback: no git repo here, download a fresh ZIP ------------
echo [1/3] No Git checkout found - downloading the latest ZIP...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "Invoke-WebRequest -Uri '%ZIPURL%' -OutFile \"$env:TEMP\tickflow.zip\";" ^
  "if (Test-Path \"$env:TEMP\tickflow_extract\") { Remove-Item -Recurse -Force \"$env:TEMP\tickflow_extract\" };" ^
  "Expand-Archive -Force \"$env:TEMP\tickflow.zip\" \"$env:TEMP\tickflow_extract\";" ^
  "$src = Get-ChildItem -Directory \"$env:TEMP\tickflow_extract\" | Select-Object -First 1;" ^
  "Copy-Item -Recurse -Force ($src.FullName + '\*') '%TARGET%';"
if errorlevel 1 ( echo Download failed - check your internet connection. & pause & exit /b 1 )

:install
REM ---- 2. Refresh dependencies -------------------------------------
echo(
echo [2/3] Updating dependencies...
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )

REM ---- 3. Launch ---------------------------------------------------
echo(
echo [3/3] Starting the updated app at http://localhost:5173
echo Opening your browser... ^(press Ctrl+C in this window to stop the app^)
start "" http://localhost:5173
call npm run dev

pause
