@echo off
setlocal
echo =======================================================
echo NEXUS — AI-Powered Criminal Network Analysis System
echo =======================================================
echo.

echo Checking for Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running or not installed.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b
)

echo Docker is running. Starting NEXUS...
echo.
docker compose up -d

echo.
echo =======================================================
echo NEXUS services are starting in the background.
echo.
echo Please note: If this is your first time starting NEXUS,
echo the local AI model (qwen2.5:7b) will be downloaded
echo automatically. This may take several minutes depending
echo on your internet connection.
echo.
echo Once the model is initialized, subsequent startups
echo will be much faster.
echo.
echo The frontend will be available at: http://localhost:3000
echo =======================================================
echo.
pause
