## Xcord Core (Python)

Локальное “ядро” Xcord: API для UI и будущие адаптеры Reticulum (LXMF/LXST).

### Запуск (Windows)

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r core\requirements.txt
uvicorn core.app:app --host 127.0.0.1 --port 8787 --reload
```

Важно: устанавливай зависимости в `.venv`, чтобы не ломать глобальные Python-пакеты (у Jarvis и других частей будут свои зависимости).

### Эндпоинты

- `GET /health`
- `POST /messages/send` `{ chat_id, sender_id?, text }`
- `GET /events` (SSE)

