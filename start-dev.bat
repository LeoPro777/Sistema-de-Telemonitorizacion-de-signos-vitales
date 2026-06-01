@echo off
echo ====================================================
echo Iniciando Sistema de Telemonitorización (Dev Mode)
echo ====================================================

echo [1/2] Levantando Backend (FastAPI)...
start "Backend - FastAPI" cmd /k "set PYTHONPATH=%cd%&& cd backend && call venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo [2/2] Levantando Frontend (Vite)...
start "Frontend - React" cmd /k "cd frontend && npm run dev"

echo.
echo Los servidores se estan iniciando en nuevas ventanas.
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - Swagger Docs: http://localhost:8000/docs
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
