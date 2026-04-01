const axios = require("axios");
const fs = require("fs");
const path = require("path");

/**
 * ML Service for Pothole Detection
 * Supports multiple ML providers with fallback chain
 */
class MLService {
  constructor() {
    this.provider = this.selectProvider();
    this.initializeProvider();
  }

  /**
   * Select ML provider based on available credentials
   */
  selectProvider() {
    // Priority order: Roboflow > OpenCV API > Simulation
    if (process.env.ROBOFLOW_API_KEY) {
      return "roboflow";
    } else if (process.env.OPENCV_API_KEY) {
      return "opencv";
    } else if (process.env.GOOGLE_VISION_API_KEY) {
      return "google-vision";
    } else {
      console.log("[ML Service] No API keys found, using simulation mode");
      return "simulation";
    }
  }

  /**
   * Initialize the selected provider
   */
  initializeProvider() {
    console.log(`[ML Service] Initialized with provider: ${this.provider}`);

    switch (this.provider) {
      case "roboflow":
        this.roboflowConfig = {
          apiKey: process.env.ROBOFLOW_API_KEY,
          model: process.env.ROBOFLOW_MODEL || "pothole-detection-i00zy-qtplk",
          version: process.env.ROBOFLOW_VERSION || "1",
        };
        break;
      case "google-vision":
        this.googleConfig = {
          apiKey: process.env.GOOGLE_VISION_API_KEY,
          endpoint: "https://vision.googleapis.com/v1/images:annotate",
        };
        break;
      case "simulation":
      default:
        console.log(
          "[ML Service] Running in simulation mode - for testing only",
        );
    }
  }

  /**
   * Analyze pothole image and return detection results
   */
  async analyzePotholeImage(imagePath) {
    try {
      console.log(
        `[ML Service] Analyzing image with ${this.provider} provider`,
      );

      switch (this.provider) {
        case "roboflow":
          return await this.analyzeWithRoboflow(imagePath);
        case "google-vision":
          return await this.analyzeWithGoogleVision(imagePath);
        case "opencv":
          return await this.analyzeWithOpenCV(imagePath);
        default:
          return await this.analyzeWithSimulation(imagePath);
      }
    } catch (error) {
      console.error("[ML Service] Analysis error:", error.message);

      // Fallback to simulation if API fails
      if (this.provider !== "simulation") {
        console.log("[ML Service] Falling back to simulation mode");
        return await this.analyzeWithSimulation(imagePath);
      }

      throw error;
    }
  }

  /**
   * Roboflow API Integration - Using multipart form upload
   * Free tier: 1000 predictions/month
   */
  async analyzeWithRoboflow(imagePath) {
    try {
      console.log(`[ML Service] Using Roboflow Hosted Inference API`);

      // Roboflow Hosted API endpoint
      const url = `https://detect.roboflow.com/${this.roboflowConfig.model}/${this.roboflowConfig.version}`;

      console.log(`[ML Service] Endpoint: ${url}`);

      // Use FormData to upload the image file
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));

      const response = await axios({
        method: "POST",
        url: url,
        params: {
          api_key: this.roboflowConfig.apiKey,
        },
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 15000,
      });

      const predictions = response.data.predictions || [];

      console.log(
        `[ML Service] ✅ Roboflow API Success! Found ${predictions.length} detections`,
      );

      // Process Roboflow results
      const result = this.processRoboflowPredictions(predictions);

      console.log(
        `[ML Service] Roboflow analysis: ${result.severity} severity, confidence: ${result.confidence}%`,
      );

      return result;
    } catch (error) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      const errorData = error.response?.data;

      console.error(`[ML Service] Roboflow API error: ${status} ${statusText}`);
      if (errorData) console.error(`[ML Service] Error details:`, errorData);

      throw new Error(`Roboflow analysis failed: ${error.message}`);
    }
  }

  /**
   * Google Cloud Vision API Integration
   */
  async analyzeWithGoogleVision(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        `${this.googleConfig.endpoint}?key=${this.googleConfig.apiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
                { type: "IMAGE_PROPERTIES" },
              ],
            },
          ],
        },
        { timeout: 10000 },
      );

      const annotations = response.data.responses[0];
      const result = this.processGoogleVisionResults(annotations);

      console.log(
        `[ML Service] Google Vision analysis: ${result.severity} severity`,
      );

      return result;
    } catch (error) {
      console.error("[ML Service] Google Vision API error:", error.message);
      throw new Error(`Google Vision analysis failed: ${error.message}`);
    }
  }

  /**
   * OpenCV API Integration (placeholder)
   */
  async analyzeWithOpenCV(imagePath) {
    // Placeholder for custom OpenCV model
    throw new Error("OpenCV integration not yet implemented");
  }

  /**
   * Simulation mode (fallback for testing)
   * Returns no detection to prevent fake results
   */
  async analyzeWithSimulation(imagePath) {
    const stats = fs.statSync(imagePath);
    const fileSize = stats.size;
    const fileName = path.basename(imagePath);

    // Simulate analysis delay
    await this.sleep(500);

    console.log(
      `[ML Service] SIMULATION MODE: Cannot actually detect potholes. Returning no detection.`,
    );

    // Return no detection - don't generate fake results
    return {
      severity: null,
      damageType: null,
      confidence: 0,
      detections: [],
      noPotholeDetected: true,
      metadata: {
        provider: "simulation",
        modelVersion: "v1.0-simulation",
        processingTime: 500,
        note: "Simulation mode cannot detect potholes - please configure Roboflow API",
      },
    };
  }

  /**
   * Process Roboflow prediction results
   */
  processRoboflowPredictions(predictions) {
    if (!predictions || predictions.length === 0) {
      return {
        severity: null,
        damageType: null,
        confidence: 0,
        detections: [],
        noPotholeDetected: true,
        metadata: { provider: "roboflow", note: "No potholes detected" },
      };
    }

    // Sort by confidence
    const sortedPredictions = predictions.sort(
      (a, b) => b.confidence - a.confidence,
    );
    const topPrediction = sortedPredictions[0];

    // Map Roboflow classes to our damage types
    const damageType = this.mapDamageType(topPrediction.class);

    // Calculate severity based on confidence and size
    const severity = this.calculateSeverity(
      topPrediction.confidence,
      topPrediction.width,
      topPrediction.height,
    );

    return {
      severity,
      damageType,
      confidence: Math.round(topPrediction.confidence * 100),
      detections: predictions.map((p) => ({
        class: p.class,
        confidence: p.confidence,
        boundingBox: {
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
        },
      })),
      metadata: {
        provider: "roboflow",
        modelVersion: this.roboflowConfig.version,
        totalDetections: predictions.length,
      },
    };
  }

  /**
   * Process Google Vision results
   */
  processGoogleVisionResults(annotations) {
    const objects = annotations.localizedObjectAnnotations || [];

    // Look for road damage indicators
    const damageKeywords = ["pothole", "crack", "damage", "hole", "broken"];
    const detectedDamage = objects.filter((obj) =>
      damageKeywords.some((keyword) =>
        obj.name.toLowerCase().includes(keyword),
      ),
    );

    if (detectedDamage.length === 0) {
      return {
        severity: "low",
        damageType: "other",
        confidence: 40,
        detections: [],
        metadata: { provider: "google-vision", note: "No damage detected" },
      };
    }

    const topDetection = detectedDamage[0];
    const confidence = Math.round(topDetection.score * 100);

    return {
      severity: confidence > 80 ? "high" : confidence > 60 ? "medium" : "low",
      damageType: this.mapDamageType(topDetection.name),
      confidence,
      detections: detectedDamage.map((obj) => ({
        class: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly,
      })),
      metadata: {
        provider: "google-vision",
        totalDetections: detectedDamage.length,
      },
    };
  }

  /**
   * Map external class names to our damage types
   */
  mapDamageType(className) {
    const lowerClass = className.toLowerCase();

    if (lowerClass.includes("large") || lowerClass.includes("big")) {
      return "large_pothole";
    } else if (lowerClass.includes("small") || lowerClass.includes("minor")) {
      return "small_pothole";
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

    return "other";
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
   * Seeded random number generator for consistent simulation
   */
  seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate if image is taken on a road/street scene
   * Rejects scenic landscapes, indoor scenes, etc.
   */
  async validateRoadScene(imagePath) {
    try {
      console.log(`[ML Service] Validating road scene...`);

      // Use FormData to upload the image file to Roboflow
      const FormData = require("form-data");
      const formData = new FormData();
      formData.append("file", fs.createReadStream(imagePath));

      const url = `https://detect.roboflow.com/${this.roboflowConfig.model}/${this.roboflowConfig.version}`;

      const response = await axios({
        method: "POST",
        url: url,
        params: {
          api_key: this.roboflowConfig.apiKey,
          labels: "on", // Get label predictions too
        },
        data: formData,
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 15000,
      });

      const predictions = response.data.predictions || [];
      const image = response.data.image || {};

      // Check if any road-related objects are detected
      // Roboflow pothole models typically detect on road surfaces
      // If no predictions at all, likely not a road scene
      if (predictions.length === 0) {
        // No detections could mean:
        // 1. Not a road scene (scenic landscape)
        // 2. Clean road with no potholes
        // We'll use additional heuristics

        // Check image dimensions - road photos are typically landscape orientation
        const width = image.width || 0;
        const height = image.height || 0;
        const aspectRatio = width / height;

        // Very tall images (portrait, aspect < 0.7) are less likely road scenes
        // Very wide images (panoramic, aspect > 2.5) might be landscapes
        if (aspectRatio < 0.7 || aspectRatio > 2.5) {
          console.log(
            `[ML Service] Suspicious aspect ratio: ${aspectRatio.toFixed(2)}`,
          );
          return {
            isRoadScene: false,
            sceneType: "scenic/landscape",
            confidence: 0.6,
            reason: "Unusual aspect ratio for road scene",
          };
        }

        // If aspect ratio is normal but no potholes, assume it's a clean road
        console.log(
          `[ML Service] No detections but normal aspect ratio - accepting as road scene`,
        );
        return {
          isRoadScene: true,
          sceneType: "road/street",
          confidence: 0.7,
          reason: "Normal road image dimensions",
        };
      }

      // If we have pothole predictions, it's likely a road scene
      console.log(
        `[ML Service] ✓ Road scene validated (${predictions.length} detections)`,
      );
      return {
        isRoadScene: true,
        sceneType: "road/street",
        confidence: 0.9,
        reason: `Pothole model detected ${predictions.length} objects`,
      };
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
      provider: this.provider,
      isProduction: this.provider !== "simulation",
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * Get provider capabilities
   */
  getCapabilities() {
    switch (this.provider) {
      case "roboflow":
        return {
          objectDetection: true,
          boundingBoxes: true,
          multipleDetections: true,
          confidence: true,
        };
      case "google-vision":
        return {
          objectDetection: true,
          boundingBoxes: true,
          multipleDetections: true,
          confidence: true,
        };
      default:
        return {
          objectDetection: false,
          boundingBoxes: false,
          multipleDetections: false,
          confidence: true,
        };
    }
  }
}

// Export singleton instance
module.exports = new MLService();
