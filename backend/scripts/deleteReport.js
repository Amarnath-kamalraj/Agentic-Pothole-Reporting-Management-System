const mongoose = require("mongoose");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const reportId = process.argv[2];

if (!reportId) {
  console.error("Usage: node scripts/deleteReport.js <reportId>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    const Report = require("../models/PotholeReport");

    const report = await Report.findOne({ reportId });

    if (!report) {
      console.log("❌ Report not found:", reportId);
      process.exit(0);
    }

    console.log("Found report:", reportId);
    console.log("Status:", report.status);
    console.log("Location:", report.location?.address || "N/A");

    // Delete image file if exists
    if (report.imageUrl) {
      const imagePath = path.join(__dirname, "..", report.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("✓ Deleted image file:", report.imageUrl);
      }
    }

    // Delete report from database
    await Report.deleteOne({ reportId });
    console.log("✓ Deleted report from database");

    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
