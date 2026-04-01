const BaseAgent = require("./BaseAgent");
const PotholeReport = require("../models/PotholeReport");

/**
 * Monitoring & Escalation Agent
 * Monitors repair progress and escalates overdue reports
 */
class MonitoringAgent extends BaseAgent {
  constructor() {
    super("Monitoring & Escalation Agent");
    this.escalationThresholds = {
      first: 1, // Escalate 1 day after deadline
      second: 3, // Escalate 3 days after deadline
      critical: 7, // Critical escalation 7 days after deadline
    };
  }

  /**
   * Monitor all active reports
   */
  async monitorReports() {
    this.isProcessing = true;

    try {
      await this.logAction(
        "SYSTEM",
        "MONITORING_START",
        "Checking all active reports",
      );

      // Get all active reports
      const activeReports = await PotholeReport.find({
        status: { $nin: ["completed", "rejected", "submitted"] },
        deadline: { $exists: true, $ne: null },
      });

      await this.logAction(
        "SYSTEM",
        "MONITORING_SCAN",
        `Found ${activeReports.length} active reports`,
      );

      let escalated = 0;
      let warnings = 0;

      for (const report of activeReports) {
        const result = await this.checkReport(report);

        if (result.action === "escalated") {
          escalated++;
        } else if (result.action === "warning") {
          warnings++;
        }
      }

      await this.logAction(
        "SYSTEM",
        "MONITORING_COMPLETE",
        `Escalated: ${escalated}, Warnings: ${warnings}, Total checked: ${activeReports.length}`,
      );

      return {
        checked: activeReports.length,
        escalated,
        warnings,
      };
    } catch (error) {
      console.error(`[${this.name}] Monitoring error:`, error);
      return { checked: 0, escalated: 0, warnings: 0, error: error.message };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check individual report for deadline compliance
   */
  async checkReport(report) {
    try {
      const now = new Date();
      const deadline = new Date(report.deadline);

      // Check if past deadline
      if (now > deadline) {
        const daysOverdue = Math.floor(
          (now - deadline) / (1000 * 60 * 60 * 24),
        );

        await this.logAction(
          report.reportId,
          "OVERDUE_DETECTED",
          `${daysOverdue} days past deadline`,
        );

        // Escalate based on how overdue it is
        await this.escalateReport(report, daysOverdue);

        return { action: "escalated", daysOverdue };
      }

      // Check if approaching deadline (within 24 hours)
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);
      if (hoursUntilDeadline <= 24 && hoursUntilDeadline > 0) {
        await this.warnUpcoming(report, hoursUntilDeadline);
        return { action: "warning", hoursRemaining: hoursUntilDeadline };
      }

      return { action: "ok" };
    } catch (error) {
      console.error(
        `[${this.name}] Check error for ${report.reportId}:`,
        error,
      );
      return { action: "error", error: error.message };
    }
  }

  /**
   * Escalate overdue report
   */
  async escalateReport(report, daysOverdue) {
    try {
      const currentLevel = report.escalationLevel || 0;
      const newLevel = currentLevel + 1;

      // Determine escalation severity
      let escalationType;
      if (daysOverdue >= this.escalationThresholds.critical) {
        escalationType = "CRITICAL";
      } else if (daysOverdue >= this.escalationThresholds.second) {
        escalationType = "HIGH";
      } else {
        escalationType = "STANDARD";
      }

      // Update report
      await PotholeReport.findOneAndUpdate(
        { reportId: report.reportId },
        {
          escalationLevel: newLevel,
          updatedAt: new Date(),
          $push: {
            history: {
              action: `Escalated to level ${newLevel}`,
              timestamp: new Date(),
              agentName: this.name,
              details: `${escalationType} escalation - ${daysOverdue} days overdue`,
            },
          },
        },
      );

      await this.logAction(
        report.reportId,
        "ESCALATED",
        `Level ${currentLevel} → ${newLevel} (${escalationType})`,
      );

      // Recalculate priority with escalation
      const PrioritizationAgent = require("./PrioritizationAgent");
      await PrioritizationAgent.recalculatePriority(report.reportId);

      // Notify authorities (handled by Communication Agent)
      const CommunicationAgent = require("./CommunicationAgent");
      await CommunicationAgent.notifyEscalation(report, newLevel, daysOverdue);
    } catch (error) {
      console.error(
        `[${this.name}] Escalation error for ${report.reportId}:`,
        error,
      );
    }
  }

  /**
   * Warn about upcoming deadline
   */
  async warnUpcoming(report, hoursRemaining) {
    try {
      await this.addHistory(
        report.reportId,
        "DEADLINE_WARNING",
        `Deadline in ${Math.round(hoursRemaining)} hours`,
      );

      await this.logAction(
        report.reportId,
        "DEADLINE_APPROACHING",
        `${Math.round(hoursRemaining)} hours remaining`,
      );

      // Could send notification to assigned team here
    } catch (error) {
      console.error(
        `[${this.name}] Warning error for ${report.reportId}:`,
        error,
      );
    }
  }

  /**
   * Get overdue reports summary
   */
  async getOverdueReports() {
    try {
      const now = new Date();

      const overdueReports = await PotholeReport.find({
        deadline: { $lt: now },
        status: { $nin: ["completed", "rejected"] },
      })
        .sort({ deadline: 1 })
        .populate("citizenId", "name email phone");

      return overdueReports.map((report) => {
        const daysOverdue = Math.floor(
          (now - new Date(report.deadline)) / (1000 * 60 * 60 * 24),
        );
        return {
          reportId: report.reportId,
          severity: report.severity,
          priority: report.priority,
          escalationLevel: report.escalationLevel,
          daysOverdue,
          status: report.status,
          location: report.location,
        };
      });
    } catch (error) {
      console.error(`[${this.name}] Error fetching overdue reports:`, error);
      return [];
    }
  }

  /**
   * Get reports nearing deadline
   */
  async getUpcomingDeadlines(hoursAhead = 48) {
    try {
      const now = new Date();
      const future = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      const upcomingReports = await PotholeReport.find({
        deadline: { $gte: now, $lte: future },
        status: { $nin: ["completed", "rejected"] },
      }).sort({ deadline: 1 });

      return upcomingReports.map((report) => {
        const hoursRemaining = Math.round(
          (new Date(report.deadline) - now) / (1000 * 60 * 60),
        );
        return {
          reportId: report.reportId,
          severity: report.severity,
          priority: report.priority,
          hoursRemaining,
          deadline: report.deadline,
          status: report.status,
        };
      });
    } catch (error) {
      console.error(`[${this.name}] Error fetching upcoming deadlines:`, error);
      return [];
    }
  }

  /**
   * Reset escalation level (used when report progresses)
   */
  async resetEscalation(reportId) {
    try {
      await PotholeReport.findOneAndUpdate(
        { reportId },
        {
          escalationLevel: 0,
          updatedAt: new Date(),
          $push: {
            history: {
              action: "Escalation reset",
              timestamp: new Date(),
              agentName: this.name,
              details: "Progress made on report",
            },
          },
        },
      );

      await this.logAction(
        reportId,
        "ESCALATION_RESET",
        "Reset due to progress",
      );
    } catch (error) {
      console.error(
        `[${this.name}] Reset escalation error for ${reportId}:`,
        error,
      );
    }
  }
}

// Export singleton instance
module.exports = new MonitoringAgent();
