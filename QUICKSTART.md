# 🚀 Quick Start - YOLOv8 Integration

## First Time Setup (5 minutes)

### 1. Install Python Dependencies

```bash
cd backend/ml_server
./setup.sh
```

### 2. Copy Your Model

```bash
# Copy your best.pt from the other laptop to backend/ml_server/
# The model should be: runs/detect/pothole_detection/weights/best.pt
cp /path/to/best.pt backend/ml_server/
```

## Running the System (Every Time)

### Terminal 1: Start ML Server (Python)

```bash
cd backend/ml_server
./start.sh
```

**Keep this running!** Port 5000

### Terminal 2: Start Backend Server (Node.js)

```bash
cd backend
node server.js
```

**Keep this running!** Port 3001

### Terminal 3: Start Frontend (React)

```bash
cd frontend
npm start
```

**Keep this running!** Port 3000

## Quick Tests

### Test ML Server Health

```bash
curl http://localhost:5000/health
```

### Test Pothole Detection

```bash
curl -X POST http://localhost:5000/predict \
  -F "file=@test-image.jpg" \
  -F "confidence=0.25"
```

## Configuration

Edit `backend/.env`:

```bash
ML_SERVER_URL=http://localhost:5000
CONFIDENCE_THRESHOLD=0.25    # Adjust 0.2-0.4 for sensitivity
```

## What Changed?

✅ **Removed:** Roboflow API (false positives, API limits)
✅ **Added:** Your custom YOLOv8 model (accurate, unlimited, free)

## Troubleshooting

| Problem               | Solution                                       |
| --------------------- | ---------------------------------------------- |
| ML server won't start | Check if port 5000 is free: `lsof -i :5000`    |
| Model not found       | Verify `ls -lh ml_server/best.pt`              |
| Backend can't connect | Make sure ML server (Terminal 1) is running    |
| Slow predictions      | Normal on CPU (2-5s). GPU is faster (0.1-0.5s) |

## File Locations

- **ML Server:** `/backend/ml_server/server.py`
- **Your Model:** `/backend/ml_server/best.pt` ← Copy here
- **Backend API:** `/backend/services/mlService.js`
- **Config:** `/backend/.env`
- **Full Guide:** `/YOLOV8_INTEGRATION.md`

## Expected Logs

### ML Server (Terminal 1)

```
[ML Server] Loading YOLOv8 model from best.pt
[ML Server] Using device: cuda (or cpu)
[ML Server] ✓ Model loaded successfully
[ML Server] Starting server on port 5000
```

### Backend (Terminal 2)

```
[ML Service] Initialized with YOLOv8 local server: http://localhost:5000
[ML Service] ✓ ML server is healthy
[ML Service] Device: cuda
Server running on port 3001
```

## Need Help?

1. Read full guide: `YOLOV8_INTEGRATION.md`
2. Check both terminal logs
3. Test ML server independently: `curl http://localhost:5000/health`
