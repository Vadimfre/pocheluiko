#!/bin/bash

echo "Запуск приложения 'Экология и мир'"
echo ""
echo "Запуск backend сервера..."
cd backend
python3 app.py &
BACKEND_PID=$!
cd ..

sleep 3

echo ""
echo "Запуск frontend приложения..."
npm start &
FRONTEND_PID=$!

echo ""
echo "Оба сервера запущены!"
echo "Backend: http://localhost:5001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Для остановки нажмите Ctrl+C"

# Ожидание сигнала завершения
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait

