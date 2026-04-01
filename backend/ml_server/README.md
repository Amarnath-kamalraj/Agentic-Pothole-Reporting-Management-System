# YOLOv8 ML Server

Python Flask server for pothole detection using YOLOv8.

## Setup

1. Install Python dependencies:

```bash
cd ml_server
pip install -r requirements.txt
```

2. Copy your trained YOLOv8 model file:

```bash
# Copy your best.pt model to this directory
cp /path/to/your/runs/detect/pothole_detection/weights/best.pt .
```

3. Configure environment variables in backend/.env:

```
ML_SERVER_URL=http://localhost:5000
YOLO_MODEL_PATH=best.pt
ML_SERVER_PORT=5000
CONFIDENCE_THRESHOLD=0.25
```

## Running

Start the ML server:

```bash
python server.py
```

Or use environment variables:

```bash
YOLO_MODEL_PATH=best.pt ML_SERVER_PORT=5000 python server.py
```

## API Endpoints

### POST /predict

Upload image and get pothole predictions

- Input: multipart/form-data with 'file' field
- Query params: ?confidence=0.25 (optional)
- Returns: JSON with predictions array

### POST /validate-scene

Validate if image is a road scene

- Input: multipart/form-data with 'file' field
- Returns: JSON with scene validation result

### GET /health

Health check endpoint

- Returns: Server status and model info
