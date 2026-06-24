# Xcord Messenger

Децентрализованный P2P мессенджер с AI-помощником Jarvis.

## Требования

- **Python 3.10+** - для бэкенда (FastAPI + WebRTC signaling)
- **Браузер** - Chrome, Firefox, Edge или Safari

## Установка

### 1. Установите Python зависимости

```bash
cd core
pip install -r requirements.txt
```

Или вручную:
```bash
pip install fastapi uvicorn[standard] websockets wsproto python-multipart bcrypt openai huggingface_hub SpeechRecognition gtts pygame uuid
```

## Запуск

### Запуск сервера

```bash
cd core
python app.py
```

Затем откройте в браузере: **http://localhost:8000**

Или используйте стартовый скрипт:
```bash
.\run.bat
```

## Структура проекта

```
Xcord/
├── core/
│   ├── app.py          # FastAPI бэкенд
│   ├── Jarvis.py       # AI-помощник
│   ├── config.py       # Конфигурация
│   └── requirements.txt # Python зависимости
├── scripts/
│   ├── p2p-main.js     # P2P логика
│   ├── p2p-client.js   # P2P клиент
│   ├── webrtc-client.js # WebRTC клиент
│   ├── jarvis.js       # Интерфейс Jarvis
│   ├── auth.js         # Авторизация
│   └── message-store.js # Хранение сообщений (IndexedDB)
├── index.html          # Основной интерфейс
└── package.json        # Метаданные проекта
```

## Горячие клавиши

- `Enter` — отправить сообщение
- `Shift+Enter` — новая строка
- `Ctrl+P` — открыть профиль

## Особенности

- **P2P общение** — прямое соединение между пользователями через WebRTC
- **Jarvis AI** — AI-помощник для ответов на вопросы
- **IndexedDB** — локальное хранение истории сообщений
- **Адаптивный дизайн** — работает на десктопе и мобильных устройствах

## Автор

NLP-Core-Team
