from __future__ import annotations

import asyncio
import json
import queue
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Generator, Optional

from fastapi import FastAPI, HTTPException
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
    print("[Jarvis] Module loaded successfully")
except ImportError as e:
    JARVIS_AVAILABLE = False
    print(f"[Jarvis] Not available: {e}")

# Reticulum/LXMF Backend (optional - for decentralized messaging)
try:
    from reticulum_backend import get_reticulum, init_reticulum, XcordReticulum
    RETICULUM_AVAILABLE = True
except ImportError:
    RETICULUM_AVAILABLE = False
    XcordReticulum = None


app = FastAPI(title="Xcord Core", version="0.1.0")

# Global Reticulum instance
reticulum: Optional[XcordReticulum] = None


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
    reticulum_status = "not_initialized"
    if RETICULUM_AVAILABLE and reticulum:
        reticulum_status = "running" if reticulum.is_running else "stopped"
    elif RETICULUM_AVAILABLE:
        reticulum_status = "available"
    
    return {
        "ok": True,
        "reticulum": reticulum_status,
        "jarvis": "available" if JARVIS_AVAILABLE else "not_installed"
    }


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


# === Reticulum/LXMF Endpoints ===
if RETICULUM_AVAILABLE:
    class ReticulumInitRequest(BaseModel):
        storage_path: str = "./xcord_data"
    
    class AddPeerRequest(BaseModel):
        nickname: str
        peer_hash: str
    
    class SendMessageReticulumRequest(BaseModel):
        peer_nickname: str
        message: str
        subject: Optional[str] = ""
    
    @app.post("/reticulum/init")
    async def init_reticulum_system(request: ReticulumInitRequest):
        """Инициализация Reticulum сети"""
        global reticulum
        
        if reticulum and reticulum.is_running:
            return {
                "status": "already_running", 
                "peer_hash": reticulum.get_peer_hash_hex()
            }
        
        try:
            reticulum = init_reticulum(request.storage_path)
            
            def on_message(msg):
                push_event("reticulum_message", msg)
            
            reticulum.on_message_received = on_message
            
            return {
                "status": "started",
                "peer_hash": reticulum.get_peer_hash_hex()
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")
    
    @app.get("/reticulum/status")
    async def get_reticulum_status():
        """Получение статуса Reticulum"""
        if not reticulum or not reticulum.is_running:
            raise HTTPException(status_code=500, detail="Reticulum not running")
        
        return reticulum.get_status()
    
    @app.post("/reticulum/peer/add")
    async def add_peer(request: AddPeerRequest):
        """Добавление друга"""
        if not reticulum or not reticulum.is_running:
            raise HTTPException(status_code=500, detail="Reticulum not running")
        
        success = reticulum.add_peer(request.nickname, request.peer_hash)
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to add peer")
        
        return {"status": "ok", "nickname": request.nickname}
    
    @app.post("/reticulum/message/send")
    async def send_reticulum_message(request: SendMessageReticulumRequest):
        """Отправка сообщения через Reticulum/LXMF"""
        if not reticulum or not reticulum.is_running:
            raise HTTPException(status_code=500, detail="Reticulum not running")
        
        success = reticulum.send_message(
            peer_nickname=request.peer_nickname,
            message_text=request.message,
            subject=request.subject
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to send message")
        
        return {"status": "ok"}
    
    @app.get("/reticulum/messages")
    async def get_reticulum_messages(peer_nickname: Optional[str] = None):
        """Получение сообщений"""
        if not reticulum or not reticulum.is_running:
            raise HTTPException(status_code=500, detail="Reticulum not running")
        
        messages = reticulum.get_messages(peer_nickname)
        return {"messages": messages}
    
    @app.get("/reticulum/messages/stream")
    async def stream_reticulum_messages():
        """SSE поток новых сообщений Reticulum"""
        async def event_generator():
            last_count = 0
            
            while True:
                if reticulum:
                    current_count = len(reticulum.received_messages)
                    if current_count > last_count:
                        messages = reticulum.get_messages()
                        yield f"data: {json.dumps({'new_messages': messages[last_count:]})}\n\n"
                        last_count = current_count
                
                await asyncio.sleep(1)
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
            }
        )
    
    @app.post("/reticulum/shutdown")
    async def shutdown_reticulum():
        """Корректное завершение работы Reticulum"""
        global reticulum
        
        if reticulum:
            reticulum.stop()
            reticulum = None
        
        return {"status": "shutdown_complete"}


# === Jarvis Integration ===
class JarvisCommandIn(BaseModel):
    command: str


@app.post("/jarvis/command")
def jarvis_command(body: JarvisCommandIn) -> dict:
    """Отправить команду Jarvis и получить ответ"""
    if not JARVIS_AVAILABLE:
        return {
            "ok": False, 
            "error": "Jarvis не установлен. Установите: pip install pygame gtts openai huggingface-hub SpeechRecognition"
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


@app.post("/jarvis/tts")
def jarvis_tts(body: dict) -> dict:
    """Генерация аудио из текста (TTS) через gTTS"""
    text = body.get("text", "")
    
    if not text or not text.strip():
        return {"ok": False, "error": "Текст не указан"}
    
    if not JARVIS_AVAILABLE:
        return {
            "ok": False, 
            "error": "Jarvis не установлен. Установите: pip install pygame gtts"
        }
    
    try:
        import uuid
        import os
        
        # Генерация аудио
        tts_filename = f"tts_{uuid.uuid4().hex}.mp3"
        tts_path = os.path.join(os.path.dirname(__file__), tts_filename)
        
        from gtts import gTTS
        import config
        
        tts_obj = gTTS(text=text.strip(), lang=config.XTTS_LANGUAGE, slow=False)
        tts_obj.save(tts_path)
        
        return {
            "ok": True,
            "audio_url": f"/jarvis/audio/{tts_filename}"
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/jarvis/audio/{filename}")
def serve_jarvis_audio(filename: str):
    """Отдача аудиофайла TTS"""
    import os
    audio_path = os.path.join(os.path.dirname(__file__), filename)
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(audio_path, media_type="audio/mpeg")


# Запуск сервера при прямом запуске
if __name__ == "__main__":
    import uvicorn
    
    print("=" * 50)
    print("🚀 Запуск Xcord Core Server...")
    print("=" * 50)
    print()
    print("Доступные endpoints:")
    print("  • GET  /health          - Проверка здоровья")
    print("  • POST /messages/send   - Отправка сообщения (local)")
    print("  • GET  /events          - SSE события")
    print("  • POST /jarvis/command  - Команда для Jarvis")
    print("  • GET  /jarvis/status   - Статус Jarvis")
    print()
    if RETICULUM_AVAILABLE:
        print("  🔗 Reticulum/LXMF (децентрализованная сеть):")
        print("  • POST /reticulum/init     - Инициализация сети")
        print("  • GET  /reticulum/status   - Статус сети")
        print("  • POST /reticulum/peer/add - Добавить друга")
        print("  • POST /reticulum/message/send - Отправить сообщение")
        print("  • GET  /reticulum/messages - Получить сообщения")
        print("  • GET  /reticulum/messages/stream - SSE поток")
        print()
    else:
        print("  ⚠️  Reticulum не установлен: pip install reticulum lxmf")
        print()
    print("Откройте http://localhost:8000 в браузере")
    print("API docs: http://localhost:8000/docs")
    print()
    print("Для остановки нажмите Ctrl+C")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

