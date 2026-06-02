@echo off
REM ============================================================
REM  TickFlow one-click setup for Windows
REM  Put this file in  C:\Users\admin\Downloads\Tickflow
REM  then double-click it. It will fetch the code, install
REM  dependencies, and start the app at http://localhost:5173
REM ============================================================
setlocal EnableExtensions

set "TARGET=%~dp0"
set "REPO=https://github.com/Ravik-Chauhan/trade.git"
set "BRANCH=claude/ticktick-premium-clone-E051B"
set "ZIPURL=https://codeload.github.com/Ravik-Chauhan/trade/zip/refs/heads/%BRANCH%"

echo(
echo ==========================================
echo   TickFlow setup
echo   Folder: %TARGET%
echo ==========================================
echo(

REM ---- 1. Ensure Node.js is installed -------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [1/4] Node.js not found. Installing the LTS version via winget...
  winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
  echo(
  echo Node.js was just installed. Windows needs a fresh window to see it.
  echo   ^>^> Please CLOSE this window and double-click setup-windows.bat again. ^<^<
  echo(
  pause
  exit /b 0
) else (
  echo [1/4] Node.js found:
  node -v
)

REM ---- 2. Get the source code ---------------------------------------
where git >nul 2>nul
if errorlevel 1 (
  echo [2/4] Git not found - downloading the project as a ZIP...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "Invoke-WebRequest -Uri '%ZIPURL%' -OutFile \"$env:TEMP\tickflow.zip\";" ^
    "if (Test-Path \"$env:TEMP\tickflow_extract\") { Remove-Item -Recurse -Force \"$env:TEMP\tickflow_extract\" };" ^
    "Expand-Archive -Force \"$env:TEMP\tickflow.zip\" \"$env:TEMP\tickflow_extract\";" ^
    "$src = Get-ChildItem -Directory \"$env:TEMP\tickflow_extract\" | Select-Object -First 1;" ^
    "Copy-Item -Recurse -Force ($src.FullName + '\*') '%TARGET%';"
  if errorlevel 1 ( echo Download failed. Check your internet connection. & pause & exit /b 1 )
) else (
  if exist "%TARGET%.git" (
    echo [2/4] Updating existing checkout...
    git -C "%TARGET%." fetch origin %BRANCH%
    git -C "%TARGET%." checkout %BRANCH%
    git -C "%TARGET%." pull origin %BRANCH%
  ) else (
    echo [2/4] Cloning the repository...
    git clone -b %BRANCH% "%REPO%" "%TEMP%\tickflow_clone"
    if errorlevel 1 ( echo Clone failed. & pause & exit /b 1 )
    xcopy /E /H /I /Y "%TEMP%\tickflow_clone\*" "%TARGET%." >nul
    rmdir /S /Q "%TEMP%\tickflow_clone"
  )
)

REM ---- 3. Install dependencies --------------------------------------
echo(
echo [3/4] Installing dependencies (this can take a minute)...
cd /d "%TARGET%"
call npm install
if errorlevel 1 ( echo npm install failed. & pause & exit /b 1 )

REM ---- 4. Launch ----------------------------------------------------
echo(
echo [4/4] Starting TickFlow at http://localhost:5173
echo Opening your browser... (press Ctrl+C in this window to stop the app)
start "" http://localhost:5173
call npm run dev

pause
