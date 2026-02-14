#!/bin/bash

# SOMNI AI Startup Script
# Starts both Python backend and Next.js frontend

echo "🚀 Starting SOMNI AI..."
echo ""

# Check if Python dependencies are installed
if [ ! -d "python/venv" ]; then
    echo "📦 Setting up Python virtual environment..."
    cd python
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
fi

# Check if Node modules are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Check environment file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your API keys"
    echo ""
fi

echo "Starting Python backend (port 8000)..."
cd python
source venv/bin/activate
python api/main.py &
PYTHON_PID=$!
cd ..

echo "Waiting for Python backend to start..."
sleep 3

echo "Starting Next.js frontend (port 3000)..."
npm run dev &
NEXT_PID=$!

echo ""
echo "✅ SOMNI AI is running!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user interrupt
wait $PYTHON_PID $NEXT_PID
