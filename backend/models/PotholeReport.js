const mongoose = require("mongoose");

const potholeReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
  },
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imageHash: {
    type: String,
    index: true, // Index for fast duplicate image lookup
  },
  status: {
    type: String,
    enum: [
      "submitted",
      "validated",
      "assessed",
      "prioritized",
      "assigned",
      "in-progress",
      "completed",
      "rejected",
    ],
    default: "submitted",
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: null,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  damageType: {
    type: String,
    enum: [
      "small_pothole",
      "large_pothole",
      "crack",
      "broken_surface",
      "other",
    ],
    default: null,
  },
  assignedTo: {
    type: String,
    default: null,
  },
  deadline: {
    type: Date,
    default: null,
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  history: [
    {
      action: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
      agentName: String,
      details: String,
    },
  ],
});

module.exports = mongoose.model("PotholeReport", potholeReportSchema);
