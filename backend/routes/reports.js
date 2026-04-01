const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const PotholeReport = require("../models/PotholeReport");
const {
  authenticateToken,
  requireAdmin,
  requireAuthority,
} = require("../middleware/auth");
const Orchestrator = require("../agents/Orchestrator");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cb(null, `pothole-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// Submit new pothole report
router.post(
  "/submit",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const { latitude, longitude, address } = req.body;

      // Validate required fields
      if (!req.file) {
        return res.status(400).json({ error: "Image is required." });
      }

      if (!latitude || !longitude) {
        return res
          .status(400)
          .json({ error: "Location coordinates are required." });
      }

      // Validate coordinates
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        // Delete uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid location coordinates." });
      }

      // Create new report
      const report = new PotholeReport({
        reportId: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        citizenId: req.user.userId,
        location: {
          latitude: lat,
          longitude: lng,
          address: address || "",
        },
        imageUrl: `/uploads/${req.file.filename}`,
        status: "submitted",
        history: [
          {
            action: "Report submitted by citizen",
            timestamp: new Date(),
            agentName: "System",
            details: "Initial report submission",
          },
        ],
      });

      await report.save();

      // Trigger agent orchestrator to process the report asynchronously
      console.log(
        `[API] Triggering agent workflow for report ${report.reportId}`,
      );

      // Process in background (non-blocking)
      Orchestrator.processReportAsync(report).catch((error) => {
        console.error(
          `[API] Error processing report ${report.reportId}:`,
          error,
        );
      });

      res.status(201).json({
        message:
          "Report submitted successfully. Our AI agents will process it shortly.",
        report: {
          reportId: report.reportId,
          status: report.status,
          location: report.location,
          imageUrl: report.imageUrl,
          createdAt: report.createdAt,
        },
      });
    } catch (error) {
      // Delete uploaded file if error occurs
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError);
        }
      }

      console.error("Report submission error:", error);
      res.status(500).json({ error: "Server error submitting report." });
    }
  },
);

// Get all reports for the authenticated user
router.get("/my-reports", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await PotholeReport.find({ citizenId: req.user.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-history"); // Exclude history for list view

    const total = await PotholeReport.countDocuments({
      citizenId: req.user.userId,
    });

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ error: "Server error fetching reports." });
  }
});

// Get specific report by reportId
router.get("/:reportId", authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await PotholeReport.findOne({ reportId }).populate(
      "citizenId",
      "name email phone",
    );

    if (!report) {
      return res.status(404).json({ error: "Report not found." });
    }

    // Check if user has permission to view this report
    const isOwner = report.citizenId._id.toString() === req.user.userId;
    const isAuthorized =
      req.userDoc.role === "admin" || req.userDoc.role === "authority";

    if (!isOwner && !isAuthorized) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.json({ report });
  } catch (error) {
    console.error("Fetch report error:", error);
    res.status(500).json({ error: "Server error fetching report." });
  }
});

// Get all reports (admin/authority only)
router.get("/", authenticateToken, requireAuthority, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filter options
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    if (req.query.priority) {
      const priorityFilter = req.query.priority;
      if (priorityFilter === "high") {
        filter.priority = { $gte: 70 };
      } else if (priorityFilter === "medium") {
        filter.priority = { $gte: 40, $lt: 70 };
      } else if (priorityFilter === "low") {
        filter.priority = { $lt: 40 };
      }
    }

    const reports = await PotholeReport.find(filter)
      .populate("citizenId", "name email phone")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-history");

    const total = await PotholeReport.countDocuments(filter);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Fetch all reports error:", error);
    res.status(500).json({ error: "Server error fetching reports." });
  }
});

// Update report status (admin/authority only)
router.patch(
  "/:reportId/status",
  authenticateToken,
  requireAuthority,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, assignedTo, notes } = req.body;

      const validStatuses = [
        "submitted",
        "validated",
        "assessed",
        "prioritized",
        "assigned",
        "in-progress",
        "completed",
        "rejected",
      ];

      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
      }

      const updateData = {
        status,
        updatedAt: new Date(),
      };

      if (assignedTo) updateData.assignedTo = assignedTo;
      if (status === "completed") updateData.completedAt = new Date();

      const report = await PotholeReport.findOneAndUpdate(
        { reportId },
        {
          ...updateData,
          $push: {
            history: {
              action: `Status changed to ${status}`,
              timestamp: new Date(),
              agentName: req.userDoc.name,
              details: notes || `Manually updated by ${req.userDoc.role}`,
            },
          },
        },
        { new: true },
      );

      if (!report) {
        return res.status(404).json({ error: "Report not found." });
      }

      res.json({
        message: "Report status updated successfully",
        report,
      });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Server error updating status." });
    }
  },
);

// Get report statistics (admin/authority only)
router.get(
  "/stats/overview",
  authenticateToken,
  requireAuthority,
  async (req, res) => {
    try {
      const totalReports = await PotholeReport.countDocuments();

      const statusCounts = await PotholeReport.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const severityCounts = await PotholeReport.aggregate([
        {
          $match: { severity: { $ne: null } },
        },
        {
          $group: {
            _id: "$severity",
            count: { $sum: 1 },
          },
        },
      ]);

      const criticalReports = await PotholeReport.countDocuments({
        severity: "critical",
        status: { $nin: ["completed", "rejected"] },
      });

      const overdueReports = await PotholeReport.countDocuments({
        deadline: { $lt: new Date() },
        status: { $nin: ["completed", "rejected"] },
      });

      res.json({
        total: totalReports,
        critical: criticalReports,
        overdue: overdueReports,
        byStatus: statusCounts,
        bySeverity: severityCounts,
      });
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ error: "Server error fetching statistics." });
    }
  },
);

// Delete report (admin only)
router.delete(
  "/:reportId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { reportId } = req.params;

      const report = await PotholeReport.findOne({ reportId });

      if (!report) {
        return res.status(404).json({ error: "Report not found." });
      }

      // Delete associated image file
      if (report.imageUrl) {
        const imagePath = path.join(__dirname, "..", report.imageUrl);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await PotholeReport.deleteOne({ reportId });

      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      console.error("Delete report error:", error);
      res.status(500).json({ error: "Server error deleting report." });
    }
  },
);

module.exports = router;
