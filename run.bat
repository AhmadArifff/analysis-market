@echo off
setlocal enabledelayedexpansion
title Analysis-Market - Launcher
color 0B

echo ======================================================================
echo          ANALYSIS-MARKET : QUANTITATIVE SYSTEM LAUNCHER
echo ======================================================================
echo.

:: 1. Verifikasi Lingkungan Backend
if not exist "%~dp0backend\venv\Scripts\activate.bat" (
    echo [PERINGATAN] Virtual environment backend belum ditemukan!
    echo Menjalankan setup otomatis pertama kali...
    call "%~dp0setup.bat"
    if %errorlevel% neq 0 (
        echo [ERROR] Setup gagal. Harap periksa instalasi Python dan Node.js.
        pause
        exit /b 1
    )
)

:: 2. Verifikasi Frontend node_modules
if not exist "%~dp0frontend\node_modules" (
    echo [PERINGATAN] Frontend dependencies belum terinstal!
    echo Menjalankan npm install di frontend...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
)

echo [1/3] Menjalankan Backend Engine (FastAPI on Port 8000)...
start "Analysis-Market Backend (FastAPI :8000)" cmd /k "cd /d ""%~dp0backend"" && call venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Menjalankan Frontend Interface (Next.js on Port 3000)...
start "Analysis-Market Frontend (Next.js :3000)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo [3/3] Menunggu server siap dan membuka browser...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ======================================================================
echo [BERHASIL] Seluruh layanan Analysis-Market aktif berjalan!
echo - Web Terminal UI : http://localhost:3000
echo - Backend API Docs: http://localhost:8000/docs
echo.
echo Untuk menghentikan seluruh layanan, tutup kedua window command
echo atau klik ganda file 'stop.bat'.
echo ======================================================================
echo.
pause
