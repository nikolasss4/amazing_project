#!/bin/bash

# Backend Startup Script
# This script helps you start the backend server

echo "🚀 Starting Gamified Trading Backend..."
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.dependencies_installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -e ".[dev]"
    touch venv/.dependencies_installed
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "💡 Creating .env from .env.example (if it exists)..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file - please update it with your credentials"
    fi
fi

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' || ipconfig getifaddr en0 2>/dev/null || echo "unknown")

echo ""
echo "🌐 Backend will be available at:"
echo "   - Local: http://localhost:8000"
echo "   - Network: http://${LOCAL_IP}:8000"
echo ""
echo "📱 Update mobile app config with: http://${LOCAL_IP}:8000"
echo ""
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""
echo "Starting server..."
echo ""

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
