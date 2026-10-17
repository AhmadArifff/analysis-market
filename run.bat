@echo off
setlocal enabledelayedexpansion
title Analysis-Market - Launcher
color 0B

echo ======================================================================
echo          ANALYSIS-MARKET : QUANTITATIVE TERMINAL LAUNCHER
echo ======================================================================
echo.

if not exist "%~dp0node_modules" (
    echo [INFO] Dependensi belum terinstal. Menjalankan setup otomatis...
    call "%~dp0setup.bat"
)

echo [1/2] Menjalankan Quantitative Terminal Engine di Port 3000...
start "Analysis-Market Terminal (:3000)" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo [2/2] Menunggu server siap dan membuka browser...
timeout /t 4 /nobreak >nul
start http://localhost:3000

echo.
echo ======================================================================
echo [BERHASIL] Seluruh sistem Analysis-Market aktif berjalan!
echo - Web Terminal UI : http://localhost:3000
echo - API Endpoints   : http://localhost:3000/api/market/watchlist
echo                     http://localhost:3000/api/backtest/export-excel
echo.
echo Untuk menghentikan sistem, tutup jendela terminal atau klik 'stop.bat'.
echo ======================================================================
echo.
pause
