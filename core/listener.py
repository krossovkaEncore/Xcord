import time
import re
import pygame
import speech_recognition as sr
import Jarvis


WAKE_WORDS = ("jarvis", "джарвис")
_WAKE_RE = re.compile(r"\b(jarvis|джарвис)\b[\s,.:;!?—-]*(.*)$", re.IGNORECASE)


def _normalize(text: str) -> str:
    return (text or "").strip().lower()


def _contains_wake_word(text: str) -> bool:
    t = _normalize(text)
    return any(w in t for w in WAKE_WORDS)

def _extract_after_wake_word(text: str) -> str:
    """
    Возвращает ВСЁ, что сказано ПОСЛЕ wake-word в пределах одной распознанной фразы.
    Если wake-word в конце (после него ничего нет) — вернёт пустую строку.
    """
    m = _WAKE_RE.search(text or "")
    if not m:
        return ""
    return (m.group(2) or "").strip()


def listen_and_dispatch():
    """
    Слушает микрофон.
    Если услышит 'jarvis/джарвис' — ждёт окончание фразы (пауза) и отправляет текст в Jarvis.jarvis(message).
    """
    # Jarvis.jarvis() использует pygame mixer, инициализируем один раз
    try:
        pygame.mixer.init()
    except Exception as e:
        print(f"[listener] pygame.mixer.init() error: {e}")

    r = sr.Recognizer()
    r.dynamic_energy_threshold = True
    r.pause_threshold = 0.9  # сколько тишины считать концом фразы
    r.non_speaking_duration = 0.5

    with sr.Microphone() as source:
        # небольшая калибровка под шум
        try:
            r.adjust_for_ambient_noise(source, duration=0.8)
        except Exception as e:
            print(f"[listener] adjust_for_ambient_noise error: {e}")

        print("[listener] listening... say 'jarvis'")
        while True:
            try:
                # Слушаем до паузы, чтобы "Jarvis <команда...>" целиком попадала в одну фразу.
                # Лимит оставляем большим как safety cap.
                audio = r.listen(source, timeout=None, phrase_time_limit=30)
            except Exception as e:
                print(f"[listener] listen error: {e}")
                time.sleep(0.2)
                continue

            # 1) Распознаём фразу и проверяем wake word
            try:
                text = r.recognize_google(audio, language="ru-RU")
            except sr.UnknownValueError:
                continue
            except Exception as e:
                print(f"[listener] recognize_google (wake) error: {e}")
                continue

            if not _contains_wake_word(text):
                continue

            print(f"[listener] wake word detected: {text!r}")

            # 2) Слушаем следующую реплику до паузы (без жёсткого лимита, но с safety cap)
            #    Если человек говорит сразу после 'Jarvis ...', обычно это уже в одной фразе;
            #    поэтому пробуем извлечь “остаток” после wake word.
            remainder = _extract_after_wake_word(text)

            if remainder:
                message = remainder
            else:
                print("[listener] awaiting command...")
                try:
                    # listen() сам завершает запись по паузе (pause_threshold),
                    # phrase_time_limit — только верхний предел, чтобы не зависнуть навсегда.
                    cmd_audio = r.listen(source, timeout=6, phrase_time_limit=30)
                except sr.WaitTimeoutError:
                    print("[listener] timeout waiting for command")
                    continue
                except Exception as e:
                    print(f"[listener] listen (command) error: {e}")
                    continue

                try:
                    message = r.recognize_google(cmd_audio, language="ru-RU")
                except sr.UnknownValueError:
                    print("[listener] command not recognized")
                    continue
                except Exception as e:
                    print(f"[listener] recognize_google (command) error: {e}")
                    continue

            message = message.strip()
            if not message:
                continue

            print(f"[listener] -> jarvis({message!r})")
            try:
                answer = Jarvis.jarvis(message=message)
                print(f"[listener] jarvis answer: {answer}")
            except Exception as e:
                print(f"[listener] Jarvis.jarvis error: {e}")


if __name__ == "__main__":
    listen_and_dispatch()
