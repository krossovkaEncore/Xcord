@echo off
cd /d "%~dp0"
echo ========================================
echo    Xcord Messenger - Starting
echo ========================================
echo.

REM Start Python server
cd /d "%~dp0core"
python app.py

echo.
echo Xcord stopped.
pause