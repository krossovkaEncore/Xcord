@echo off
echo ========================================
echo    Xcord Core Server with Reticulum
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Starting Xcord Core Server...
echo.

cd core
python app.py

pause
