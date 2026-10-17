@echo off
setlocal enabledelayedexpansion
title Analysis-Market - Setup Environment
color 0A

echo ======================================================================
echo          ANALYSIS-MARKET : QUANTITATIVE SYSTEM ENVIRONMENT SETUP
echo ======================================================================
echo.

:: 1. Check Python
echo [1/4] Memeriksa Instalasi Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak ditemukan! Harap install Python 3.11+ terlebih dahulu.
    echo Unduh dari: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version

:: 2. Check Node.js
echo.
echo [2/4] Memeriksa Instalasi Node.js & NPM...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Harap install Node.js 18+ terlebih dahulu.
    echo Unduh dari: https://nodejs.org/
    pause
    exit /b 1
)
node --version
npm --version

:: 3. Setup Backend Virtual Environment & Pip Dependencies
echo.
echo [3/4] Menyiapkan Backend Virtual Environment & Dependencies...
cd /d "%~dp0backend"
if not exist "venv" (
    echo   - Membuat virtualenv 'venv'...
    python -m venv venv
)
echo   - Menginstal dependencies backend (FastAPI, Pandas, NumPy, CCXT, OpenPyXL)...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Terjadi kendala saat install pip dependencies. Periksa requirements.txt.
) else (
    echo   - Backend dependencies berhasil diinstal!
)

:: 4. Setup Frontend NPM Dependencies
echo.
echo [4/4] Menyiapkan Frontend Dependencies...
cd /d "%~dp0frontend"
if exist "package.json" (
    echo   - Menjalankan npm install di frontend...
    call npm install
    if %errorlevel% neq 0 (
        echo [WARNING] Terjadi kendala saat npm install.
    ) else (
        echo   - Frontend dependencies berhasil diinstal!
    )
) else (
    echo   - Folder frontend belum memiliki package.json.
)

cd /d "%~dp0"
echo.
echo ======================================================================
echo [SELESAI] Setup lingkungan Monorepo Analysis-Market berhasil!
echo Anda sekarang bisa klik ganda 'run.bat' untuk menjalankan sistem.
echo ======================================================================
echo.
pause
