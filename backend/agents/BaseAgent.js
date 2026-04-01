const PotholeReport = require("../models/PotholeReport");

/**
 * Base Agent Class
 * All specialized agents inherit from this class
 */
class BaseAgent {
  constructor(name) {
    this.name = name;
    this.isProcessing = false;
  }

  /**
   * Log agent actions to console and database
   */
  async logAction(reportId, action, details) {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${this.name}] ${action} - Report: ${reportId}`,
    );
    console.log(`  Details: ${details}`);
  }

  /**
   * Update report status and add history entry
   */
  async updateReportStatus(reportId, status, additionalData = {}) {
    try {
      const updateData = {
        status,
        updatedAt: new Date(),
        ...additionalData,
      };

      const historyEntry = {
        action: `Status changed to ${status}`,
        timestamp: new Date(),
        agentName: this.name,
        details: JSON.stringify(additionalData),
      };

      const report = await PotholeReport.findOneAndUpdate(
        { reportId },
        {
          ...updateData,
          $push: { history: historyEntry },
        },
        { new: true },
      );

      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }

      await this.logAction(reportId, "STATUS_UPDATE", `Updated to ${status}`);
      return report;
    } catch (error) {
      console.error(`[${this.name}] Error updating report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Add history entry without changing status
   */
  async addHistory(reportId, action, details) {
    try {
      const historyEntry = {
        action,
        timestamp: new Date(),
        agentName: this.name,
        details,
      };

      await PotholeReport.findOneAndUpdate(
        { reportId },
        {
          $push: { history: historyEntry },
          updatedAt: new Date(),
        },
      );

      await this.logAction(reportId, action, details);
    } catch (error) {
      console.error(
        `[${this.name}] Error adding history to ${reportId}:`,
        error,
      );
    }
  }

  /**
   * Get report by ID
   */
  async getReport(reportId) {
    try {
      const report = await PotholeReport.findOne({ reportId });
      if (!report) {
        throw new Error(`Report ${reportId} not found`);
      }
      return report;
    } catch (error) {
      console.error(`[${this.name}] Error fetching report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Check if agent is currently processing
   */
  isActive() {
    return this.isProcessing;
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = BaseAgent;
