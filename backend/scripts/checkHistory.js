const mongoose = require("mongoose");
const PotholeReport = require("../models/PotholeReport");

async function checkHistory() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pothole_management");

    const report = await PotholeReport.findOne({
      reportId: "PR-1771947633891-0R7BEA5Y1",
    });

    console.log("Report:", report.reportId);
    console.log("Status:", report.status);
    console.log("Severity:", report.severity);
    console.log("Damage Type:", report.damageType);
    console.log("Priority:", report.priority);
    console.log("\nHistory:");
    report.history.forEach((h) => {
      console.log(
        `  ${h.timestamp.toISOString().substr(11, 12)} | ${h.action}`,
      );
      if (h.details) console.log(`    Details: ${h.details}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkHistory();
