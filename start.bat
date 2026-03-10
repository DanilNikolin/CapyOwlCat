@echo off
chcp 65001 >nul
echo ========================================================
echo   Запуск шайтан-машины (CapyOwlCat + Python TTS) 
echo ========================================================
echo.

echo [1] Стартуем Python локальный TTS микросервис (Piper TTS)...
start "TTS Service" cmd /k "cd /d %~dp0tts-service && call .\.venv\Scripts\activate && echo Запущено окружение && uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

echo [2] Стартуем основной фронт (Next.js)...
start "Next.js Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Все запущено! Открылись 2 черных окна.
echo Чтобы выключить сервера, просто закрой эти два окна (или нажми в них Ctrl+C).
echo.
pause
