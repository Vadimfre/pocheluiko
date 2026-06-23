#!/usr/bin/env python3
"""
Тестовый скрипт для проверки функционала профиля
"""

import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ecology.db")

def test_database_structure():
    """Проверить структуру базы данных."""
    print("🔍 Проверка структуры базы данных...\n")
    
    if not os.path.exists(DB_PATH):
        print("❌ База данных не найдена!")
        print(f"   Путь: {DB_PATH}")
        print("\n💡 Запустите backend сервер для создания БД:")
        print("   cd backend && python app.py")
        return False
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Проверяем таблицу users
    cur.execute("PRAGMA table_info(users)")
    columns = {column[1]: column[2] for column in cur.fetchall()}
    
    print("📋 Структура таблицы users:")
    print("-" * 50)
    for col_name, col_type in columns.items():
        print(f"   {col_name:20} {col_type}")
    print("-" * 50)
    
    # Проверяем необходимые колонки
    required_columns = {
        'id': 'INTEGER',
        'name': 'TEXT',
        'email': 'TEXT',
        'password_salt': 'TEXT',
        'password_hash': 'TEXT',
        'avatar': 'TEXT',
        'bio': 'TEXT',
        'location': 'TEXT',
        'created_at': 'TEXT'
    }
    
    print("\n✅ Проверка обязательных колонок:")
    all_ok = True
    for col_name in required_columns:
        if col_name in columns:
            print(f"   ✓ {col_name}")
        else:
            print(f"   ✗ {col_name} - ОТСУТСТВУЕТ!")
            all_ok = False
    
    # Проверяем пользователей
    cur.execute("SELECT COUNT(*) as count FROM users")
    user_count = cur.fetchone()[0]
    print(f"\n👥 Пользователей в базе: {user_count}")
    
    if user_count > 0:
        cur.execute("""
            SELECT id, name, email, 
                   CASE WHEN avatar IS NOT NULL THEN 'Да' ELSE 'Нет' END as has_avatar,
                   CASE WHEN bio IS NOT NULL THEN 'Да' ELSE 'Нет' END as has_bio,
                   CASE WHEN location IS NOT NULL THEN 'Да' ELSE 'Нет' END as has_location
            FROM users LIMIT 5
        """)
        users = cur.fetchall()
        
        print("\n📊 Примеры пользователей:")
        print("-" * 80)
        print(f"{'ID':<5} {'Имя':<20} {'Email':<25} {'Аватар':<8} {'Био':<5} {'Место':<8}")
        print("-" * 80)
        for user in users:
            print(f"{user[0]:<5} {user[1]:<20} {user[2]:<25} {user[3]:<8} {user[4]:<5} {user[5]:<8}")
        print("-" * 80)
    
    conn.close()
    
    print("\n" + "=" * 60)
    if all_ok:
        print("✅ База данных настроена правильно!")
        print("   Загрузка аватаров и редактирование профиля должны работать.")
    else:
        print("❌ В базе данных отсутствуют необходимые колонки!")
        print("\n💡 Запустите миграцию:")
        print("   python migrate_db.py")
        print("   или")
        print("   python app.py (миграция применится автоматически)")
    print("=" * 60)
    
    return all_ok


def check_upload_folder():
    """Проверить папку для загрузки аватаров."""
    print("\n📁 Проверка папки для загрузки аватаров...\n")
    
    upload_folder = os.path.join(BASE_DIR, "uploads", "avatars")
    
    if os.path.exists(upload_folder):
        print(f"✅ Папка существует: {upload_folder}")
        
        # Проверяем права
        if os.access(upload_folder, os.W_OK):
            print("✅ Папка доступна для записи")
        else:
            print("❌ Нет прав на запись в папку!")
            print(f"\n💡 Исправьте права:")
            print(f"   chmod 755 {upload_folder}")
        
        # Проверяем содержимое
        files = [f for f in os.listdir(upload_folder) if not f.startswith('.')]
        if files:
            print(f"\n📷 Загружено аватаров: {len(files)}")
            for f in files[:5]:  # Показываем первые 5
                print(f"   - {f}")
            if len(files) > 5:
                print(f"   ... и еще {len(files) - 5}")
        else:
            print("\n📷 Загруженных аватаров пока нет")
    else:
        print(f"❌ Папка не существует: {upload_folder}")
        print("\n💡 Создайте папку:")
        print(f"   mkdir -p {upload_folder}")


if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("  ТЕСТ ФУНКЦИОНАЛА ПРОФИЛЯ")
    print("=" * 60 + "\n")
    
    db_ok = test_database_structure()
    check_upload_folder()
    
    print("\n" + "=" * 60)
    if db_ok:
        print("🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!")
        print("\nТеперь вы можете:")
        print("  1. Запустить backend: python app.py")
        print("  2. Открыть профиль в браузере")
        print("  3. Загрузить аватар и отредактировать информацию")
    else:
        print("⚠️  ТРЕБУЕТСЯ МИГРАЦИЯ БАЗЫ ДАННЫХ")
        print("\nВыполните:")
        print("  python migrate_db.py")
        print("  или просто запустите: python app.py")
    print("=" * 60 + "\n")
