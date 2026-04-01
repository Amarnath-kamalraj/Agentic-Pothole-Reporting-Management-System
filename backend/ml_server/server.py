from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import torch
import cv2
import numpy as np
from PIL import Image
import io
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATH = os.getenv('YOLO_MODEL_PATH', 'best.pt')
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.25'))

# Load YOLO model
print(f"[ML Server] Loading YOLOv8 model from {MODEL_PATH}")
print(f"[ML Server] Using device: {DEVICE}")

try:
    model = YOLO(MODEL_PATH)
    model.to(DEVICE)
    print(f"[ML Server] ✓ Model loaded successfully")
except Exception as e:
    print(f"[ML Server] ✗ Failed to load model: {e}")
    model = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': DEVICE,
        'model_path': MODEL_PATH
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict potholes in uploaded image
    Returns: JSON with predictions
    """
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        # Check if image file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['file']
        
        # Get confidence threshold from request or use default
        confidence = float(request.args.get('confidence', CONFIDENCE_THRESHOLD))

        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL Image to numpy array for YOLO
        image_np = np.array(image)
        
        # Run inference
        results = model(image_np, conf=confidence, device=DEVICE)
        
        # Parse results
        predictions = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Get confidence and class
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                class_name = model.names[cls]
                
                # Calculate width and height
                width = x2 - x1
                height = y2 - y1
                
                predictions.append({
                    'class': class_name,
                    'confidence': conf,
                    'box': {
                        'x1': x1,
                        'y1': y1,
                        'x2': x2,
                        'y2': y2,
                        'width': width,
                        'height': height
                    }
                })
        
        # Get image dimensions
        img_height, img_width = image_np.shape[:2]
        
        response = {
            'predictions': predictions,
            'count': len(predictions),
            'image': {
                'width': img_width,
                'height': img_height
            },
            'model': {
                'name': 'YOLOv8',
                'device': DEVICE,
                'confidence_threshold': confidence
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[ML Server] Error during prediction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/validate-scene', methods=['POST'])
def validate_scene():
    """
    Validate if image is a road scene
    Returns: JSON with scene validation result
    """
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        if 'file' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400

        file = request.files['file']
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # Run inference with lower confidence to detect anything
        results = model(image_np, conf=0.1, device=DEVICE)
        
        # Get image aspect ratio
        img_height, img_width = image_np.shape[:2]
        aspect_ratio = img_width / img_height if img_height > 0 else 1.0
        
        # Count detections
        detection_count = sum(len(result.boxes) for result in results)
        
        # Validate scene
        is_road_scene = True
        scene_type = "road/street"
        confidence = 0.7
        reason = "Normal road image dimensions"
        
        if detection_count == 0:
            # No detections - check aspect ratio
            if aspect_ratio < 0.7 or aspect_ratio > 2.5:
                is_road_scene = False
                scene_type = "scenic/landscape"
                confidence = 0.6
                reason = f"Unusual aspect ratio for road scene: {aspect_ratio:.2f}"
        else:
            # Has detections - likely road scene
            confidence = 0.9
            reason = f"Pothole model detected {detection_count} objects"
        
        return jsonify({
            'isRoadScene': is_road_scene,
            'sceneType': scene_type,
            'confidence': confidence,
            'reason': reason,
            'detectionCount': detection_count,
            'aspectRatio': aspect_ratio
        })
        
    except Exception as e:
        print(f"[ML Server] Error during scene validation: {e}")
        return jsonify({
            'isRoadScene': True,
            'sceneType': 'unknown',
            'confidence': 0.5,
            'reason': 'Validation error - allowing through'
        })

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVER_PORT', '5000'))
    print(f"[ML Server] Starting server on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
