const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * ML Service for Pothole Detection
 * Uses local YOLOv8 model via Flask server
 */
class MLService {
  constructor() {
    this.mlServerUrl = process.env.ML_SERVER_URL || "http://localhost:5001";
    this.confidenceThreshold =
      parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.25;
    this.initializeProvider();
  }

  /**
   * Initialize the provider
   */
  initializeProvider() {
    console.log(
      `[ML Service] Initialized with YOLOv8 local server: ${this.mlServerUrl}`,
    );
    console.log(
      `[ML Service] Confidence threshold: ${this.confidenceThreshold}`,
    );

    // Check health on startup
    this.checkHealth().catch((err) => {
      console.warn(
        `[ML Service] Warning: ML server not responding. Make sure Python server is running.`,
      );
      console.warn(
        `[ML Service] Start it with: cd ml_server && python server.py`,
      );
    });
  }

  /**
   * Check health of ML server
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.mlServerUrl}/health`, {
        timeout: 3000,
      });

      if (response.data.model_loaded) {
        console.log(`[ML Service] ✓ ML server is healthy`);
        console.log(`[ML Service] Device: ${response.data.device}`);
        console.log(`[ML Service] Model: ${response.data.model_path}`);
        return true;
      } else {
        console.warn(`[ML Service] ML server is running but model not loaded`);
        return false;
      }
    } catch (error) {
      throw new Error(`ML server not available: ${error.message}`);
    }
  }

  /**
   * Analyze pothole image and return detection results
   */
  async analyzePotholeImage(imagePath) {
    try {
      console.log(`[ML Service] Analyzing image with YOLOv8`);

      // Use FormData to upload the image file
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));

      const response = await axios({
        method: "POST",
        url: `${this.mlServerUrl}/predict`,
        params: {
          confidence: this.confidenceThreshold,
        },
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      const predictions = response.data.predictions || [];
      const count = response.data.count || 0;

      console.log(`[ML Service] ✅ YOLOv8 Success! Found ${count} detections`);

      // Process YOLOv8 results
      const result = this.processYOLOv8Predictions(predictions, response.data);

      console.log(
        `[ML Service] YOLOv8 analysis: ${result.severity} severity, confidence: ${result.confidence}%`,
      );

      return result;
    } catch (error) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const errorData = error.response?.data;

      console.error(`[ML Service] YOLOv8 API error: ${status} ${statusText}`);
      if (errorData) console.error(`[ML Service] Error details:`, errorData);

      // Check if it's a connection error
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `ML server not running. Please start it with: cd ml_server && python server.py`,
        );
      }

      throw new Error(`YOLOv8 analysis failed: ${error.message}`);
    }
  }

  /**
   * Process YOLOv8 prediction results
   */
  processYOLOv8Predictions(predictions, responseData) {
    if (!predictions || predictions.length === 0) {
      return {
        severity: null,
        damageType: null,
        confidence: 0,
        detections: [],
        noPotholeDetected: true,
        metadata: {
          provider: "yolov8",
          modelVersion: "local",
          note: "No potholes detected",
        },
      };
    }

    // Sort by confidence
    const sortedPredictions = predictions.sort(
      (a, b) => b.confidence - a.confidence,
    );
    const topPrediction = sortedPredictions[0];

    // Map YOLOv8 classes to our damage types
    const damageType = this.mapDamageType(topPrediction.class);

    // Calculate severity based on confidence and size
    const severity = this.calculateSeverity(
      topPrediction.confidence,
      topPrediction.box.width,
      topPrediction.box.height,
    );

    return {
      severity,
      damageType,
      confidence: Math.round(topPrediction.confidence * 100),
      detections: predictions.map((p) => ({
        class: p.class,
        confidence: p.confidence,
        boundingBox: {
          x1: p.box.x1,
          y1: p.box.y1,
          x2: p.box.x2,
          y2: p.box.y2,
          width: p.box.width,
          height: p.box.height,
        },
      })),
      metadata: {
        provider: "yolov8",
        modelVersion: "local",
        device: responseData.model?.device || "unknown",
        totalDetections: predictions.length,
      },
    };
  }

  /**
   * Map external class names to our damage types
   */
  mapDamageType(className) {
    const lowerClass = className.toLowerCase();

    if (
      lowerClass.includes("large") ||
      lowerClass.includes("big") ||
      lowerClass.includes("severe")
    ) {
      return "large_pothole";
    } else if (lowerClass.includes("small") || lowerClass.includes("minor")) {
      return "small_pothole";
    } else if (
      lowerClass.includes("medium") ||
      lowerClass.includes("moderate")
    ) {
      return "large_pothole";
    } else if (lowerClass.includes("crack")) {
      return "crack";
    } else if (
      lowerClass.includes("broken") ||
      lowerClass.includes("surface")
    ) {
      return "broken_surface";
    } else if (lowerClass.includes("pothole") || lowerClass.includes("hole")) {
      return "large_pothole";
    }

    return "large_pothole"; // Default to large_pothole for any pothole detection
  }

  /**
   * Calculate severity from confidence and size
   */
  calculateSeverity(confidence, width, height) {
    const avgSize = ((width || 0) + (height || 0)) / 2;

    // Critical: high confidence + large size OR very high confidence
    if ((confidence > 0.85 && avgSize > 300) || confidence > 0.95) {
      return "critical";
    }

    // High: good confidence + medium size OR high confidence
    if ((confidence > 0.7 && avgSize > 200) || confidence > 0.85) {
      return "high";
    }

    // Medium: moderate confidence OR small size with good confidence
    if (confidence > 0.6 || (confidence > 0.7 && avgSize < 200)) {
      return "medium";
    }

    // Low: everything else
    return "low";
  }

  /**
   * Validate if image is taken on a road/street scene
   * Uses YOLOv8 scene validation endpoint
   */
  async validateRoadScene(imagePath) {
    try {
      console.log(`[ML Service] Validating road scene with YOLOv8...`);

      // Use FormData to upload the image file
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));

      const response = await axios({
        method: "POST",
        url: `${this.mlServerUrl}/validate-scene`,
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      const result = response.data;

      if (!result.isRoadScene) {
        console.log(
          `[ML Service] ✗ Not a road scene: ${result.sceneType} (${result.reason})`,
        );
      } else {
        console.log(`[ML Service] ✓ Road scene validated: ${result.reason}`);
      }

      return result;
    } catch (error) {
      console.error(`[ML Service] Scene validation error:`, error.message);

      // On error, be permissive and allow the image through
      return {
        isRoadScene: true,
        sceneType: "unknown",
        confidence: 0.5,
        reason: "Validation error - allowing through",
      };
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      provider: "yolov8",
      serverUrl: this.mlServerUrl,
      confidenceThreshold: this.confidenceThreshold,
      isProduction: true,
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    return {
      objectDetection: true,
      boundingBoxes: true,
      multipleDetections: true,
      confidence: true,
      localProcessing: true,
    };
  }
}

// Export singleton instance
module.exports = new MLService();
