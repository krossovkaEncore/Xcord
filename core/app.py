from __future__ import annotations

import asyncio
import json
import os
import queue
import socket
import threading
import time
import uuid
from dataclasses import asdict, dataclass
from typing import Generator, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Проверка импортов
import socket
import threading

try:
    import bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    print("[WARNING] bcrypt not installed. Install with: pip install bcrypt")

try:
    import Jarvis
    JARVIS_AVAILABLE = True
except ImportError as e:
    JARVIS_AVAILABLE = False

app = FastAPI(title="Xcord Core", version="0.1.0")

# Определяем корень проекта правильно
current_file = os.path.abspath(__file__)
current_dir = os.path.dirname(current_file)
# Поднимаемся на уровень выше от core/ к корню проекта
project_root = os.path.dirname(current_dir)

# Монтируем статические файлы
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


# === Auth Models ===
class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    ok: bool
    user_id: Optional[str] = None
    username: Optional[str] = None
    error: Optional[str] = None

# === UDP Discovery ===
DISCOVERY_PORT = 8765
DISCOVERY_BROADCAST = "<broadcast>"
discovery_socket = None
local_discovery_port = None

def start_udp_discovery(server_port: int):
    """UDP Discovery service для обнаружения пиров в LAN"""
    global discovery_socket, local_discovery_port
    
    try:
        discovery_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        discovery_socket.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        discovery_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        discovery_socket.bind(('', DISCOVERY_PORT))
        discovery_socket.settimeout(1.0)
        local_discovery_port = DISCOVERY_PORT
        
        print(f"[Discovery] UDP listener started on port {DISCOVERY_PORT}")
        
        def listen_loop():
            while True:
                try:
                    data, addr = discovery_socket.recvfrom(1024)
                    message = json.loads(data.decode('utf-8'))
                    handle_discovery_message(message, addr, server_port)
                except socket.timeout:
                    continue
                except Exception as e:
                    print(f"[Discovery] Error: {e}")
                    break
        
        thread = threading.Thread(target=listen_loop, daemon=True)
        thread.start()
        
        # Отправляем приветственный пакет
        broadcast_discovery(server_port, "hello")
        
    except Exception as e:
        print(f"[Discovery] Failed to start: {e}")

def broadcast_discovery(server_port: int, msg_type: str = "announce"):
    """Отправить broadcast пакет в LAN"""
    if not discovery_socket:
        return
    
    try:
        message = {
            "type": msg_type,
            "service": "xcord",
            "port": server_port,
            "timestamp": time.time()
        }
        discovery_socket.sendto(
            json.dumps(message).encode('utf-8'),
            (DISCOVERY_BROADCAST, DISCOVERY_PORT)
        )
        print(f"[Discovery] Broadcast {msg_type} on port {server_port}")
    except Exception as e:
        print(f"[Discovery] Broadcast error: {e}")

def handle_discovery_message(message: dict, addr: tuple, server_port: int):
    """Обработка полученного discovery пакета"""
    if message.get("service") != "xcord":
        return
    
    print(f"[Discovery] Found peer at {addr[0]}:{message.get('port')}")
    
    # Можно добавить хранение обнаруженных пиров
    # connected_peers.append({"ip": addr[0], "port": message.get('port'), ...})


connected_clients: dict = {}

message_queue: "queue.Queue[dict]" = queue.Queue()

# Auth storage (в будущем перенести в БД)
registered_users: dict = {}


def find_free_port(start_port: int = 8000, max_attempts: int = 100) -> int:
    """Найти первый свободный порт начиная с start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('0.0.0.0', port))
                print(f"[Port] Found free port: {port}")
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"No free ports found in range {start_port}-{start_port + max_attempts}")


async def broadcast_to_others(exclude_client_id: str, message: dict):
    """Отправить сообщение всем кроме указанного клиента"""
    # Копируем список ключей чтобы избежать изменения словаря во время итерации
    for cid in list(connected_clients.keys()):
        if cid != exclude_client_id:
            try:
                await connected_clients[cid]["ws"].send_json(message)
            except Exception:
                pass


@app.get("/favicon.ico")
def favicon():
    return ""


@app.get("/")
def root():
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
            "websocket": "/ws/{username}",
            "messages": "/messages",
            "peers": "/peers",
            "jarvis_command": "/jarvis/command",
            "jarvis_status": "/jarvis/status",
            "docs": "/docs"
        }
    }


@app.websocket("/ws/{username}")
async def websocket_endpoint(ws: WebSocket, username: str):
    client_id = str(uuid.uuid4())[:8]
    connected_clients[client_id] = {
        "ws": ws,
        "username": username,
        "messages": [],
        "client_id": client_id
    }
    
    await ws.accept()
    
    # Отправляем клиенту его ID
    await ws.send_json({
        "type": "connected",
        "client_id": client_id,
        "username": username
    })
    
    # Отправляем список текущих пиров
    peer_list = [
        {"id": cid, "username": data["username"]}
        for cid, data in connected_clients.items()
        if cid != client_id
    ]
    await ws.send_json({
        "type": "peer_list",
        "peers": peer_list
    })
    
    # Уведомляем остальных о новом пользователе
    await broadcast_to_others(client_id, {
        "type": "peer_joined",
        "peer": {"id": client_id, "username": username}
    })
    
    try:
        while True:
            data = await ws.receive_text()
            msg_data = json.loads(data)
            
            # P2P Signaling
            if msg_data.get("type") in ["offer", "answer", "ice_candidate"]:
                target_id = msg_data.get("to")
                if target_id and target_id in connected_clients:
                    await connected_clients[target_id]["ws"].send_json({
                        "type": msg_data["type"],
                        "from": client_id,
                        **msg_data
                    })
            
            # P2P сообщения через сервер (если WebRTC не работает)
            elif msg_data.get("type") == "message":
                target_id = msg_data.get("to")
                message_data = msg_data.get("data", {})
                print(f"[WS] ====== Message from {client_id} ({username}) to '{target_id}' ======")
                print(f"[WS] Message data: {message_data}")
                
                msg = {
                    "id": str(uuid.uuid4()),
                    "from": client_id,
                    "username": username,
                    "data": message_data,
                    "timestamp": time.time()
                }
                
                # Ищем получателя по client_id или по username
                target_client = None
                if target_id:
                    # Сначала пробуем найти по client_id
                    if target_id in connected_clients:
                        target_client = connected_clients[target_id]
                        print(f"[WS] Found target by client_id: {target_id}")
                    else:
                        # Если не нашли, ищем по username (для обратной совместимости)
                        for cid, cdata in connected_clients.items():
                            if cdata["username"] == target_id:
                                target_client = cdata
                                print(f"[WS] Found target by username: {target_id} -> {cid}")
                                break
                
                if target_client:
                    print(f"[WS] >>>>> Forwarding to {target_client['client_id']} ({target_client['username']})")
                    await target_client["ws"].send_json({
                        "type": "message",
                        "from": client_id,
                        "data": msg
                    })
                else:
                    print(f"[WS] >>>>> Target '{target_id}' not found in connected clients: {list(connected_clients.keys())}")
                    print(f"[WS] Broadcasting to all except {client_id}")
                    # Broadcast всем кроме отправителя
                    await broadcast_to_others(client_id, {
                        "type": "message",
                        "from": client_id,
                        "data": msg
                    })
            
            elif msg_data.get("type") == "ping":
                await ws.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error: {e}")
    finally:
        connected_clients.pop(client_id, None)
        # Уведомляем об отключении (копируем ключи для безопасной итерации)
        for cid in list(connected_clients.keys()):
            try:
                await connected_clients[cid]["ws"].send_json({
                    "type": "peer_left",
                    "peerId": client_id
                })
            except Exception:
                pass


async def broadcast_message(msg: dict):
    """Broadcast message to all connected clients"""
    for cid in list(connected_clients.keys()):
        try:
            await connected_clients[cid]["ws"].send_json({
                "type": "message",
                "from": msg.get("from", "unknown"),
                "data": msg
            })
        except Exception as e:
            print(f"[WS] Broadcast error to {cid}: {e}")


@app.get("/messages")
async def get_messages(username: str = None):
    messages = []
    for client_id, data in connected_clients.items():
        messages.extend(data["messages"])
    
    if username:
        messages = [m for m in messages if m.get("sender") == username]
    
    return {"messages": messages[-100:]}


@app.get("/peers")
async def get_peers():
    peers = [
        {"client_id": cid, "username": data["username"]}
        for cid, data in connected_clients.items()
    ]
    return {"peers": peers}


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "jarvis": "available" if JARVIS_AVAILABLE else "not_installed",
        "bcrypt": "available" if BCRYPT_AVAILABLE else "not_installed"
    }


# === Authentication Endpoints ===
@app.post("/auth/register", response_model=AuthResponse)
def register(body: RegisterRequest):
    """Регистрация нового пользователя"""
    if not BCRYPT_AVAILABLE:
        return AuthResponse(ok=False, error="bcrypt not installed")
    
    username = body.username.strip()
    if len(username) < 3 or len(username) > 32:
        return AuthResponse(ok=False, error="Username must be 3-32 characters")
    
    if not body.password or len(body.password) < 6:
        return AuthResponse(ok=False, error="Password must be at least 6 characters")
    
    # Проверяем существование
    if username.lower() in registered_users:
        return AuthResponse(ok=False, error="Username already exists")
    
    # Хешируем пароль
    password_hash = bcrypt.hashpw(body.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user_id = str(uuid.uuid4())[:12]
    registered_users[username.lower()] = {
        "id": user_id,
        "username": username,
        "display_name": body.display_name or username,
        "password_hash": password_hash,
        "created_at": time.time()
    }
    
    print(f"[Auth] New user registered: {username} ({user_id})")
    
    return AuthResponse(ok=True, user_id=user_id, username=username)


@app.post("/auth/login", response_model=AuthResponse)
def login(body: LoginRequest):
    """Вход пользователя"""
    if not BCRYPT_AVAILABLE:
        return AuthResponse(ok=False, error="bcrypt not installed")
    
    username = body.username.strip().lower()
    user = registered_users.get(username)
    
    if not user:
        return AuthResponse(ok=False, error="User not found")
    
    # Проверяем пароль
    if not bcrypt.checkpw(body.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        return AuthResponse(ok=False, error="Invalid password")
    
    print(f"[Auth] User logged in: {username}")
    
    return AuthResponse(ok=True, user_id=user["id"], username=user["username"])


@app.get("/auth/verify/{user_id}")
def verify_user(user_id: str):
    """Проверка существования пользователя"""
    for user in registered_users.values():
        if user["id"] == user_id:
            return {"ok": True, "username": user["username"]}
    
    return {"ok": False, "error": "User not found"}


# === Jarvis Integration ===
class JarvisCommandIn(BaseModel):
    command: str


@app.post("/jarvis/command")
def jarvis_command(body: JarvisCommandIn) -> dict:
    if not JARVIS_AVAILABLE:
        return {
            "ok": False, 
            "error": "Jarvis не установлен. Установите: pip install pygame gtts openai huggingface-hub SpeechRecognition"
        }
    
    try:
        result_container = {}
        
        def run_jarvis():
            try:
                result_container["response"] = Jarvis.jarvis(body.command)
            except Exception as e:
                result_container["error"] = str(e)
                print(f"[Jarvis] Error: {e}")
        
        thread = threading.Thread(target=run_jarvis)
        thread.start()
        thread.join(timeout=60)
        
        if thread.is_alive():
            return {"ok": False, "error": "Таймаут: Jarvis не ответил за 60 секунд"}
        
        if "error" in result_container:
            return {"ok": False, "error": result_container["error"]}
        
        return {"ok": True, "response": result_container.get("response", "Команда выполнена")}
    except Exception as e:
        print(f"[Jarvis] Exception: {e}")
        return {"ok": False, "error": str(e)}


@app.get("/jarvis/status")
def jarvis_status() -> dict:
    return {
        "ok": True,
        "status": "ready" if JARVIS_AVAILABLE else "not_installed",
        "available": JARVIS_AVAILABLE,
        "features": ["voice", "text", "image_generation", "console_commands"] if JARVIS_AVAILABLE else []
    }


@app.post("/jarvis/tts")
def jarvis_tts(body: dict) -> dict:
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
    audio_path = os.path.join(os.path.dirname(__file__), filename)
    
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(audio_path, media_type="audio/mpeg")


if __name__ == "__main__":
    import uvicorn
    
    # Находим свободный порт
    print("=" * 50)
    print("Xcord Core Server - Starting...")
    print("=" * 50)
    
    try:
        port = find_free_port(8000, 100)
    except RuntimeError as e:
        print(f"[ERROR] {e}")
        input("Press Enter to exit...")
        exit(1)
    
    # Запускаем UDP discovery
    start_udp_discovery(port)
    
    print()
    print("Доступные endpoints:")
    print("  • GET  /                  - Главная страница")
    print("  • GET  /health            - Проверка здоровья")
    print("  • WS   /ws/{username}     - WebSocket P2P signaling")
    print("  • GET  /messages          - История сообщений")
    print("  • GET  /peers             - Подключённые клиенты")
    print("  • POST /auth/register     - Регистрация")
    print("  • POST /auth/login        - Вход")
    print("  • GET  /auth/verify/{id}  - Проверка пользователя")
    print("  • POST /jarvis/command    - Команда для Jarvis")
    print("  • GET  /jarvis/status     - Статус Jarvis")
    print("  • POST /jarvis/tts        - Генерация аудио")
    print("  • GET  /jarvis/audio/{f}  - Аудиофайл")
    print("  • GET  /docs              - API документация")
    print()
    print(f"Server running on http://localhost:{port}")
    print(f"UDP Discovery on port {DISCOVERY_PORT}")
    print("API docs: http://localhost:{port}/docs")
    print()
    print("Для остановки нажмите Ctrl+C")
    print("=" * 50)
    
    uvicorn.run(app, host="0.0.0.0", port=port)
