const IntakeAgent = require("./IntakeAgent");
const AssessmentAgent = require("./AssessmentAgent");
const PrioritizationAgent = require("./PrioritizationAgent");
const CommunicationAgent = require("./CommunicationAgent");

/**
 * Agent Orchestrator
 * Coordinates the workflow of all agents to process pothole reports
 */
class AgentOrchestrator {
  constructor() {
    this.isProcessing = false;
    this.processQueue = [];
  }

  /**
   * Process a new report through the agent pipeline
   */
  async processNewReport(report) {
    const reportId = report.reportId || report._id;

    console.log(`\n${"=".repeat(70)}`);
    console.log(
      `[Orchestrator] Starting agent workflow for report ${reportId}`,
    );
    console.log(`${"=".repeat(70)}\n`);

    try {
      // Step 1: Validate the report
      console.log("[Orchestrator] Step 1/4: Validation");
      const validationResult = await IntakeAgent.validateReport(report);

      if (!validationResult.valid) {
        console.log(
          `[Orchestrator] ❌ Report ${reportId} failed validation: ${validationResult.reason}`,
        );

        // Notify citizen of rejection
        const updatedReport = await IntakeAgent.getReport(reportId);
        await CommunicationAgent.notifyStatusUpdate(updatedReport, {
          newStatus: "rejected",
          oldStatus: "submitted",
        });

        return {
          success: false,
          stage: "validation",
          reason: validationResult.reason,
        };
      }

      console.log(`[Orchestrator] ✓ Validation passed\n`);

      // Get updated report after validation
      let updatedReport = await IntakeAgent.getReport(reportId);

      // Step 2: Assess damage
      console.log("[Orchestrator] Step 2/4: Damage Assessment");
      const assessmentResult =
        await AssessmentAgent.assessDamage(updatedReport);

      if (!assessmentResult.assessed) {
        console.log(
          `[Orchestrator] ⚠️  Assessment failed: ${assessmentResult.reason}`,
        );
        return {
          success: false,
          stage: "assessment",
          reason: assessmentResult.reason,
        };
      }

      console.log(
        `[Orchestrator] ✓ Assessment complete: ${assessmentResult.severity} severity\n`,
      );

      // Get updated report after assessment
      updatedReport = await IntakeAgent.getReport(reportId);

      // Step 3: Prioritize
      console.log("[Orchestrator] Step 3/4: Prioritization");
      const prioritizationResult =
        await PrioritizationAgent.prioritize(updatedReport);

      if (!prioritizationResult.prioritized) {
        console.log(
          `[Orchestrator] ⚠️  Prioritization failed: ${prioritizationResult.reason}`,
        );
        return {
          success: false,
          stage: "prioritization",
          reason: prioritizationResult.reason,
        };
      }

      console.log(
        `[Orchestrator] ✓ Prioritization complete: ${prioritizationResult.priority}/100\n`,
      );

      // Get updated report after prioritization
      updatedReport = await IntakeAgent.getReport(reportId);

      // Step 4: Notify citizen
      console.log("[Orchestrator] Step 4/4: Citizen Notification");
      await CommunicationAgent.notifyStatusUpdate(updatedReport, {
        newStatus: "prioritized",
        oldStatus: "assessed",
      });

      console.log(`[Orchestrator] ✓ Notification sent\n`);

      console.log(`${"=".repeat(70)}`);
      console.log(
        `[Orchestrator] ✅ Successfully processed report ${reportId}`,
      );
      console.log(`  Status: ${updatedReport.status}`);
      console.log(`  Severity: ${updatedReport.severity}`);
      console.log(`  Priority: ${updatedReport.priority}/100`);
      console.log(
        `  Deadline: ${updatedReport.deadline ? new Date(updatedReport.deadline).toLocaleDateString() : "N/A"}`,
      );
      console.log(`${"=".repeat(70)}\n`);

      return {
        success: true,
        report: {
          reportId: updatedReport.reportId,
          status: updatedReport.status,
          severity: updatedReport.severity,
          priority: updatedReport.priority,
          deadline: updatedReport.deadline,
        },
      };
    } catch (error) {
      console.error(
        `[Orchestrator] ❌ Error processing report ${reportId}:`,
        error,
      );

      return {
        success: false,
        stage: "unknown",
        error: error.message,
      };
    }
  }

  /**
   * Process report asynchronously (non-blocking)
   */
  async processReportAsync(report) {
    // Add to queue and process in background
    this.processQueue.push(report);

    if (!this.isProcessing) {
      this.processQueue_internal();
    }

    return {
      queued: true,
      reportId: report.reportId,
      message: "Report added to processing queue",
    };
  }

  /**
   * Internal queue processor
   */
  async processQueue_internal() {
    if (this.processQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    while (this.processQueue.length > 0) {
      const report = this.processQueue.shift();

      try {
        await this.processNewReport(report);
      } catch (error) {
        console.error(`[Orchestrator] Queue processing error:`, error);
      }

      // Small delay between reports
      await this.sleep(1000);
    }

    this.isProcessing = false;
  }

  /**
   * Reprocess report (e.g., after status update)
   */
  async reprocessReport(reportId) {
    try {
      const report = await IntakeAgent.getReport(reportId);

      console.log(
        `[Orchestrator] Reprocessing report ${reportId} (current status: ${report.status})`,
      );

      // Determine which agents to run based on current status
      if (report.status === "submitted") {
        return await this.processNewReport(report);
      }

      if (report.status === "validated") {
        await AssessmentAgent.assessDamage(report);
        const updatedReport = await IntakeAgent.getReport(reportId);
        await PrioritizationAgent.prioritize(updatedReport);
      }

      if (report.status === "assessed") {
        await PrioritizationAgent.prioritize(report);
      }

      return { success: true };
    } catch (error) {
      console.error(`[Orchestrator] Reprocess error for ${reportId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processQueue.length,
      agents: {
        intake: IntakeAgent.isActive(),
        assessment: AssessmentAgent.isActive(),
        prioritization: PrioritizationAgent.isActive(),
      },
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
module.exports = new AgentOrchestrator();
