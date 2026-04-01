const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

const makeAdmin = async (email) => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/pothole-reporting",
    );

    if (!email) {
      console.log("\nListing all users:");
      const users = await User.find({}).select("email role name");
      users.forEach((u) => {
        console.log(
          `  ${u.email} - Role: ${u.role} - Name: ${u.name || "N/A"}`,
        );
      });
      console.log("\nUsage: node makeAdmin.js <email>");
      process.exit(0);
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();

    console.log(`Successfully updated ${email} to admin role`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

const email = process.argv[2];
makeAdmin(email);
