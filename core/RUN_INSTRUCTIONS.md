# Xcord Server - Инструкция по запуску

## Рекомендуется использовать venv!

**Virtual Environment (venv)** - это правильная практика для Python проектов:
- Изолирует зависимости проекта
- Не загрязняет глобальный Python
- Облегчает сборку и деплой
- Гарантирует одинаковые версии у всех разработчиков

## Быстрый запуск (рекомендуется)

### PowerShell (Windows) - С VENV
```powershell
.\scripts\setup-venv.ps1
```

Этот скрипт автоматически:
- Создаст virtual environment (`venv/`)
- Установит все Python зависимости
- Проверит Node.js и установит npm пакеты
- Запустит сервер

### PowerShell (без venv)
```powershell
.\scripts\start-xcord.ps1
```

### Batch (Windows)
```cmd
.\scripts\start-xcord.bat
```

## Ручная установка с venv

### Вариант 1: PowerShell
```powershell
cd D:\pon\GitHub\Xcord\core
python app.py
```

### Вариант 2: CMD
```cmd
cd D:\pon\GitHub\Xcord\core
python app.py
```

### Вариант 3: Скрипт Windows
Открой файл `start_xcord_no_venv.bat`

## Проверка что всё работает

После запуска должен быть лог:
```
==================================================
Запуск Xcord Core Server...
==================================================
[Javis] Module loaded successfully
...
Uvicorn running on http://0.0.0.0:8000
```

## Открыть в браузере
```
http://localhost:8000
```

## Проверка Jarvis

1. Открой http://localhost:8000
2. Нажми на кнопку Jarvis (бот в header)
3. Отправь команду: "привет"
4. Должен прийти ответ БЕЗ ошибки "Jarvis не установлен"

## Если ошибка "Jarvis не установлен"

Значит ты запустил с venv! Выходи из venv:
```powershell
deactivate
```

И запускай снова:
```powershell
python app.py
```

## Остановка сервера

Нажми `Ctrl+C` в окне терминала

---

Готово!