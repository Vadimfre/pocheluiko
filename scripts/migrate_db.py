#!/usr/bin/env python3
"""
Скрипт для миграции базы данных ecology.db
Добавляет недостающие колонки в существующую базу данных
"""

import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ecology.db")

def migrate_database():
    """Применить миграции к существующей базе данных."""
    if not os.path.exists(DB_PATH):
        print(f"❌ База данных не найдена: {DB_PATH}")
        print("Запустите backend сервер для создания базы данных")
        return
    
    print(f"🔄 Начинаем миграцию базы данных: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Проверяем структуру таблицы users
    cur.execute("PRAGMA table_info(users)")
    columns = [column[1] for column in cur.fetchall()]
    
    print(f"\n📋 Текущие колонки в таблице users: {', '.join(columns)}")
    
    migrations_applied = 0
    
    # Миграция 1: Добавление колонки avatar
    if 'avatar' not in columns:
        print("\n➕ Добавляем колонку 'avatar'...")
        cur.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
        migrations_applied += 1
        print("✅ Колонка 'avatar' добавлена")
    else:
        print("\n✓ Колонка 'avatar' уже существует")
    
    # Миграция 2: Добавление колонки bio
    if 'bio' not in columns:
        print("\n➕ Добавляем колонку 'bio'...")
        cur.execute("ALTER TABLE users ADD COLUMN bio TEXT")
        migrations_applied += 1
        print("✅ Колонка 'bio' добавлена")
    else:
        print("\n✓ Колонка 'bio' уже существует")
    
    # Миграция 3: Добавление колонки location
    if 'location' not in columns:
        print("\n➕ Добавляем колонку 'location'...")
        cur.execute("ALTER TABLE users ADD COLUMN location TEXT")
        migrations_applied += 1
        print("✅ Колонка 'location' добавлена")
    else:
        print("\n✓ Колонка 'location' уже существует")
    
    # Сохраняем изменения
    conn.commit()
    
    # Проверяем обновленную структуру
    cur.execute("PRAGMA table_info(users)")
    updated_columns = [column[1] for column in cur.fetchall()]
    
    print(f"\n📋 Обновленные колонки в таблице users: {', '.join(updated_columns)}")
    
    # Проверяем количество пользователей
    cur.execute("SELECT COUNT(*) as count FROM users")
    user_count = cur.fetchone()[0]
    print(f"\n👥 Количество пользователей в базе: {user_count}")
    
    conn.close()
    
    print(f"\n{'='*60}")
    if migrations_applied > 0:
        print(f"✅ Миграция завершена успешно! Применено изменений: {migrations_applied}")
    else:
        print("✅ База данных уже актуальна, миграции не требуются")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    migrate_database()
