# Xcord Server - Инструкция по запуску

## ⚠️ ВАЖНО: Не использовать venv!

Всякие `venv`, `.venv`, `env` - **НЕ НУЖНЫ**! Jarvis установлен в глобальный Python.

## Быстрый запуск

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
🚀 Запуск Xcord Core Server...
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

**Готово!** 🚀