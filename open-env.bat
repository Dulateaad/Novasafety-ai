@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Файл .env не найден в:
  echo %cd%
  echo.
  echo Скопируйте .env.example в .env и вставьте ключи.
  copy /Y ".env.example" ".env" >nul 2>&1
)
notepad ".env"
pause
