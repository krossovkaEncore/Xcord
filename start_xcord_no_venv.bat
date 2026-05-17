@echo off
REM Xcord Start Script for Windows
REM Запуск сервера без venv (использует глобальный Python)

echo ============================================================
echo Xcord Server - Starting...
echo ============================================================
echo.

cd /d "%~dp0core"

echo Checking dependencies...
python check_deps.py
if errorlevel 1 (
    echo.
    echo Installing missing dependencies...
    python -m pip install -r requirements.txt
)

echo.
echo Starting Xcord Core Server...
echo ============================================================
python app.py

pause