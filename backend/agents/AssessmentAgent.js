const BaseAgent = require("./BaseAgent");
const fs = require("fs");
const path = require("path");
const mlService = require("../services/mlService");

/**
 * Damage Assessment Agent
 * Analyzes pothole images using real ML models or simulation
 * Supports: Roboflow, Google Vision, OpenCV, and simulation fallback
 */
class AssessmentAgent extends BaseAgent {
  constructor() {
    super("Damage Assessment Agent");
    this.damageTypes = [
      "small_pothole",
      "large_pothole",
      "crack",
      "broken_surface",
      "other",
    ];
    this.severityLevels = ["low", "medium", "high", "critical"];
    this.mlService = mlService;

    // Log ML provider on startup
    const providerInfo = this.mlService.getProviderInfo();
    console.log(
      `[Assessment Agent] Using ML provider: ${providerInfo.provider}`,
    );
    console.log(
      `[Assessment Agent] Production mode: ${providerInfo.isProduction}`,
    );
  }

  /**
   * Assess damage from report
   */
  async assessDamage(report) {
    this.isProcessing = true;

    try {
      await this.logAction(
        report.reportId,
        "ASSESSMENT_START",
        "Beginning damage assessment",
      );

      // Check if already assessed
      if (report.status !== "validated") {
        await this.logAction(
          report.reportId,
          "ASSESSMENT_SKIP",
          `Report in ${report.status} status, skipping assessment`,
        );
        return { assessed: false, reason: "Not in validated status" };
      }

      // Perform image analysis
      const analysis = await this.analyzeImage(report);

      // Check if analysis resulted in rejection
      if (analysis.assessed === false) {
        return analysis; // Return the rejection result
      }

      // Update report with assessment results
      await this.updateReportStatus(report.reportId, "assessed", {
        severity: analysis.severity,
        damageType: analysis.damageType,
        $push: {
          history: {
            action: "Damage assessed",
            timestamp: new Date(),
            agentName: this.name,
            details: `Severity: ${analysis.severity}, Type: ${analysis.damageType}, Confidence: ${analysis.confidence}%`,
          },
        },
      });

      await this.logAction(
        report.reportId,
        "ASSESSMENT_COMPLETE",
        `Severity: ${analysis.severity}, Type: ${analysis.damageType}`,
      );

      return {
        assessed: true,
        severity: analysis.severity,
        damageType: analysis.damageType,
        confidence: analysis.confidence,
      };
    } catch (error) {
      console.error(
        `[${this.name}] Assessment error for ${report.reportId}:`,
        error,
      );
      await this.addHistory(report.reportId, "ASSESSMENT_ERROR", error.message);
      return { assessed: false, reason: "Assessment error occurred" };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Analyze image to determine damage characteristics
   * Uses real ML service with multiple provider support
   */
  async analyzeImage(report) {
    try {
      // Get image file path
      const imagePath = path.join(__dirname, "..", report.imageUrl);

      if (!fs.existsSync(imagePath)) {
        console.error(`[${this.name}] Image not found: ${imagePath}`);
        return this.getDefaultAssessment();
      }

      const stats = fs.statSync(imagePath);
      const fileSize = stats.size;

      await this.logAction(
        report.reportId,
        "IMAGE_ANALYSIS",
        `Analyzing image (${(fileSize / 1024).toFixed(2)} KB) with ${this.mlService.getProviderInfo().provider}`,
      );

      // Use ML service for real analysis
      const mlResult = await this.mlService.analyzePotholeImage(imagePath);

      // Reject if no pothole detected
      if (mlResult.noPotholeDetected || mlResult.confidence === 0) {
        await this.rejectReport(
          report,
          "No pothole detected in the image. Please submit images containing actual potholes.",
        );
        return {
          assessed: false,
          reason: "No pothole detected by ML model",
        };
      }

      // Validate that image is actually of a road/street scene
      const sceneValidation = await this.mlService.validateRoadScene(imagePath);
      if (!sceneValidation.isRoadScene) {
        await this.rejectReport(
          report,
          `Image does not appear to be from a road or street. Please submit images taken on roads, highways, or streets. Detected scene: ${sceneValidation.sceneType}`,
        );
        return {
          assessed: false,
          reason: `Not a road scene: ${sceneValidation.sceneType}`,
        };
      }

      // Reject if confidence is too low (less than 50%)
      const MIN_CONFIDENCE = 50;
      if (mlResult.confidence < MIN_CONFIDENCE) {
        await this.rejectReport(
          report,
          `Image quality too low or unclear. ML confidence: ${mlResult.confidence}%. Minimum required: ${MIN_CONFIDENCE}%`,
        );
        return {
          assessed: false,
          reason: `Low ML confidence: ${mlResult.confidence}%`,
        };
      }

      // Enrich ML results with additional context
      const assessment = {
        severity: mlResult.severity,
        damageType: mlResult.damageType,
        confidence: mlResult.confidence,
        detections: mlResult.detections || [],
        dimensions: mlResult.dimensions || null,
        metadata: {
          ...mlResult.metadata,
          imageSize: fileSize,
          location: report.location,
          analyzedAt: new Date().toISOString(),
        },
      };

      await this.logAction(
        report.reportId,
        "ML_ANALYSIS_COMPLETE",
        `Provider: ${mlResult.metadata.provider}, Severity: ${mlResult.severity}, Confidence: ${mlResult.confidence}%`,
      );

      return assessment;
    } catch (error) {
      console.error(`[${this.name}] Image analysis error:`, error);
      await this.logAction(
        report.reportId,
        "ANALYSIS_ERROR",
        `ML analysis failed: ${error.message}, using fallback`,
      );
      return this.getDefaultAssessment();
    }
  }

  /**
   * Get default assessment when analysis fails
   */
  getDefaultAssessment() {
    return {
      severity: "medium",
      damageType: "other",
      confidence: 50,
      metadata: {
        provider: "fallback",
        note: "Default assessment used due to error",
      },
    };
  }

  /**
   * Get ML provider information
   */
  getMLProviderInfo() {
    return this.mlService.getProviderInfo();
  }

  /**
   * Reject report with reason
   */
  async rejectReport(report, reason) {
    await this.updateReportStatus(report.reportId, "rejected", {
      rejectionReason: reason,
    });

    await this.logAction(
      report.reportId,
      "ASSESSMENT_FAILED",
      `Rejected: ${reason}`,
    );
  }
}

// Export singleton instance
module.exports = new AssessmentAgent();
