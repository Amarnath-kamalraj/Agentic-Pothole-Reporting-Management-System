const express = require("express");
const router = express.Router();
const Report = require("../models/PotholeReport");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Get priority reports (priority >= 70)
router.get(
  "/priority-reports",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const reports = await Report.find({ priority: { $gte: 70 } })
        .sort({ priority: -1, createdAt: -1 })
        .populate("userId", "name email")
        .populate("assignedTo", "name email");

      res.json({ reports });
    } catch (error) {
      console.error("Error fetching priority reports:", error);
      res.status(500).json({ error: "Failed to fetch priority reports" });
    }
  },
);

// Get system statistics
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({
      status: { $in: ["submitted", "validated", "assessed", "prioritized"] },
    });
    const inProgressReports = await Report.countDocuments({
      status: { $in: ["assigned", "in_progress"] },
    });
    const completedReports = await Report.countDocuments({
      status: "completed",
    });

    res.json({
      totalReports,
      pendingReports,
      inProgressReports,
      completedReports,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Assign report to admin
router.put(
  "/assign/:reportId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const adminId = req.user.userId;

      console.log(
        "[Admin] Assign request - reportId:",
        reportId,
        "adminId:",
        adminId,
      );

      const report = await Report.findOne({ reportId: reportId });
      console.log(
        "[Admin] Report found:",
        report ? report.reportId : "NOT FOUND",
      );

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      report.assignedTo = adminId;
      report.status = "assigned";
      report.history.push({
        action: "assigned",
        timestamp: new Date(),
        agentName: "Admin",
        details: `Assigned to admin ${req.user.email}`,
      });

      await report.save();
      console.log("[Admin] Report assigned successfully:", report.reportId);

      res.json({ message: "Report assigned successfully", report });
    } catch (error) {
      console.error("Error assigning report:", error);
      res.status(500).json({ error: "Failed to assign report" });
    }
  },
);

// Update report status
router.put(
  "/status/:reportId",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, notes } = req.body;

      console.log(
        "[Admin] Status update - reportId:",
        reportId,
        "new status:",
        status,
      );

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

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const report = await Report.findOne({ reportId: reportId });
      console.log(
        "[Admin] Report found for status update:",
        report ? report.reportId : "NOT FOUND",
      );

      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      report.status = status;
      report.history.push({
        action: `Status updated to ${status}`,
        timestamp: new Date(),
        agentName: "Admin",
        details: notes || `Status updated to ${status} by admin`,
      });

      await report.save();
      console.log(
        "[Admin] Status updated successfully:",
        report.reportId,
        "to",
        status,
      );

      res.json({ message: "Report status updated successfully", report });
    } catch (error) {
      console.error("Error updating report status:", error);
      res.status(500).json({ error: "Failed to update report status" });
    }
  },
);

module.exports = router;
