import os
import re
import uuid
import pygame
import threading
import queue
import torch
import time
from TTS.api import TTS
from openai import OpenAI
from huggingface_hub import InferenceClient
import config

_speak_queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
_speak_worker_started = False
_tts_lock = threading.Lock()

tts = None
_utterance_seq = 0

def _torch_allow_xtts_checkpoint():
    """
    PyTorch 2.6+ изменил поведение torch.load(): по умолчанию weights_only=True,
    из-за чего XTTS чекпоинты могут падать на safe-unpickling (XttsConfig).
    Разрешаем XttsConfig как безопасный тип.
    """
    serialization = getattr(torch, "serialization", None)
    add_safe_globals = getattr(serialization, "add_safe_globals", None) if serialization else None
    if not callable(add_safe_globals):
        return
    try:
        safe = []
        from TTS.tts.configs.xtts_config import XttsConfig
        safe.append(XttsConfig)
        # Доп. классы, которые встречаются в XTTS чекпоинтах
        from TTS.tts.models.xtts import XttsAudioConfig, XttsArgs
        safe.append(XttsAudioConfig)
        safe.append(XttsArgs)
        from TTS.config.shared_configs import BaseDatasetConfig
        safe.append(BaseDatasetConfig)
        add_safe_globals(safe)
    except Exception as e:
        print(f"XTTS safe_globals warning: {e}")

def load_tts():
    global tts

    if tts is not None:
        return

    print("Loading XTTS...")
    _torch_allow_xtts_checkpoint()
    # gpu=... устаревает в TTS; выбираем устройство через .to(...)
    tts = TTS(model_name=config.XTTS_MODEL)
    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tts = tts.to(device)
    except Exception as e:
        print(f"XTTS device select error: {e}")
    print("XTTS loaded")

def play_audio(file_path: str):
    """Воспроизводит аудио-файл через PyGame"""
    try:
        # Ждём немного, чтобы файл успел записаться
        pygame.time.wait(100)
        
        # Загружаем и воспроизводим
        pygame.mixer.music.load(file_path)
        pygame.mixer.music.play()
        
        # Ждём окончания воспроизведения
        while pygame.mixer.music.get_busy():
            pygame.time.Clock().tick(10)

        # ВАЖНО: освободить файл, иначе на Windows os.remove может дать WinError 32
        try:
            pygame.mixer.music.stop()
            if hasattr(pygame.mixer.music, "unload"):
                pygame.mixer.music.unload()
        except Exception:
            pass
            
        # После воспроизведения удаляем временный файл
        if os.path.exists(file_path):
            last_err = None
            for _ in range(10):
                try:
                    os.remove(file_path)
                    last_err = None
                    break
                except Exception as e:
                    last_err = e
                    time.sleep(0.1)
            if last_err is not None:
                print(f"Ошибка удаления файла озвучки: {last_err}")
    except Exception as e:
        print(f"Ошибка воспроизведения: {e}")

def _ensure_speak_worker():
    global _speak_worker_started
    if _speak_worker_started:
        return
    _speak_worker_started = True
    thread = threading.Thread(target=_speak_worker, daemon=True)
    thread.start()

def _speak_worker():
    while True:
        text, filename = _speak_queue.get()
        try:
            with _tts_lock:
                load_tts()
                tts.tts_to_file(
                    text=text,
                    speaker_wav=config.SPEAKER_WAV,
                    language=config.XTTS_LANGUAGE,
                    file_path=filename,
                    speed=1,
                )
            try:
                if pygame.mixer.get_init() is None:
                    pygame.mixer.init()
            except Exception as e:
                print(f"Ошибка инициализации звука: {e}")
            play_audio(filename)
        except Exception as e:
            print(f"Ошибка озвучки: {e}")
        finally:
            _speak_queue.task_done()

def speak(text: str, filename: str):
    """
    "Stream" без настоящего аудио-стрима: режем текст на фразы и озвучиваем по очереди.
    Первое предложение начнёт играть, пока последующие ещё генерятся.
    """
    global _utterance_seq
    _utterance_seq += 1
    seq = _utterance_seq

    MAX_CHARS = getattr(config, "TTS_MAX_CHARS", 600)
    _ensure_speak_worker()

    # Простейший сплит на фразы (без лишних зависимостей)
    parts = re.split(r'(?<=[.!?])\s+|\n+', (text or "").strip())
    parts = [p.strip() for p in parts if p and p.strip()]
    if not parts:
        return

    # Ограничиваем общий объём, чтобы XTTS не умирал на длинных полотнах
    total = 0
    filtered = []
    for p in parts:
        if total >= MAX_CHARS:
            break
        take = p[: max(0, MAX_CHARS - total)]
        take = take.strip()
        if take:
            filtered.append(take)
            total += len(take)

    for i, p in enumerate(filtered):
        # если пришла новая реплика — старые очереди не озвучиваем
        if seq != _utterance_seq:
            break
        _speak_queue.put((p, f"{uuid.uuid4().hex}.wav"))

# === ОСНОВНАЯ ФУНКЦИЯ ===
def jarvis(message):
    for word in message.split():
        if "картин" in word.lower() or "изображен" in word.lower() or "фот" in word.lower() or "рисуй" in word.lower():
            client = InferenceClient(
                provider="hf-inference",
                api_key=config.HF_TOKEN,
            )

            # output is a PIL.Image object
            image = client.text_to_image(
                message,
                model="stabilityai/stable-diffusion-xl-base-1.0",
            )
            hex = uuid.uuid4().hex
            image.save(f"{hex}.jpg")
            return "Картина: " + f"{hex}.jpg"
    # Запрос к HF API
    client = OpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key=config.HF_TOKEN,
    )
    response = client.chat.completions.create(
        model=config.aiModel,
        messages=[
            {"role": "system", "content": config.prompt},
            {"role": "user", "content": message}
        ]
    )
    raw_answer = response.choices[0].message.content

    # Ищем и выполняем команду формата console:{...}
    cmd_match = re.search(r'console:\{([^}]*)\}', raw_answer)
    executed_cmd = None
    if cmd_match:
        executed_cmd = cmd_match.group(1)
        os.system(executed_cmd)

    # Удаляем из текста и сам блок console:{...}, и внутреннюю команду,
    # чтобы их не озвучивать.
    answer_without_block = re.sub(r'console:\{[^}]*\}', '', raw_answer).strip()
    if executed_cmd:
        spoken_text = answer_without_block.replace(executed_cmd, '').strip()
    else:
        spoken_text = answer_without_block

    # Текстовый ответ пользователю: без console:{...}, но с пометкой о выполнении команды.
    final_answer = answer_without_block
    if executed_cmd:
        final_answer = (final_answer + f"\n\nВыполнено: {executed_cmd}").strip()

    if spoken_text:
        speak(spoken_text, f"{uuid.uuid4().hex}.wav")

    return final_answer

# === ТЕСТ ===
if __name__ == "__main__":
    print("Initializing PyGame...")
    pygame.mixer.init()
    print("PyGame initialized OK")
    print("--------------------------------")
    print("XTTS mode.")
    load_tts()
    print("--------------------------------")
    while True:
        msg = input("Ты: ")
        if msg in ["выход", "exit"]: break
        print("--------------------------------")
        print("JARVIS:", jarvis(message=msg))
        print("--------------------------------")