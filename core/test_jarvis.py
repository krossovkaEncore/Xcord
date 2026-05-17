"""
Test Jarvis API endpoint
Запустите: python test_jarvis.py
"""

import requests
import json
import sys

# UTF-8 для консоли
sys.stdout = open(sys.stdout.fileno(), 'w', encoding='utf-8')

BASE_URL = "http://localhost:8000"

def test_jarvis_status():
    """Проверка статуса Jarvis"""
    print("=" * 60)
    print("Testing Jarvis Status...")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/jarvis/status")
        data = response.json()
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        if data.get("available"):
            print("\n[OK] Jarvis is available!")
        else:
            print("\n[FAIL] Jarvis is NOT available!")
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Cannot connect to server!")
        print("Make sure server is running: python app.py")
    except Exception as e:
        print(f"\n[ERROR] {e}")

def test_jarvis_command():
    """Отправка команды Jarvis"""
    print("\n" + "=" * 60)
    print("Testing Jarvis Command...")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{BASE_URL}/jarvis/command",
            json={"command": "привет"}
        )
        data = response.json()
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
        
        if data.get("ok"):
            print(f"\n[OK] Jarvis response: {data.get('response')}")
        else:
            print(f"\n[FAIL] Error: {data.get('error')}")
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Cannot connect to server!")
    except Exception as e:
        print(f"\n[ERROR] {e}")

if __name__ == "__main__":
    print("\nJarvis API Test Suite\n")
    test_jarvis_status()
    test_jarvis_command()
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)