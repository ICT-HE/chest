@echo off
title LAN Chess Server
cd /d "%~dp0"

echo ============================================
echo   LAN Chess - starting up
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found. Installing it automatically...
    echo.

    :: Installing Node.js needs administrator rights.
    net session >nul 2>&1
    if errorlevel 1 (
        echo Asking Windows for permission - click "Yes" on the popup.
        powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
        exit /b
    )

    where winget >nul 2>nul
    if not errorlevel 1 (
        echo Installing via winget, this can take a minute or two...
        winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo winget isn't available, downloading the installer directly...
        powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; $idx = Invoke-RestMethod https://nodejs.org/dist/index.json; $lts = $idx | Where-Object { $_.lts -ne $false } | Select-Object -First 1; $ver = $lts.version; $url = 'https://nodejs.org/dist/' + $ver + '/node-' + $ver + '-x64.msi'; $out = $env:TEMP + '\node-installer.msi'; Invoke-WebRequest -Uri $url -OutFile $out; Start-Process msiexec.exe -ArgumentList '/i',$out,'/quiet','/norestart' -Wait
    )

    :: make the freshly installed node visible to this session
    set "PATH=%ProgramFiles%\nodejs;%PATH%"

    where node >nul 2>nul
    if errorlevel 1 (
        echo.
        echo Automatic install didn't complete. Please install Node.js
        echo manually from https://nodejs.org ^(LTS version^), then
        echo double-click this file again.
        echo.
        pause
        exit /b 1
    )

    echo Node.js installed successfully.
    echo.
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
