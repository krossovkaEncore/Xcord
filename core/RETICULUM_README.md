# Xcord Reticulum/LXMF Backend

Децентрализованная P2P сеть для Xcord мессенджера.

## 📦 Установка

### 1. Установите зависимости

```bash
# В корневой папке проекта
pip install -r core/requirements.txt
```

Или вручную:

```bash
pip install reticulum lxmf fastapi uvicorn
```

### 2. Запуск

```bash
# Из папки core
cd core
python app.py
```

Сервер запустится на `http://localhost:8000`

## 🔧 API Endpoints

### Инициализация

```bash
POST /reticulum/init
{
  "storage_path": "./xcord_data"
}

# Ответ:
{
  "status": "started",
  "peer_hash": "a1b2c3d4e5f6..."
}
```

### Получить статус

```bash
GET /reticulum/status

# Ответ:
{
  "running": true,
  "peer_hash": "a1b2c3d4e5f6...",
  "peers": ["friend1", "friend2"],
  "message_count": 5
}
```

### Добавить друга

```bash
POST /reticulum/peer/add
{
  "nickname": "Илья",
  "peer_hash": "a1b2c3d4e5f6..."
}
```

### Отправить сообщение

```bash
POST /reticulum/message/send
{
  "peer_nickname": "Илья",
  "message": "Привет! Это тестовое сообщение.",
  "subject": "Приветствие"
}
```

### Получить сообщения

```bash
GET /reticulum/messages?peer_nickname=Илья

# Ответ:
{
  "messages": [
    {
      "sender_hash": "a1b2c3d4...",
      "subject": "Привет",
      "message": "Привет! Как дела?",
      "timestamp": 1234567890.0,
      "read": false
    }
  ]
}
```

### SSE поток новых сообщений

```bash
GET /reticulum/messages/stream
```

## 🎯 Как это работает

### Архитектура

```
┌─────────────────┐      LXMF       ┌─────────────────┐
│   Клиент 1      │ ◄──────────────► │   Клиент 2      │
│   (Xcord UI)    │   P2P сеть       │   (Xcord UI)    │
└────────┬────────┘                  └────────┬────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐                  ┌─────────────────┐
│  Reticulum      │                  │  Reticulum      │
│  + LXMF         │                  │  + LXMF         │
└─────────────────┘                  └─────────────────┘
```

### Особенности

1. **Нет серверов** — клиенты общаются напрямую через сеть Reticulum
2. **Сообщения хранятся** — если получатель оффлайн, сообщение ждёт на его устройстве
3. **Graceful shutdown** — при корректном завершении сообщения не теряются
4. **P2P обнаружение** — узлы автоматически находят друг друга в сети

### Сценарии использования

#### Сценарий 1: Оба клиента онлайн

1. Клиент A отправляет сообщение
2. Reticulum находит путь к Клиенту B
3. Сообщение доставляется напрямую
4. Клиент B получает уведомление через SSE

#### Сценарий 2: Получатель оффлайн

1. Клиент A отправляет сообщение
2. Reticulum сохраняет сообщение в локальное хранилище
3. Когда Клиент B подключится — сообщение будет доставлено

#### Сценарий 3: Клиент завершает работу

1. Вызывается `shutdown` endpoint
2. Reticulum отправляет announce об отключении
3. Все ожидающие сообщения сохраняются
4. При следующем подключении — сообщения будут доставлены

## 🔑 Ключевые концепции

### Peer Hash
Уникальный публичный идентификатор пользователя в сети Reticulum.
- Формат: 64 hex символа (32 байта)
- Пример: `a1b2c3d4e5f6...`
- Используется для добавления друзей

### LXMF (Lx Message Format)
Протокол обмена сообщениями поверх Reticulum.
- Поддерживает прямую отправку
- Поддерживает оппортунистические сообщения (single-packet)
- Включает шифрование и аутентификацию

### Reticulum Network
Децентрализованная сеть для передачи данных.
- Работает поверх IP, LoRa, AX.25, и других transports
- Автоматическое обнаружение узлов
- Маршрутизация сообщений

## 🧪 Тестирование

### Тест между двумя клиентами на одном компьютере

Откройте два терминала:

**Терминал 1 (Клиент A):**
```bash
cd core
python -c "
from app import app
import uvicorn

# Запуск на порту 8001
uvicorn.run(app, host='127.0.0.1', port=8001)
"
```

**Терминал 2 (Клиент B):**
```bash
cd core
python -c "
from app import app
import uvicorn

# Запуск на порту 8002
uvicorn.run(app, host='127.0.0.1', port=8002)
"
```

**Шаги:**

1. Клиент A: `POST /reticulum/init` → получите `peer_hash`
2. Клиент B: `POST /reticulum/init` → получите `peer_hash`
3. Клиент A: `POST /reticulum/peer/add` с hash Клиента B
4. Клиент B: `POST /reticulum/peer/add` с hash Клиента A
5. Клиент A: `POST /reticulum/message/send` → отправьте сообщение Клиенту B
6. Клиент B: `GET /reticulum/messages` → проверьте получение

## 🐛 Known Issues

### Issue: Path not found
**Симптом:** `Destination is not yet known`
**Решение:** Убедитесь, что оба узла запущены и анонсируются в сеть. Подождите несколько секунд.

### Issue: Messages not delivered
**Симптом:** Сообщения отправляются, но не приходят
**Решение:** Проверьте, что:
1. Оба узла запущены
2. Peer hashes добавлены правильно
3. Нет файрвола блокирующего соединение

## 📝 Пример кода для frontend

```javascript
// Инициализация
await fetch('http://localhost:8000/reticulum/init', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({storage_path: './xcord_data'})
});

// Получить свой hash
const status = await fetch('http://localhost:8000/reticulum/status').then(r => r.json());
console.log('My peer hash:', status.peer_hash);

// Добавить друга
await fetch('http://localhost:8000/reticulum/peer/add', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    nickname: 'Илья',
    peer_hash: 'a1b2c3d4e5f6...'
  })
});

// Отправить сообщение
await fetch('http://localhost:8000/reticulum/message/send', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    peer_nickname: 'Илья',
    message: 'Привет!',
    subject: 'Test'
  })
});

// Получить сообщения
const messages = await fetch('http://localhost:8000/reticulum/messages').then(r => r.json());
console.log('Messages:', messages);

// SSE поток
const eventSource = new EventSource('http://localhost:8000/reticulum/messages/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New messages:', data.new_messages);
};
```

## 🚀 Следующие шаги

1. Интеграция с frontend UI
2. Добавление поддержки файлов через LXMF
3. Реализация LXST для голосовых звонков
4. Добавление шифрования end-to-end
5. Поддержка propagation nodes для ретрансляции

## 📚 Ресурсы

- [Reticulum Documentation](https://markqvist.github.io/Reticulum/)
- [LXMF Documentation](https://markqvist.github.io/LXMF/)
- [Sideband Example](https://github.com/markqvist/sideband)
