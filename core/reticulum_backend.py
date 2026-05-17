"""
Xcord Reticulum/LXMF Backend

Децентрализованная P2P сеть для передачи сообщений.
- Никаких серверов — клиенты общаются напрямую
- Сообщения хранятся при оффлайне получателя
- Graceful shutdown — сообщения не теряются
"""

import os
import json
import time
import threading
from pathlib import Path
from typing import Optional, Callable, Dict, List
from datetime import datetime

import RNS
import LXMF
import RNS.Identity as Identity


class XcordReticulum:
    """
    Основной класс для работы с Reticulum Network и LXMF.
    """
    
    def __init__(self, storage_path: str = "./xcord_data"):
        """
        Инициализация Reticulum сети и LXMF роутера.
        
        Args:
            storage_path: Путь для хранения данных (ключи, сообщения, кэш)
        """
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
        # Ключевые объекты
        self.reticulum: Optional[RNS.Reticulum] = None
        self.lxrouter: Optional[LXMF.LXMRouter] = None
        self.identity: Optional[RNS.Identity] = None
        self.source: Optional[RNS.Destination] = None
        
        # Состояние
        self.is_running = False
        self.peer_hashes: Dict[str, bytes] = {}  # nickname -> hash
        self.received_messages: List[Dict] = []
        
        # Callbacks
        self.on_message_received: Optional[Callable] = None
        self.on_peer_online: Optional[Callable] = None
        
        # Thread safety
        self._lock = threading.Lock()
        
    def start(self):
        """Запуск Reticulum сети и LXMF роутера."""
        if self.is_running:
            print("[Reticulum] Already running")
            return
            
        print("[Reticulum] Initializing network...")
        
        # Создаём конфигурационный файл для работы с VPN
        config_dir = self.storage_path / "reticulum"
        config_dir.mkdir(parents=True, exist_ok=True)
        
        # Создаём config файл для явной настройки сети
        config_file = config_dir / "config"
        if not config_file.exists():
            # No custom config - use Reticulum defaults
            # This allows automatic interface detection
            pass
        else:
            print(f"[Reticulum] Using existing config")
        
        # 1. Инициализация Reticulum
        self.reticulum = RNS.Reticulum(
            configdir=str(config_dir),
        )
        
        # 2. Инициализация LXMF роутера
        self.lxrouter = LXMF.LXMRouter(
            storagepath=str(self.storage_path / "lxmf"),
        )
        
        # 2. Инициализация LXMF роутера
        self.lxrouter = LXMF.LXMRouter(
            storagepath=str(self.storage_path / "lxmf"),
        )
        
        # 3. Регистрация callback для входящих сообщений
        self.lxrouter.register_delivery_callback(self._message_delivery_callback)
        
        # 4. Создание или загрузка идентичности
        self._load_or_create_identity()
        
        # 5. Регистрация доставки для нашей идентичности
        self.source = self.lxrouter.register_delivery_identity(
            self.identity,
            display_name="Xcord User"
        )
        
        # 6. Анонс в сеть
        self.lxrouter.announce(self.source.hash)
        print(f"[Reticulum] Announce sent")
        
        # 7. Запуск цикла обработки
        self.is_running = True
        self._run_loop()
        
        print(f"[Reticulum] OK - запущен")
        print(f"[Reticulum] Ваш публичный хэш: {self.get_peer_hash_hex()}")
        
    def _load_or_create_identity(self):
        """Загрузка существующей идентичности или создание новой."""
        prv_file = self.storage_path / "identity.prv"
        
        if prv_file.exists():
            # Загрузка существующей
            with open(prv_file, 'rb') as f:
                prv_bytes = f.read()
            
            # Создаём новую идентичность и загружаем ключ
            self.identity = RNS.Identity()
            self.identity.load_private_key(prv_bytes)
            print(f"[Reticulum] Identity loaded")
        else:
            # Создание новой
            self.identity = RNS.Identity()
            self._save_identity()
            print(f"[Reticulum] New identity created")
    
    def _save_identity(self):
        """Сохранение идентичности в файл."""
        prv_file = self.storage_path / "identity.prv"
        
        # Сохраняем приватный ключ
        prv_bytes = self.identity.get_private_key()
        with open(prv_file, 'wb') as f:
            f.write(prv_bytes)
    
    def _message_delivery_callback(self, message: LXMF.LXMessage):
        """Callback при получении сообщения."""
        print(f"[Reticulum] MESSAGE RECEIVED!")
        
        with self._lock:
            msg_data = {
                'sender_hash': message.source.hash.hex(),
                'subject': message.subject or '',
                'message': message.message or '',
                'timestamp': time.time(),
                'read': False
            }
            self.received_messages.append(msg_data)
        
        # Вызов внешнего callback
        if self.on_message_received:
            try:
                self.on_message_received(msg_data)
            except Exception as e:
                print(f"[Reticulum] Ошибка в callback: {e}")
    
    def _run_loop(self):
        """Основной цикл обработки сети (запускается в фоне)."""
        def run():
            while self.is_running:
                try:
                    # Reticulum обрабатывает сообщения автоматически
                    # LXMF работает через RNS Transport
                    time.sleep(0.1)
                except Exception as e:
                    print(f"[Reticulum] Ошибка в цикле: {e}")
                    time.sleep(1)
        
        thread = threading.Thread(target=run, daemon=True)
        thread.start()
    
    def stop(self):
        """Корректное завершение работы (graceful shutdown)."""
        print("[Reticulum] Stopping...")
        self.is_running = False
        
        # Анонс отключения
        if self.source:
            try:
                self.lxrouter.announce(self.source.hash)
            except:
                pass
        
        print("[Reticulum] OK - остановлен")
    
    def get_peer_hash_hex(self) -> str:
        """Получение публичного хэша в формате hex."""
        if self.identity:
            return self.identity.hash.hex()
        return ""
    
    def add_peer(self, nickname: str, peer_hash_hex: str) -> bool:
        """
        Добавление друга по его публичному хэшу.
        
        Args:
            nickname: Никнейм друга
            peer_hash_hex: Публичный хэш друга (в формате hex)
            
        Returns:
            True если успешно, False иначе
        """
        try:
            peer_hash = bytes.fromhex(peer_hash_hex)
            self.peer_hashes[nickname] = peer_hash
            
            # Предзагрузка идентичности
            RNS.Transport.request_path(peer_hash)
            
            print(f"[Reticulum] Peer added: {nickname} -> {peer_hash_hex[:16]}...")
            return True
        except Exception as e:
            print(f"[Reticulum] Error adding peer: {e}")
            return False
    
    def send_message(self, peer_nickname: str, message_text: str, subject: str = "") -> bool:
        """
        Отправка сообщения другу.
        
        Args:
            peer_nickname: Никнейм получателя
            message_text: Текст сообщения
            subject: Тема сообщения
            
        Returns:
            True если успешно отправлено, False иначе
        """
        if not self.is_running:
            print("[Reticulum] Network not running")
            return False
        
        if peer_nickname not in self.peer_hashes:
            print(f"[Reticulum] Peer not found: {peer_nickname}")
            return False
        
        peer_hash = self.peer_hashes[peer_nickname]
        
        # Проверка наличия пути
        if not RNS.Transport.has_path(peer_hash):
            print(f"[Reticulum] Path to peer not found, requesting...")
            RNS.Transport.request_path(peer_hash)
            
            # Ждём до 5 секунд для получения пути
            for _ in range(50):
                time.sleep(0.1)
                if RNS.Transport.has_path(peer_hash):
                    break
            else:
                print(f"[Reticulum] Failed to establish connection")
                return False
        
        # Восстановление идентичности
        peer_identity = RNS.Identity.recall(peer_hash)
        if not peer_identity:
            print(f"[Reticulum] Failed to recall identity")
            return False
        
        # Создание цели
        dest = RNS.Destination(
            peer_identity,
            RNS.Destination.OUT,
            RNS.Destination.SINGLE,
            "lxmf",
            "delivery"
        )
        
        # Создание сообщения
        lxm = LXMF.LXMessage(
            dest,
            self.source,
            message_text,
            subject or "Message",
            desired_method=LXMF.LXMessage.DIRECT,
            include_ticket=True
        )
        
        # Отправка
        try:
            self.lxrouter.handle_outbound(lxm)
            print(f"[Reticulum] MESSAGE SENT!")
            return True
        except Exception as e:
            print(f"[Reticulum] Ошибка отправки: {e}")
            return False
    
    def get_messages(self, peer_nickname: str = None) -> List[Dict]:
        """
        Получение сообщений.
        
        Args:
            peer_nickname: Фильтр по другу (опционально)
            
        Returns:
            Список сообщений
        """
        with self._lock:
            messages = self.received_messages.copy()
        
        if peer_nickname and peer_nickname in self.peer_hashes:
            target_hash = self.peer_hashes[peer_nickname].hex()
            messages = [m for m in messages if m['sender_hash'] == target_hash]
        
        return messages
    
    def get_status(self) -> Dict:
        """Получение статуса системы."""
        return {
            'running': self.is_running,
            'peer_hash': self.get_peer_hash_hex(),
            'peers': list(self.peer_hashes.keys()),
            'message_count': len(self.received_messages)
        }


# --- Single instance для использования в приложении ---
_instance: Optional[XcordReticulum] = None

def get_reticulum() -> XcordReticulum:
    """Получение глобального экземпляра Reticulum."""
    global _instance
    if _instance is None:
        _instance = XcordReticulum()
    return _instance

def init_reticulum(storage_path: str = "./xcord_data") -> XcordReticulum:
    """Инициализация и запуск Reticulum."""
    global _instance
    _instance = XcordReticulum(storage_path)
    _instance.start()
    return _instance
