@echo off
title LAN Chess Server
cd /d "%~dp0"

echo ============================================
echo   LAN Chess - starting up
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found on this computer.
    echo Please install it first from https://nodejs.org
    echo ^(choose the LTS version, then run this file again^)
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing required files, this only happens once...
    call npm install
    echo.
)

echo Starting the server. Keep this window open while playing.
echo Closing this window will end the game.
echo.
node server.js

pause
