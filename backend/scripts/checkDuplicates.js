const mongoose = require("mongoose");
const PotholeReport = require("../models/PotholeReport");

async function checkDuplicates() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pothole_management");
    console.log("Connected to MongoDB\n");

    const reports = await PotholeReport.find({
      reportId: {
        $in: ["PR-1771947633891-0R7BEA5Y1", "PR-1771947580835-PIO0SL3MI"],
      },
    })
      .select(
        "reportId imageHash imageUrl status severity rejectionReason createdAt",
      )
      .sort({ createdAt: 1 });

    console.log("Report 1 (submitted first):");
    console.log("  ID:", reports[0].reportId);
    console.log("  Status:", reports[0].status);
    console.log("  Severity:", reports[0].severity);
    console.log("  ImageHash:", reports[0].imageHash || "NOT SET");
    console.log("  ImageUrl:", reports[0].imageUrl);
    console.log("  Rejection:", reports[0].rejectionReason || "None");
    console.log("");
    console.log("Report 2 (submitted second):");
    console.log("  ID:", reports[1].reportId);
    console.log("  Status:", reports[1].status);
    console.log("  Severity:", reports[1].severity);
    console.log("  ImageHash:", reports[1].imageHash || "NOT SET");
    console.log("  ImageUrl:", reports[1].imageUrl);
    console.log("  Rejection:", reports[1].rejectionReason || "None");

    if (reports[0].imageHash && reports[1].imageHash) {
      console.log("");
      console.log("Same hash?", reports[0].imageHash === reports[1].imageHash);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkDuplicates();
