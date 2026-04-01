const BaseAgent = require("./BaseAgent");
const nodemailer = require("nodemailer");
const User = require("../models/User");

/**
 * Communication Agent
 * Sends notifications to citizens and authorities
 */
class CommunicationAgent extends BaseAgent {
  constructor() {
    super("Citizen Communication Agent");
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    try {
      // Only initialize if email credentials are provided
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        this.emailTransporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || "smtp.gmail.com",
          port: process.env.EMAIL_PORT || 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        console.log(`[${this.name}] Email transporter initialized`);
      } else {
        console.log(
          `[${this.name}] Email not configured - notifications will be logged only`,
        );
      }
    } catch (error) {
      console.error(
        `[${this.name}] Email transporter initialization failed:`,
        error,
      );
    }
  }

  /**
   * Notify citizen about report status update
   */
  async notifyStatusUpdate(report, statusChange) {
    try {
      const user = await User.findById(report.citizenId);

      if (!user) {
        await this.logAction(
          report.reportId,
          "NOTIFICATION_SKIP",
          "User not found",
        );
        return { sent: false, reason: "User not found" };
      }

      await this.logAction(
        report.reportId,
        "NOTIFICATION_START",
        `Notifying ${user.email} about status: ${statusChange.newStatus}`,
      );

      // Send notification based on user preferences
      const notifications = [];

      if (user.notificationPreferences.email) {
        const emailResult = await this.sendEmailNotification(
          user,
          report,
          statusChange,
        );
        notifications.push(emailResult);
      }

      if (user.notificationPreferences.sms && user.phone) {
        // SMS not implemented yet
        await this.logAction(
          report.reportId,
          "SMS_SKIP",
          "SMS notifications not implemented",
        );
      }

      await this.addHistory(
        report.reportId,
        "Citizen notified",
        `Status update sent to ${user.email}`,
      );

      return { sent: true, notifications };
    } catch (error) {
      console.error(
        `[${this.name}] Notification error for ${report.reportId}:`,
        error,
      );
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(user, report, statusChange) {
    try {
      const subject = `Pothole Report ${report.reportId} - ${this.formatStatus(statusChange.newStatus)}`;
      const body = this.generateEmailBody(user, report, statusChange);

      if (this.emailTransporter) {
        // Send actual email
        const info = await this.emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject,
          html: body,
        });

        await this.logAction(
          report.reportId,
          "EMAIL_SENT",
          `Email sent to ${user.email} (MessageId: ${info.messageId})`,
        );

        return { type: "email", sent: true, to: user.email };
      } else {
        // Email not configured - log the notification
        console.log(`\n${"=".repeat(60)}`);
        console.log(`[${this.name}] EMAIL NOTIFICATION (Simulated)`);
        console.log(`${"=".repeat(60)}`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: ${subject}`);
        console.log(`\n${body.replace(/<[^>]*>/g, "")}\n`); // Strip HTML tags for console
        console.log(`${"=".repeat(60)}\n`);

        await this.logAction(
          report.reportId,
          "EMAIL_LOGGED",
          `Email notification logged for ${user.email}`,
        );

        return { type: "email", sent: "simulated", to: user.email };
      }
    } catch (error) {
      console.error(`[${this.name}] Email send error:`, error);
      return { type: "email", sent: false, error: error.message };
    }
  }

  /**
   * Generate email body HTML
   */
  generateEmailBody(user, report, statusChange) {
    const statusMessage = this.getStatusMessage(statusChange.newStatus);
    const mapLink = `https://www.google.com/maps?q=${report.location.latitude},${report.location.longitude}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8f9fa; }
          .info-box { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .label { font-weight: bold; color: #666; }
          .value { color: #333; }
          .status { padding: 10px; border-radius: 5px; text-align: center; font-weight: bold; }
          .status-submitted { background-color: #ffc107; }
          .status-validated { background-color: #17a2b8; }
          .status-assessed { background-color: #17a2b8; }
          .status-prioritized { background-color: #6c757d; }
          .status-assigned { background-color: #fd7e14; }
          .status-in-progress { background-color: #007bff; color: white; }
          .status-completed { background-color: #28a745; color: white; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚧 Pothole Report Update</h1>
          </div>
          
          <div class="content">
            <p>Dear ${user.name},</p>
            
            <p>${statusMessage}</p>
            
            <div class="info-box">
              <p><span class="label">Report ID:</span> <span class="value">${report.reportId}</span></p>
              <p><span class="label">Status:</span></p>
              <div class="status status-${statusChange.newStatus}">
                ${this.formatStatus(statusChange.newStatus)}
              </div>
            </div>
            
            <div class="info-box">
              <p><span class="label">Location:</span><br>
              <span class="value">${report.location.address || "No address provided"}</span><br>
              <span class="value">${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}</span></p>
              
              ${report.severity ? `<p><span class="label">Severity:</span> <span class="value">${report.severity.toUpperCase()}</span></p>` : ""}
              
              ${report.priority ? `<p><span class="label">Priority:</span> <span class="value">${report.priority}/100</span></p>` : ""}
              
              ${report.deadline ? `<p><span class="label">Expected Completion:</span> <span class="value">${new Date(report.deadline).toLocaleDateString()}</span></p>` : ""}
              
              ${report.assignedTo ? `<p><span class="label">Assigned To:</span> <span class="value">${report.assignedTo}</span></p>` : ""}
            </div>
            
            <div style="text-align: center;">
              <a href="${mapLink}" class="button">View Location on Map</a>
            </div>
            
            <p style="margin-top: 20px;">Thank you for helping keep our roads safe!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from the Pothole Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get status message for email
   */
  getStatusMessage(status) {
    const messages = {
      submitted:
        "Your pothole report has been received and is being processed.",
      validated: "Your report has been validated and confirmed.",
      assessed: "The damage has been assessed and severity determined.",
      prioritized: "Your report has been prioritized for repair.",
      assigned: "A repair team has been assigned to fix this pothole.",
      "in-progress": "Repair work is currently in progress!",
      completed: "✅ Great news! The pothole has been repaired.",
      rejected: "Your report could not be processed. Please check the details.",
    };

    return messages[status] || "Your report status has been updated.";
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Notify about escalation
   */
  async notifyEscalation(report, escalationLevel, daysOverdue) {
    try {
      await this.logAction(
        report.reportId,
        "ESCALATION_NOTIFICATION",
        `Level ${escalationLevel} escalation - ${daysOverdue} days overdue`,
      );

      // Notify citizen about delay
      const user = await User.findById(report.citizenId);
      if (user && user.notificationPreferences.email) {
        await this.sendEscalationEmail(
          user,
          report,
          escalationLevel,
          daysOverdue,
        );
      }

      // Log notification for authorities (could send to admin emails)
      console.log(`\n${"!".repeat(60)}`);
      console.log(`[${this.name}] ESCALATION ALERT - Level ${escalationLevel}`);
      console.log(`${"!".repeat(60)}`);
      console.log(`Report: ${report.reportId}`);
      console.log(`Severity: ${report.severity}`);
      console.log(`Days Overdue: ${daysOverdue}`);
      console.log(`Location: ${report.location.address || "No address"}`);
      console.log(`${"!".repeat(60)}\n`);

      return { notified: true };
    } catch (error) {
      console.error(`[${this.name}] Escalation notification error:`, error);
      return { notified: false, error: error.message };
    }
  }

  /**
   * Send escalation email
   */
  async sendEscalationEmail(user, report, escalationLevel, daysOverdue) {
    const subject = `Pothole Report ${report.reportId} - Repair Delayed`;
    const body = `
      <p>Dear ${user.name},</p>
      <p>We apologize for the delay in repairing the pothole you reported (${report.reportId}).</p>
      <p>The repair is ${daysOverdue} days overdue and has been escalated to priority level ${escalationLevel}.</p>
      <p>We are working to resolve this as quickly as possible.</p>
      <p>Thank you for your patience.</p>
    `;

    // Log or send email
    console.log(`[${this.name}] Escalation email to ${user.email}: ${subject}`);
  }

  /**
   * Notify completion and request confirmation
   */
  async notifyCompletion(report) {
    try {
      const user = await User.findById(report.citizenId);

      if (!user) {
        return { notified: false, reason: "User not found" };
      }

      const statusChange = {
        newStatus: "completed",
        oldStatus: report.status,
      };

      await this.notifyStatusUpdate(report, statusChange);

      await this.logAction(
        report.reportId,
        "COMPLETION_NOTIFICATION",
        `Completion notification sent to ${user.email}`,
      );

      return { notified: true };
    } catch (error) {
      console.error(`[${this.name}] Completion notification error:`, error);
      return { notified: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new CommunicationAgent();
