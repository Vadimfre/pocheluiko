#!/usr/bin/env python3
"""
Скрипт для проверки обновления профиля
Проверяет, что endpoint /api/users/<id>/profile работает корректно
"""

import sqlite3
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ecology.db")

def check_profile_update():
    """Проверить возможность обновления профиля."""
    print("\n" + "=" * 70)
    print("  ПРОВЕРКА ОБНОВЛЕНИЯ ПРОФИЛЯ")
    print("=" * 70 + "\n")
    
    if not os.path.exists(DB_PATH):
        print("❌ База данных не найдена!")
        print(f"   Путь: {DB_PATH}")
        print("\n💡 Запустите backend сервер для создания БД:")
        print("   cd backend && python app.py")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Проверяем структуру таблицы users
    print("📋 Проверка структуры таблицы users...")
    cur.execute("PRAGMA table_info(users)")
    columns = {column[1]: column[2] for column in cur.fetchall()}
    
    required_columns = ['id', 'name', 'email', 'avatar', 'bio', 'location']
    missing_columns = [col for col in required_columns if col not in columns]
    
    if missing_columns:
        print(f"❌ Отсутствуют колонки: {', '.join(missing_columns)}")
        print("\n💡 Запустите миграцию:")
        print("   python migrate_db.py")
        conn.close()
        return False
    
    print("✅ Все необходимые колонки присутствуют\n")
    
    # Проверяем пользователей
    cur.execute("SELECT COUNT(*) as count FROM users")
    user_count = cur.fetchone()[0]
    
    if user_count == 0:
        print("⚠️  В базе данных нет пользователей")
        print("\n💡 Зарегистрируйте пользователя через интерфейс")
        conn.close()
        return True
    
    print(f"👥 Пользователей в базе: {user_count}\n")
    
    # Показываем информацию о пользователях
    cur.execute("""
        SELECT 
            id, 
            name, 
            email,
            CASE WHEN avatar IS NOT NULL AND avatar != '' THEN '✓' ELSE '✗' END as has_avatar,
            CASE WHEN bio IS NOT NULL AND bio != '' THEN '✓' ELSE '✗' END as has_bio,
            CASE WHEN location IS NOT NULL AND location != '' THEN '✓' ELSE '✗' END as has_location
        FROM users
        ORDER BY id
    """)
    users = cur.fetchall()
    
    print("📊 Состояние профилей пользователей:")
    print("-" * 70)
    print(f"{'ID':<5} {'Имя':<20} {'Email':<25} {'Аватар':<8} {'Био':<5} {'Место':<8}")
    print("-" * 70)
    
    for user in users:
        print(f"{user[0]:<5} {user[1]:<20} {user[2]:<25} {user[3]:<8} {user[4]:<5} {user[5]:<8}")
    
    print("-" * 70)
    
    # Проверяем папку для аватаров
    upload_folder = os.path.join(BASE_DIR, "uploads", "avatars")
    print(f"\n📁 Проверка папки для аватаров...")
    
    if not os.path.exists(upload_folder):
        print(f"❌ Папка не существует: {upload_folder}")
        print("\n💡 Создайте папку:")
        print(f"   mkdir -p {upload_folder}")
        conn.close()
        return False
    
    if not os.access(upload_folder, os.W_OK):
        print(f"❌ Нет прав на запись в папку: {upload_folder}")
        print("\n💡 Исправьте права:")
        print(f"   chmod 755 {upload_folder}")
        conn.close()
        return False
    
    print(f"✅ Папка существует и доступна для записи")
    
    # Проверяем загруженные аватары
    files = [f for f in os.listdir(upload_folder) if not f.startswith('.')]
    if files:
        print(f"📷 Загружено аватаров: {len(files)}")
    else:
        print("📷 Загруженных аватаров пока нет")
    
    conn.close()
    
    print("\n" + "=" * 70)
    print("✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!")
    print("\nПрофиль должен обновляться корректно.")
    print("\nЕсли проблема сохраняется:")
    print("  1. Проверьте консоль браузера (F12) на наличие ошибок")
    print("  2. Проверьте логи backend сервера")
    print("  3. Убедитесь, что backend запущен на порту 5001")
    print("  4. Попробуйте очистить кэш браузера (Ctrl+Shift+Delete)")
    print("=" * 70 + "\n")
    
    return True


def test_profile_endpoint():
    """Тест endpoint обновления профиля."""
    print("\n" + "=" * 70)
    print("  ТЕСТ ENDPOINT /api/users/<id>/profile")
    print("=" * 70 + "\n")
    
    print("💡 Для тестирования endpoint запустите backend и выполните:")
    print("\n   # Получить профиль пользователя с ID=1")
    print("   curl http://localhost:5001/api/users/1/profile")
    print("\n   # Обновить профиль (пример)")
    print("   curl -X PATCH http://localhost:5001/api/users/1/profile \\")
    print("        -F 'name=Иван Иванов' \\")
    print("        -F 'bio=Люблю природу' \\")
    print("        -F 'location=Минск'")
    print("\n" + "=" * 70 + "\n")


if __name__ == '__main__':
    success = check_profile_update()
    
    if '--test-endpoint' in sys.argv:
        test_profile_endpoint()
    
    sys.exit(0 if success else 1)
