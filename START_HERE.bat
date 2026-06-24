@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==================================================
echo   Xcord - Quick Start
echo ==================================================
echo.
echo Выберите действие:
echo.
echo 1. Установить Python зависимости
echo 2. Запустить сервер
echo 3. Выход
echo.
set /p choice="Ваш выбор (1-3): "

if "%choice%"=="1" goto setup
if "%choice%"=="2" goto start
goto end

:setup
echo.
echo [INFO] Установка Python зависимостей...
echo.
cd /d "%~dp0core"
pip install -r requirements.txt
echo.
echo [OK] Установка завершена!
pause
goto end

:start
echo.
echo [INFO] Запуск сервера...
echo.
cd /d "%~dp0core"
python app.py
pause
goto end

:end
