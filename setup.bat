@echo off
setlocal enabledelayedexpansion
title Analysis-Market - Setup Environment
color 0A

echo ======================================================================
echo          ANALYSIS-MARKET : QUANTITATIVE TERMINAL SETUP
echo ======================================================================
echo.

echo [1/2] Memeriksa Instalasi Node.js & NPM...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Harap install Node.js 18+ terlebih dahulu.
    echo Unduh dari: https://nodejs.org/
    pause
    exit /b 1
)
echo   - Node.js Version: 
node --version
echo   - NPM Version:
npm --version

echo.
echo [2/2] Menginstal Dependensi Sistem (Unified Pure Monorepo)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Terjadi kendala saat npm install. Periksa koneksi internet Anda.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo [SELESAI] Setup lingkungan Analysis-Market berhasil!
echo Anda sekarang cukup klik ganda 'run.bat' untuk menjalankan sistem.
echo ======================================================================
echo.
pause
