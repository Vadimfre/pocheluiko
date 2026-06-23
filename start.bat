@echo off
echo Запуск приложения "Экология и мир"
echo.
echo Запуск backend сервера...
start cmd /k "cd backend && python app.py"
timeout /t 3 /nobreak >nul
echo.
echo Запуск frontend приложения...
start cmd /k "npm start"
echo.
echo Оба сервера запущены!
echo Backend: http://localhost:5001
echo Frontend: http://localhost:3000
pause

