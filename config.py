"""
Конфигурация для backend приложения
"""

import os

class Config:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'ecology-world-secret-key-2024'
    CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']
    DEBUG = True

