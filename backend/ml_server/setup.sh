#!/bin/bash

echo "======================================"
echo "YOLOv8 ML Server Setup"
echo "======================================"

# Navigate to ml_server directory
cd "$(dirname "$0")"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python found: $(python3 --version)"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Copy your trained YOLOv8 model file:"
echo "   cp /path/to/your/runs/detect/pothole_detection/weights/best.pt ml_server/"
echo ""
echo "2. Start the ML server:"
echo "   cd ml_server"
echo "   source venv/bin/activate"
echo "   python server.py"
echo ""
echo "3. In another terminal, start the backend server:"
echo "   cd backend"
echo "   node server.js"
echo ""
echo "======================================"
