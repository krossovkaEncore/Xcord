import os
import re
import uuid
# pygame  # ОТКЛЮЧЕНО - проблемы со сборкой
import threading
import queue
from openai import OpenAI
from huggingface_hub import InferenceClient
import config

# === gTTS - быстрая озвучка ===
from gtts import gTTS
# ===============================

_speak_queue = queue.Queue()
_speak_worker_started = False
_tts_lock = threading.Lock()

_utterance_seq = 0


# play_audio ОТКЛЮЧЕНО
# def play_audio(file_path):
#     """Воспроизводит аудио-файл через PyGame"""
#     try:
#         pygame.time.wait(100)
#         
#         pygame.mixer.music.load(file_path)
#         pygame.mixer.music.play()
#         
#         while pygame.mixer.music.get_busy():
#             pygame.time.Clock().tick(10)
#
#         try:
#             pygame.mixer.music.stop()
#             if hasattr(pygame.mixer.music, "unload"):
#                 pygame.mixer.music.unload()
#         except Exception:
#             pass
#             
#         if os.path.exists(file_path):
#             for _ in range(10):
#                 try:
#                     os.remove(file_path)
#                     break
#                 except Exception:
#                     import time
#                     time.sleep(0.1)
#     except Exception as e:
#         print(f"Ошибка воспроизведения: {e}")

# _ensure_speak_worker ОТКЛЮЧЕНО
# def _ensure_speak_worker():
#     global _speak_worker_started
#     if _speak_worker_started:
#         return
#     _speak_worker_started = True
#     thread = threading.Thread(target=_speak_worker, daemon=True)
#     thread.start()
#
#
# def _speak_worker():
#     while True:
#         text, filename = _speak_queue.get()
#         try:
#             with _tts_lock:
#                 # gTTS - быстрая озвучка
#                 tts_obj = gTTS(text=text, lang=config.XTTS_LANGUAGE, slow=False)
#                 tts_obj.save(filename)
#             
#             try:
#                 if pygame.mixer.get_init() is None:
#                     pygame.mixer.init()
#             except Exception as e:
#                 print(f"Ошибка инициализации звука: {e}")
#                 
#             play_audio(filename)
#             
#         except Exception as e:
#             print(f"Ошибка озвучки: {e}")
#         finally:
#             _speak_queue.task_done()
#
#
# def speak(text):
#     """Озвучивает текст через gTTS (быстро)"""
#     global _utterance_seq
#     _utterance_seq += 1
#     seq = _utterance_seq
#
#     _ensure_speak_worker()
#
#     if not text or not text.strip():
#         return
#
#     if seq != _utterance_seq:
#         return
#
#     file_path = f"{uuid.uuid4().hex}.mp3"
#     _speak_queue.put((text.strip(), file_path))


def jarvis(message):
    """Основная функция Jarvis"""
    try:
        # Генерация картинок
        for word in message.split():
            if "картин" in word.lower() or "изображен" in word.lower() or "фот" in word.lower() or "рисуй" in word.lower():
                try:
                    client = InferenceClient(
                        provider="hf-inference",
                        api_key=config.HF_TOKEN,
                    )
                    image = client.text_to_image(
                        message,
                        model="stabilityai/stable-diffusion-xl-base-1.0",
                    )
                    hex_name = uuid.uuid4().hex
                    image.save(f"{hex_name}.jpg")
                    return "Картина: " + f"{hex_name}.jpg"
                except Exception as e:
                    return f"Ошибка генерации картинки: {str(e)[:100]}"
    except Exception as e:
        return f"Ошибка при обработке команды: {str(e)[:100]}"

    # Запрос к HF API
    try:
        client = OpenAI(
            base_url="https://router.huggingface.co/v1",
            api_key=config.HF_TOKEN,
        )
        response = client.chat.completions.create(
            model=config.aiModel,
            messages=[
                {"role": "system", "content": config.prompt},
                {"role": "user", "content": message}
            ],
            timeout=30
        )
        raw_answer = response.choices[0].message.content
    except Exception as e:
        return f"Ошибка API HuggingFace: {str(e)[:100]}. Проверьте токен или попробуйте позже."

    # Обработка console:{...} команд
    cmd_match = re.search(r'console:\{([^}]*)\}', raw_answer)
    executed_cmd = None
    if cmd_match:
        executed_cmd = cmd_match.group(1)
        try:
            os.system(executed_cmd)
        except Exception as e:
            return f"Ошибка выполнения команды {executed_cmd}: {str(e)[:100]}"

    answer_without_block = re.sub(r'console:\{[^}]*\}', '', raw_answer).strip()
    if executed_cmd:
        spoken_text = answer_without_block.replace(executed_cmd, '').strip()
    else:
        spoken_text = answer_without_block

    final_answer = answer_without_block
    if executed_cmd:
        final_answer = (final_answer + f"\n\nВыполнено: {executed_cmd}").strip()

    return final_answer


# === ТЕСТ ===
if __name__ == "__main__":
    # pygame.mixer.init()  # ОТКЛЮЧЕНО
    print("--------------------------------")
    print("gTTS mode - быстрая озвучка (ОТКЛЮЧЕНА)")
    print("--------------------------------")
    while True:
        msg = input("Ты: ")
        if msg.lower() in ["выход", "exit"]: 
            break
        print("--------------------------------")
        print("JARVIS:", jarvis(message=msg))
        print("--------------------------------")
