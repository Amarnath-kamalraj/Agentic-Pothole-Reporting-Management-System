const BaseAgent = require("./BaseAgent");

/**
 * Prioritization Agent
 * Assigns priority scores and repair deadlines based on severity, location, and other factors
 */
class PrioritizationAgent extends BaseAgent {
  constructor() {
    super("Prioritization Agent");

    this.severityWeights = {
      critical: 100,
      high: 70,
      medium: 40,
      low: 20,
    };

    this.deadlineDays = {
      critical: 1, // 24 hours
      high: 3, // 3 days
      medium: 7, // 1 week
      low: 14, // 2 weeks
    };
  }

  /**
   * Prioritize a report
   */
  async prioritize(report) {
    this.isProcessing = true;

    try {
      await this.logAction(
        report.reportId,
        "PRIORITIZATION_START",
        "Calculating priority",
      );

      // Check if already prioritized
      if (report.status !== "assessed") {
        await this.logAction(
          report.reportId,
          "PRIORITIZATION_SKIP",
          `Report in ${report.status} status`,
        );
        return { prioritized: false, reason: "Not in assessed status" };
      }

      // Calculate priority score
      const priority = this.calculatePriority(report);

      // Calculate repair deadline
      const deadline = this.calculateDeadline(report.severity);

      // Update report
      await this.updateReportStatus(report.reportId, "prioritized", {
        priority: Math.min(priority, 100), // Cap at 100
        deadline,
        $push: {
          history: {
            action: "Priority assigned",
            timestamp: new Date(),
            agentName: this.name,
            details: `Priority: ${priority}/100, Deadline: ${deadline.toISOString()}`,
          },
        },
      });

      await this.logAction(
        report.reportId,
        "PRIORITIZATION_COMPLETE",
        `Priority: ${priority}/100, Deadline: ${deadline.toLocaleDateString()}`,
      );

      return {
        prioritized: true,
        priority,
        deadline,
      };
    } catch (error) {
      console.error(
        `[${this.name}] Prioritization error for ${report.reportId}:`,
        error,
      );
      await this.addHistory(
        report.reportId,
        "PRIORITIZATION_ERROR",
        error.message,
      );
      return { prioritized: false, reason: "Prioritization error occurred" };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Calculate priority score (0-100)
   * Factors:
   * - Severity (base weight)
   * - Age of report
   * - Escalation level
   * - Location factors (could add traffic data, school zones, etc.)
   */
  calculatePriority(report) {
    let score = 0;

    // 1. Base score from severity (20-100 points)
    const severityScore =
      this.severityWeights[report.severity] || this.severityWeights.low;
    score += severityScore;

    // 2. Age factor (older reports get higher priority) - up to 20 points
    const daysOld =
      (Date.now() - new Date(report.createdAt)) / (1000 * 60 * 60 * 24);
    const ageFactor = Math.min(daysOld * 2, 20);
    score += ageFactor;

    // 3. Escalation factor (20 points per escalation level)
    const escalationScore = (report.escalationLevel || 0) * 20;
    score += escalationScore;

    // 4. Location factors (placeholder for future enhancements)
    // Could add:
    // - High traffic areas
    // - Near schools/hospitals
    // - Historical accident data
    // - Weather conditions
    const locationBonus = this.calculateLocationBonus(report.location);
    score += locationBonus;

    return Math.round(score);
  }

  /**
   * Calculate location-based priority bonus
   * This is a placeholder - could be enhanced with real data
   */
  calculateLocationBonus(location) {
    // Placeholder: Could integrate with:
    // - Traffic API
    // - School/hospital databases
    // - Historical data

    // For now, return 0
    return 0;
  }

  /**
   * Calculate repair deadline based on severity
   */
  calculateDeadline(severity) {
    const days = this.deadlineDays[severity] || this.deadlineDays.low;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    // Set to end of day
    deadline.setHours(23, 59, 59, 999);

    return deadline;
  }

  /**
   * Recalculate priority for existing report (used by monitoring agent)
   */
  async recalculatePriority(reportId) {
    try {
      const report = await this.getReport(reportId);

      if (report.status === "completed" || report.status === "rejected") {
        return { recalculated: false, reason: "Report already closed" };
      }

      const newPriority = this.calculatePriority(report);

      // Only update if priority changed significantly (more than 5 points)
      if (Math.abs(newPriority - report.priority) > 5) {
        await this.getReport(reportId); // Refresh report

        const PotholeReport = require("../models/PotholeReport");
        await PotholeReport.findOneAndUpdate(
          { reportId },
          {
            priority: Math.min(newPriority, 100),
            updatedAt: new Date(),
            $push: {
              history: {
                action: "Priority recalculated",
                timestamp: new Date(),
                agentName: this.name,
                details: `Updated from ${report.priority} to ${newPriority}`,
              },
            },
          },
        );

        await this.logAction(
          reportId,
          "PRIORITY_RECALCULATED",
          `${report.priority} → ${newPriority}`,
        );

        return {
          recalculated: true,
          oldPriority: report.priority,
          newPriority,
        };
      }

      return { recalculated: false, reason: "Priority unchanged" };
    } catch (error) {
      console.error(
        `[${this.name}] Recalculation error for ${reportId}:`,
        error,
      );
      return { recalculated: false, reason: "Error occurred" };
    }
  }

  /**
   * Get high priority reports that need immediate attention
   */
  async getHighPriorityReports() {
    try {
      const PotholeReport = require("../models/PotholeReport");

      const highPriorityReports = await PotholeReport.find({
        priority: { $gte: 70 },
        status: { $nin: ["completed", "rejected"] },
      }).sort({ priority: -1 });

      return highPriorityReports;
    } catch (error) {
      console.error(
        `[${this.name}] Error fetching high priority reports:`,
        error,
      );
      return [];
    }
  }
}

// Export singleton instance
module.exports = new PrioritizationAgent();
