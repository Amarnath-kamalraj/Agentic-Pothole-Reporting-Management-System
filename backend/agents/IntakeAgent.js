const BaseAgent = require("./BaseAgent");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Intake & Validation Agent
 * Validates submitted reports for image quality, location accuracy, and spam
 */
class IntakeAgent extends BaseAgent {
  constructor() {
    super("Intake & Validation Agent");
    this.validationRules = {
      maxImageSize: 10 * 1024 * 1024, // 10MB
      minImageSize: 1024, // 1KB
      validImageFormats: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      coordinateRanges: {
        latitude: { min: -90, max: 90 },
        longitude: { min: -180, max: 180 },
      },
    };
  }

  /**
   * Main validation method
   */
  async validateReport(report) {
    this.isProcessing = true;

    try {
      await this.logAction(
        report.reportId,
        "VALIDATION_START",
        "Beginning report validation",
      );

      // Check if already validated
      if (report.status !== "submitted") {
        await this.logAction(
          report.reportId,
          "VALIDATION_SKIP",
          `Report already in ${report.status} status`,
        );
        return { valid: true, reason: "Already processed" };
      }

      // Validate image
      const imageValidation = await this.validateImage(report);
      if (!imageValidation.valid) {
        await this.rejectReport(report, imageValidation.reason);
        return imageValidation;
      }

      // Validate location
      const locationValidation = this.validateLocation(report);
      if (!locationValidation.valid) {
        await this.rejectReport(report, locationValidation.reason);
        return locationValidation;
      }

      // Check for duplicate images (same image uploaded multiple times)
      const duplicateImageCheck = await this.checkForDuplicateImage(report);
      if (duplicateImageCheck.isDuplicate) {
        await this.rejectReport(
          report,
          `Duplicate image detected. This image was already submitted in report ${duplicateImageCheck.existingReportId}`,
        );
        return { valid: false, reason: "Duplicate image" };
      }

      // Check for duplicates (within 50 meters in last 24 hours)
      const duplicateCheck = await this.checkForDuplicates(report);
      if (duplicateCheck.isDuplicate) {
        await this.rejectReport(
          report,
          `Duplicate report detected near ${duplicateCheck.distance}m away`,
        );
        return { valid: false, reason: "Duplicate report" };
      }

      // All validations passed
      await this.updateReportStatus(report.reportId, "validated", {
        $push: {
          history: {
            action: "Report validated successfully",
            timestamp: new Date(),
            agentName: this.name,
            details: "All validation checks passed",
          },
        },
      });

      await this.logAction(
        report.reportId,
        "VALIDATION_SUCCESS",
        "Report validated successfully",
      );

      return { valid: true, reason: "All validations passed" };
    } catch (error) {
      console.error(
        `[${this.name}] Validation error for ${report.reportId}:`,
        error,
      );
      await this.addHistory(report.reportId, "VALIDATION_ERROR", error.message);
      return { valid: false, reason: "Validation error occurred" };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Validate image file
   */
  async validateImage(report) {
    try {
      if (!report.imageUrl) {
        return { valid: false, reason: "No image provided" };
      }

      // Check if file exists
      const imagePath = path.join(__dirname, "..", report.imageUrl);

      if (!fs.existsSync(imagePath)) {
        return { valid: false, reason: "Image file not found" };
      }

      // Check file size
      const stats = fs.statSync(imagePath);
      const fileSize = stats.size;

      if (fileSize < this.validationRules.minImageSize) {
        return { valid: false, reason: "Image file too small (corrupted)" };
      }

      if (fileSize > this.validationRules.maxImageSize) {
        return { valid: false, reason: "Image file too large" };
      }

      // Check file extension
      const ext = path.extname(imagePath).toLowerCase();
      if (!this.validationRules.validImageFormats.includes(ext)) {
        return { valid: false, reason: "Invalid image format" };
      }

      return { valid: true, reason: "Image validation passed" };
    } catch (error) {
      console.error(`[${this.name}] Image validation error:`, error);
      return { valid: false, reason: "Image validation failed" };
    }
  }

  /**
   * Validate location coordinates
   */
  validateLocation(report) {
    try {
      const { latitude, longitude } = report.location;

      // Check if coordinates exist
      if (latitude === undefined || longitude === undefined) {
        return { valid: false, reason: "Missing location coordinates" };
      }

      // Check if coordinates are numbers
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return { valid: false, reason: "Invalid coordinate format" };
      }

      // Check latitude range
      if (
        latitude < this.validationRules.coordinateRanges.latitude.min ||
        latitude > this.validationRules.coordinateRanges.latitude.max
      ) {
        return { valid: false, reason: "Invalid latitude value" };
      }

      // Check longitude range
      if (
        longitude < this.validationRules.coordinateRanges.longitude.min ||
        longitude > this.validationRules.coordinateRanges.longitude.max
      ) {
        return { valid: false, reason: "Invalid longitude value" };
      }

      return { valid: true, reason: "Location validation passed" };
    } catch (error) {
      console.error(`[${this.name}] Location validation error:`, error);
      return { valid: false, reason: "Location validation failed" };
    }
  }

  /**
   * Check for duplicate images across all reports
   */
  async checkForDuplicateImage(report) {
    try {
      const PotholeReport = require("../models/PotholeReport");

      // Get full image path
      const imagePath = path.join(__dirname, "..", report.imageUrl);

      // Calculate hash of the uploaded image
      const imageHash = await this.calculateImageHash(imagePath);

      // Update the report with the image hash
      await PotholeReport.findOneAndUpdate(
        { reportId: report.reportId },
        { imageHash: imageHash },
      );

      // Check if this image hash already exists in other reports
      const existingReport = await PotholeReport.findOne({
        imageHash: imageHash,
        reportId: { $ne: report.reportId }, // Exclude current report
        status: { $nin: ["rejected"] }, // Only check non-rejected reports
      });

      if (existingReport) {
        return {
          isDuplicate: true,
          existingReportId: existingReport.reportId,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error(`[${this.name}] Duplicate image check error:`, error);
      return { isDuplicate: false }; // Don't reject on error
    }
  }

  /**
   * Calculate SHA-256 hash of an image file
   */
  async calculateImageHash(imagePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(imagePath);

      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", (error) => reject(error));
    });
  }

  /**
   * Check for duplicate reports nearby
   */
  async checkForDuplicates(report) {
    try {
      const PotholeReport = require("../models/PotholeReport");

      const { latitude, longitude } = report.location;
      const radiusInMeters = 50; // 50 meters
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Simple distance calculation (not perfectly accurate but good enough)
      const latDelta = radiusInMeters / 111320; // 1 degree latitude ≈ 111.32 km
      const lngDelta =
        radiusInMeters / (111320 * Math.cos((latitude * Math.PI) / 180));

      const nearbyReports = await PotholeReport.find({
        reportId: { $ne: report.reportId }, // Exclude current report
        createdAt: { $gte: oneDayAgo },
        status: { $nin: ["rejected"] },
        "location.latitude": {
          $gte: latitude - latDelta,
          $lte: latitude + latDelta,
        },
        "location.longitude": {
          $gte: longitude - lngDelta,
          $lte: longitude + lngDelta,
        },
      });

      if (nearbyReports.length > 0) {
        // Calculate actual distance to nearest report
        const distances = nearbyReports.map((r) => {
          const dist = this.calculateDistance(
            latitude,
            longitude,
            r.location.latitude,
            r.location.longitude,
          );
          return { report: r, distance: dist };
        });

        const nearest = distances.sort((a, b) => a.distance - b.distance)[0];

        if (nearest.distance <= radiusInMeters) {
          return {
            isDuplicate: true,
            distance: Math.round(nearest.distance),
            nearestReport: nearest.report.reportId,
          };
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error(`[${this.name}] Duplicate check error:`, error);
      return { isDuplicate: false }; // Don't reject on error
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
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
      "VALIDATION_FAILED",
      `Rejected: ${reason}`,
    );
  }
}

// Export singleton instance
module.exports = new IntakeAgent();
