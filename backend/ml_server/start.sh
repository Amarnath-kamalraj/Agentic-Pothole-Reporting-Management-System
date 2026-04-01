#!/bin/bash

# Start script for YOLOv8 ML Server

cd "$(dirname "$0")"

# Check if conda environment exists
if ! conda env list | grep -q "pothole_ml"; then
    echo "❌ Conda environment 'pothole_ml' not found."
    echo "Creating environment..."
    conda create -n pothole_ml python=3.11 -y
    echo "Installing packages..."
    conda run -n pothole_ml pip install flask flask-cors ultralytics opencv-python pillow numpy
fi

# Check if model file exists
if [ ! -f "best.pt" ] && [ ! -f "yolo26n.pt" ]; then
    echo "⚠️  Warning: No model file found (best.pt or yolo26n.pt)"
    echo "Please copy your trained model:"
    echo "  cp /path/to/your/runs/detect/pothole_detection/weights/best.pt ."
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Activate conda environment
eval "$(conda shell.bash hook)"
conda activate pothole_ml

# Set environment variables (optional - can also use .env file)
export ML_SERVER_PORT=5001
export YOLO_MODEL_PATH=${YOLO_MODEL_PATH:-best.pt}
export CONFIDENCE_THRESHOLD=${CONFIDENCE_THRESHOLD:-0.25}

echo "======================================"
echo "Starting YOLOv8 ML Server"
echo "======================================"
echo "Port: $ML_SERVER_PORT"
echo "Model: $YOLO_MODEL_PATH"
echo "Confidence: $CONFIDENCE_THRESHOLD"
echo "======================================"
echo ""

# Start the server
/opt/anaconda3/envs/pothole_ml/bin/python server.py
