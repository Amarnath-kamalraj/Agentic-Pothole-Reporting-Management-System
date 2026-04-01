const cron = require("node-cron");
const MonitoringAgent = require("../agents/MonitoringAgent");
const PrioritizationAgent = require("../agents/PrioritizationAgent");
const PotholeReport = require("../models/PotholeReport");

let monitoringJob = null;
let reprioritizationJob = null;

/**
 * Start all scheduled background jobs
 */
function startScheduler() {
  console.log("[Scheduler] Starting background jobs...");

  // Job 1: Monitor reports every 6 hours
  // Cron pattern: '0 */6 * * *' = At minute 0 past every 6th hour
  monitoringJob = cron.schedule(
    "0 */6 * * *",
    async () => {
      console.log("\n[Scheduler] Running monitoring job...");
      try {
        await MonitoringAgent.monitorReports();
        console.log("[Scheduler] Monitoring job completed\n");
      } catch (error) {
        console.error("[Scheduler] Monitoring job error:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York", // Adjust to your timezone
    },
  );

  // Job 2: Recalculate priorities daily at 2 AM
  // Cron pattern: '0 2 * * *' = At 2:00 AM every day
  reprioritizationJob = cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("\n[Scheduler] Running reprioritization job...");
      try {
        const activeReports = await PotholeReport.find({
          status: {
            $in: [
              "validated",
              "assessed",
              "prioritized",
              "assigned",
              "in-progress",
            ],
          },
        });

        console.log(
          `[Scheduler] Recalculating priorities for ${activeReports.length} active reports`,
        );

        for (const report of activeReports) {
          await PrioritizationAgent.recalculatePriority(report);
          await sleep(100); // Small delay between recalculations
        }

        console.log("[Scheduler] Reprioritization job completed\n");
      } catch (error) {
        console.error("[Scheduler] Reprioritization job error:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/New_York", // Adjust to your timezone
    },
  );

  // Run monitoring immediately on startup
  console.log("[Scheduler] Running initial monitoring check...");
  MonitoringAgent.monitorReports().catch((error) => {
    console.error("[Scheduler] Initial monitoring error:", error);
  });

  console.log("[Scheduler] ✓ Background jobs started:");
  console.log("  - Monitoring: Every 6 hours");
  console.log("  - Reprioritization: Daily at 2:00 AM\n");
}

/**
 * Stop all scheduled jobs
 */
function stopScheduler() {
  console.log("[Scheduler] Stopping background jobs...");

  if (monitoringJob) {
    monitoringJob.stop();
  }

  if (reprioritizationJob) {
    reprioritizationJob.stop();
  }

  console.log("[Scheduler] ✓ All background jobs stopped\n");
}

/**
 * Manually trigger monitoring job
 */
async function runMonitoringNow() {
  console.log("[Scheduler] Manually triggering monitoring job...");
  try {
    await MonitoringAgent.monitorReports();
    console.log("[Scheduler] Manual monitoring completed\n");
    return { success: true };
  } catch (error) {
    console.error("[Scheduler] Manual monitoring error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Manually trigger reprioritization job
 */
async function runReprioritizationNow() {
  console.log("[Scheduler] Manually triggering reprioritization job...");
  try {
    const activeReports = await PotholeReport.find({
      status: {
        $in: [
          "validated",
          "assessed",
          "prioritized",
          "assigned",
          "in-progress",
        ],
      },
    });

    console.log(
      `[Scheduler] Recalculating priorities for ${activeReports.length} reports`,
    );

    for (const report of activeReports) {
      await PrioritizationAgent.recalculatePriority(report);
      await sleep(100);
    }

    console.log("[Scheduler] Manual reprioritization completed\n");
    return { success: true, reportsProcessed: activeReports.length };
  } catch (error) {
    console.error("[Scheduler] Manual reprioritization error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    monitoring: {
      running: monitoringJob ? true : false,
      schedule: "Every 6 hours",
    },
    reprioritization: {
      running: reprioritizationJob ? true : false,
      schedule: "Daily at 2:00 AM",
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  startScheduler,
  stopScheduler,
  runMonitoringNow,
  runReprioritizationNow,
  getSchedulerStatus,
};
