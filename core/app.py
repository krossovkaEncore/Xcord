from __future__ import annotations

import json
import queue
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Generator, Optional

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Try to import Jarvis (optional)
try:
    import Jarvis
    JARVIS_AVAILABLE = True
except ImportError:
    JARVIS_AVAILABLE = False


app = FastAPI(title="Xcord Core", version="0.1.0")


@app.get("/favicon.ico")
def favicon():
    """Игнорируем favicon"""
    return ""


@app.get("/")
def root():
    """Корневая страница - отдаём HTML интерфейс"""
    # Путь к index.html относительно файла app.py
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    index_path = os.path.join(project_root, "index.html")
    
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    return {
        "name": "Xcord Core Server",
        "version": "0.1.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "messages_send": "/messages/send",
            "events": "/events",
            "jarvis_command": "/jarvis/command",
            "jarvis_status": "/jarvis/status",
            "docs": "/docs"
        }
    }


# Подключаем статические файлы
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Подключаем все папки
for folder in ["assets", "styles", "scripts"]:
    folder_path = os.path.join(project_root, folder)
    if os.path.exists(folder_path):
        app.mount(f"/{folder}", StaticFiles(directory=folder_path), name=folder)


# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass(frozen=True)
class Message:
    id: str
    chat_id: str
    sender_id: str
    text: str
    ts_ms: int


class SendMessageIn(BaseModel):
    chat_id: str
    sender_id: str = "local"
    text: str


event_queue: "queue.Queue[dict]" = queue.Queue()


def now_ms() -> int:
    return int(time.time() * 1000)


def push_event(event_type: str, payload: dict) -> None:
    event_queue.put(
        {
            "id": str(uuid.uuid4()),
            "type": event_type,
            "ts_ms": now_ms(),
            "payload": payload,
        }
    )


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/messages/send")
def send_message(body: SendMessageIn) -> dict:
    msg = Message(
        id=str(uuid.uuid4()),
        chat_id=body.chat_id,
        sender_id=body.sender_id,
        text=body.text,
        ts_ms=now_ms(),
    )
    push_event("message", asdict(msg))
    return {"ok": True, "message": asdict(msg)}


@app.get("/events")
def events(since_ms: Optional[int] = None) -> StreamingResponse:
    def gen() -> Generator[bytes, None, None]:
        if since_ms is not None:
            push_event("info", {"note": "since_ms is not implemented yet"})

        while True:
            event = event_queue.get()
            yield b"event: " + event["type"].encode("utf-8") + b"\n"
            yield b"data: " + json.dumps(event, ensure_ascii=False).encode("utf-8") + b"\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


# === Jarvis Integration ===
class JarvisCommandIn(BaseModel):
    command: str


@app.post("/jarvis/command")
def jarvis_command(body: JarvisCommandIn) -> dict:
    """Отправить команду Jarvis и получить ответ"""
    if not JARVIS_AVAILABLE:
        return {
            "ok": False, 
            "error": "Jarvis не установлен. Установите: pip install pygame TTS openai huggingface-hub SpeechRecognition torch"
        }
    
    try:
        # Запускаем команду в отдельном потоке, чтобы не блокировать API
        import threading
        result_container = {}
        
        def run_jarvis():
            try:
                result_container["response"] = Jarvis.jarvis(body.command)
            except Exception as e:
                result_container["error"] = str(e)
        
        thread = threading.Thread(target=run_jarvis)
        thread.start()
        thread.join(timeout=60) # Ждём максимум 60 секунд
        
        if "error" in result_container:
            return {"ok": False, "error": result_container["error"]}
        
        return {"ok": True, "response": result_container.get("response", "Команда выполнена")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/jarvis/status")
def jarvis_status() -> dict:
    """Проверить статус Jarvis"""
    return {
        "ok": True,
        "status": "ready" if JARVIS_AVAILABLE else "not_installed",
        "available": JARVIS_AVAILABLE,
        "features": ["voice", "text", "image_generation", "console_commands"] if JARVIS_AVAILABLE else []
    }


# Запуск сервера при прямом запуске
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("🚀 Запуск Xcord Core Server...")
    print("=" * 50)
    print()
    print("Доступные endpoints:")
    print("  • GET  /health          - Проверка здоровья")
    print("  • POST /messages/send   - Отправка сообщения")
    print("  • GET  /events          - SSE события")
    print("  • POST /jarvis/command  - Команда для Jarvis")
    print("  • GET  /jarvis/status   - Статус Jarvis")
    print()
    print("Откройте http://localhost:8000 в браузере")
    print("API docs: http://localhost:8000/docs")
    print()
    print("Для остановки нажмите Ctrl+C")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

