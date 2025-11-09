@echo off
echo =====================================================
echo       PS99 Asset Tracker - Windows Installation
echo =====================================================
echo.
echo This script will set up the PS99 Asset Tracker for Windows
echo.
echo 1. Setting up environment file...

if exist .env (
  echo .env file already exists, skipping creation
) else (
  if exist .env.template (
    copy .env.template .env
    echo Created .env file from template
    echo Please edit .env with your Discord webhook URLs before continuing
    echo.
    pause
  ) else (
    echo .env.template not found, creating basic .env file
    echo DISCORD_WEBHOOK_URL=your_webhook_url_here > .env
    echo PETBOT_WEBHOOK_URL=your_webhook_url_here >> .env
    echo Created basic .env file
    echo Please edit .env with your Discord webhook URLs before continuing
    echo.
    pause
  )
)

echo.
echo 2. Installing dependencies...
echo.

call npm install
if errorlevel 1 (
  echo.
  echo Error installing dependencies!
  echo.
  echo Make sure Node.js is installed properly.
  echo Visit https://nodejs.org/ to download and install Node.js
  echo.
  pause
  exit /b 1
)

echo.
echo 3. Creating log directories...
echo.

if not exist logs mkdir logs
if not exist ps99_images mkdir ps99_images

echo.
echo =====================================================
echo        PS99 Asset Tracker Setup Complete!
echo =====================================================
echo.
echo You can now run the tracker using start.bat
echo.
echo If you need help, please read:
echo - QUICK_START.txt
echo - WINDOWS_SETUP.txt
echo.
pause