const mongoose = require("mongoose");
const PotholeReport = require("../models/PotholeReport");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const cleanupAndSetup = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pothole-reporting",
    );
    console.log("Connected to MongoDB");

    // Delete all reports
    const deleteResult = await PotholeReport.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} reports`);

    // Clear uploads folder (keep the folder)
    const uploadsDir = path.join(__dirname, "../uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(uploadsDir, file));
      });
      console.log(`Cleared ${files.length} files from uploads folder`);
    }

    console.log("\nCleanup completed successfully!");
    console.log("\nNow you can:");
    console.log("1. Register a new user at http://localhost:3000/register");
    console.log(
      "2. Run: node scripts/addTamilNaduReports.js <email> <password>",
    );

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

cleanupAndSetup();
