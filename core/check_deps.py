"""
Проверка установленных зависимостей Xcord
Запустите: python check_deps.py
"""

import sys
import io

# UTF-8 для консоли
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

REQUIRED_PACKAGES = {
    'fastapi': '0.109.0',
    'uvicorn': '0.27.0',
    'pydantic': '2.5.0',
    'reticulum': '0.7.0',
    'lxmf': '0.9.6',
    'pygame': '2.5.2',
    'gtts': '2.5.1',
    'openai': '1.10.0',
    'huggingface_hub': '0.20.0',
    'SpeechRecognition': '3.10.0',
}

def check_package(name, required_version=None):
    """Проверка наличия пакета"""
    try:
        module = __import__(name)
        version = getattr(module, '__version__', 'unknown')
        return True, version
    except ImportError:
        return False, None

print("=" * 60)
print("Проверка зависимостей Xcord")
print("=" * 60)
print()

all_ok = True
for package, required_ver in REQUIRED_PACKAGES.items():
    ok, version = check_package(package)
    if ok:
        print(f"[OK] {package:30} {version}")
    else:
        print(f"[FAIL] {package:30} NOT INSTALLED")
        all_ok = False

print()
print("=" * 60)

if all_ok:
    print("Все зависимости установлены!")
    print()
    print("Для запуска сервера:")
    print("  python app.py")
else:
    print("Некоторые зависимости отсутствуют")
    print()
    print("Установите отсутствующие пакеты:")
    print("  pip install -r requirements.txt")

print("=" * 60)
sys.exit(0 if all_ok else 1)