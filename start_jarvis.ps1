# Xcord Core Server + Jarvis Launcher

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Xcord Core Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\core"

# Check if venv exists
if (-not (Test-Path "venv\Scripts\python.exe")) {
    Write-Host "[1/4] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "  Done" -ForegroundColor Green
} else {
    Write-Host "[1/4] Virtual environment found" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/4] Activating venv..." -ForegroundColor Yellow
& "$PSScriptRoot\core\venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "[3/4] Installing minimal libraries..." -ForegroundColor Yellow

# Install minimal requirements with fixed versions
pip install fastapi==0.109.0 uvicicorn==0.27.0 pydantic==2.5.0 python-multipart==0.0.6 --quiet

Write-Host "  Base libraries installed" -ForegroundColor Green

# Ask about full installation
Write-Host ""
Write-Host "Установить полные библиотеки для Jarvis AI? (TTS, голос, AI)" -ForegroundColor Yellow
Write-Host "  Это займёт больше времени и места на диске" -ForegroundColor Gray
$installFull = Read-Host "  (y/n)"
if ($installFull -eq "y") {
    Write-Host "  Installing full Jarvis dependencies..." -ForegroundColor Yellow
    pip install pygame==2.5.2 TTS==0.22.0 openai==1.10.0 huggingface-hub==0.20.0 SpeechRecognition==3.10.0 torch==2.1.0 numpy==1.26.0 --quiet
    Write-Host "  Full installation complete" -ForegroundColor Green
} else {
    Write-Host "  Skipped (базовый режим)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/4] Starting server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python run.py
