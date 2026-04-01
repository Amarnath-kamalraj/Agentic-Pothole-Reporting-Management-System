# ✅ YOLOv8 ML Server - WORKING!

## Quick Start

The ML server is now configured and ready to use!

### 1. Start ML Server

```bash
cd backend/ml_server
ML_SERVER_PORT=5001 /opt/anaconda3/envs/pothole_ml/bin/python server.py
```

Or run in background:

```bash
cd backend/ml_server
ML_SERVER_PORT=5001 /opt/anaconda3/envs/pothole_ml/bin/python server.py > ml_server.log 2>&1 &
```

### 2. Test ML Server

```bash
curl http://localhost:5001/health
```

Expected response:

```json
{
  "device": "cpu",
  "model_loaded": true,
  "model_path": "best.pt",
  "status": "healthy"
}
```

### 3. Start Backend

In another terminal:

```bash
cd backend
node server.js
```

### 4. Start Frontend

In another terminal:

```bash
cd frontend
npm start
```

## Configuration

- **Port:** 5001 (changed from 5000 due to AirPlay conflict)
- **Environment:** conda environment `pothole_ml`
- **Model:** best.pt (currently using pretrained YOLOv8n)
- **Device:** CPU (will auto-detect GPU if CUDA available)

## Packages Installed

✅ Flask 3.1.3
✅ Flask-CORS 6.0.2
✅ Ultralytics 8.4.15 (YOLOv8)
✅ PyTorch 2.10.0
✅ TorchVision 0.25.0
✅ OpenCV 4.13.0
✅ Pillow 12.1.1
✅ NumPy 2.4.2

## Replace with Your Model

To use your custom trained model:

```bash
# Copy your model from other laptop
cp /path/to/runs/detect/pothole_detection/weights/best.pt backend/ml_server/

# Or use scp if transferring from another machine
scp user@laptop:/path/to/best.pt backend/ml_server/
```

## Notes

- **Port 5000 conflict:** macOS AirPlay uses port 5000. We changed to 5001.
- **Conda vs venv:** Using conda environment `pothole_ml` instead of venv due to pip certificate issues
- **Model file:** Currently has a `best.pt` file (likely pretrained YOLOv8n). Replace with your trained model.

## Troubleshooting

**Stop all servers:**

```bash
# Kill ML server
pkill -f "python server.py"

# Kill backend
pkill -f "node.*server.js"

# Kill frontend
pkill -f "react-scripts"
```

**Check ML server logs:**

```bash
tail -f ml_server.log
```

**Verify conda environment:**

```bash
conda activate pothole_ml
pip list | grep -E "flask|ultralytics|torch"
```
