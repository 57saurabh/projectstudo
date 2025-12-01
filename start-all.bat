@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting VIBE Platform...

:: 1. Start Backend (Signaling Server)
echo 📦 Starting Backend Server...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
)
:: Check for .env
if not exist .env (
    echo ⚠️  Warning: backend/.env not found. Copying .env.example if it exists or ensure env vars are set.
)

start "VIBE Backend" cmd /k "npm run dev"
cd ..

:: 2. Start Face Service (Python)
echo 👁️  Starting Face Detection Service...
cd face-service
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat

:: Check if requirements installed (simple check)
pip freeze | findstr "fastapi" >nul
if %errorlevel% neq 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
)

start "VIBE Face Service" cmd /k "call venv\Scripts\activate.bat && python main.py"
cd ..

:: 3. Start Frontend (Next.js)
echo 🎨 Starting Frontend...
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

:: Check for .env.local
if not exist .env.local (
    echo ⚠️  Warning: .env.local not found. Please create it with:
    echo    NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
    echo    NEXT_PUBLIC_FACE_SERVICE_URL=http://localhost:5001
)

start "VIBE Frontend" cmd /k "npm run dev"

echo.
echo ✅ All services started in separate windows!
echo    - Frontend:     http://localhost:3000
echo    - Backend:      http://localhost:4000
echo    - Face Service: http://localhost:5001
echo.
echo Press any key to exit this launcher (services will keep running)...
pause >nul
