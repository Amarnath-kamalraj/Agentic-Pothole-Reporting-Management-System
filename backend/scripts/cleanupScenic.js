const mongoose = require("mongoose");
const PotholeReport = require("../models/PotholeReport");
const fs = require("fs");
const path = require("path");

async function cleanupScenic() {
  try {
    await mongoose.connect("mongodb://localhost:27017/pothole_management");
    console.log("Connected to MongoDB\n");

    // Find the scenic reports
    const reports = await PotholeReport.find({
      reportId: {
        $in: ["PR-1771947633891-0R7BEA5Y1", "PR-1771947580835-PIO0SL3MI"],
      },
    });

    console.log(`Found ${reports.length} scenic reports to delete\n`);

    // Delete image files
    for (const report of reports) {
      const imagePath = path.join(__dirname, "..", report.imageUrl);
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log(`✓ Deleted image: ${report.imageUrl}`);
        }
      } catch (err) {
        console.log(
          `✗ Failed to delete image: ${report.imageUrl}`,
          err.message,
        );
      }
    }

    // Delete database records
    const result = await PotholeReport.deleteMany({
      reportId: {
        $in: ["PR-1771947633891-0R7BEA5Y1", "PR-1771947580835-PIO0SL3MI"],
      },
    });

    console.log(`\n✓ Deleted ${result.deletedCount} reports from database`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

cleanupScenic();
