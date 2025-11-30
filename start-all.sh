#!/bin/bash

# VIBE Platform Startup Script

echo "🚀 Starting VIBE Platform..."

# Function to kill all background processes when script is stopped
cleanup() {
    echo ""
    echo "🛑 Shutting down all services..."
    # Kill all child processes in the current process group
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) to run cleanup function
trap cleanup SIGINT

# 1. Start Backend (Signaling Server)
echo "📦 Starting Backend Server..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
# Check for .env
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: backend/.env not found. Copying .env.example if it exists or ensure env vars are set."
fi

npm run dev &
BACKEND_PID=$!
cd ..

# 2. Start Face Service (Python)
echo "👁️  Starting Face Detection Service..."
cd face-service
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Check if requirements installed (simple check)
if ! pip freeze | grep -q "fastapi"; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Run with uvicorn directly for better control or via python main.py
python3 main.py &
FACE_SERVICE_PID=$!
cd ..

# 3. Start Frontend (Next.js)
echo "🎨 Starting Frontend..."
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Please create it with:"
    echo "   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000"
    echo "   NEXT_PUBLIC_FACE_SERVICE_URL=http://localhost:5001"
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ All services started!"
echo "   - Frontend:     http://localhost:3000"
echo "   - Backend:      http://localhost:4000"
echo "   - Face Service: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop."

# Wait for processes to finish (keeps script running)
wait
