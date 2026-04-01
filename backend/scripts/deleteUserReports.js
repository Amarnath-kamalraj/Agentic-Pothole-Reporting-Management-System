const mongoose = require("mongoose");
const User = require("../models/User");
const PotholeReport = require("../models/PotholeReport");

async function deleteUserReports(email) {
  try {
    await mongoose.connect("mongodb://localhost:27017/pothole_management");
    console.log("Connected to MongoDB");

    const user = await User.findOne({ email: email });
    if (!user) {
      console.log(`User ${email} not found`);
      process.exit(1);
    }

    const result = await PotholeReport.deleteMany({ citizenId: user._id });
    console.log(`Deleted ${result.deletedCount} reports for user ${email}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

const email = process.argv[2] || "tn@test.com";
deleteUserReports(email);
