@echo off
setlocal enabledelayedexpansion
title Analysis-Market - Stop All Services
color 0C

echo ======================================================================
echo          ANALYSIS-MARKET : STOPPING ALL LOCAL SERVICES
echo ======================================================================
echo.

echo Menghentikan Backend FastAPI (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   - Menutup process PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo Menghentikan Frontend Next.js (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   - Menutup process PID %%a
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ======================================================================
echo [SELESAI] Seluruh port 8000 dan 3000 telah dinonaktifkan dengan aman.
echo ======================================================================
echo.
timeout /t 2 >nul
exit /b 0
