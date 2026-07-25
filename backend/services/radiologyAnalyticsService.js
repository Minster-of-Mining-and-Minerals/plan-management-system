"use strict";

const db = require("../models");

class RadiologyAnalyticsService {
  /**
   * Get operational overview metrics for radiology department.
   */
  async getOverviewMetrics() {
    const totalStudies = await db.RadiologyStudy.count();
    const completedStudies = await db.RadiologyStudy.count({ where: { workflow_status: "COMPLETED" } });
    const pendingReports = await db.RadiologyStudy.count({ where: { workflow_status: ["IMAGE_ACQUIRED", "REPORT_PENDING"] } });

    const verifiedReports = await db.RadiologyReport.findAll({
      where: { verification_status: ["FINAL", "AMENDED"] },
      attributes: ["created_at", "signed_at"],
    });

    let totalTurnaroundTimeMs = 0;
    let turnAroundCount = 0;
    for (const r of verifiedReports) {
      if (r.signed_at && r.created_at) {
        totalTurnaroundTimeMs += new Date(r.signed_at).getTime() - new Date(r.created_at).getTime();
        turnAroundCount++;
      }
    }

    const avgTurnaroundHours = turnAroundCount > 0 ? (totalTurnaroundTimeMs / turnAroundCount / (1000 * 60 * 60)).toFixed(1) : "0.0";

    return {
      total_studies: totalStudies,
      completed_studies: completedStudies,
      pending_reports: pendingReports,
      avg_turnaround_hours: Number(avgTurnaroundHours),
      avg_waiting_minutes: 25,
    };
  }

  /**
   * Get modality distribution stats (XRAY, CT, MRI, ULTRASOUND, etc.).
   */
  async getModalityStats() {
    const studies = await db.RadiologyStudy.findAll({
      attributes: ["modality"],
    });

    const breakdown = {
      XRAY: 0,
      CT: 0,
      MRI: 0,
      ULTRASOUND: 0,
      FLUOROSCOPY: 0,
      MAMMOGRAPHY: 0,
      ECG: 0,
      OTHER: 0,
    };

    for (const s of studies) {
      const mod = String(s.modality || "OTHER").toUpperCase();
      if (breakdown[mod] !== undefined) {
        breakdown[mod]++;
      } else {
        breakdown.OTHER++;
      }
    }

    return breakdown;
  }

  /**
   * Get radiologist performance turnaround time metrics.
   */
  async getPerformanceMetrics() {
    const reports = await db.RadiologyReport.findAll({
      include: [{ model: db.User, as: "reportedByUser", attributes: ["user_id", "full_name"] }],
    });

    const radiologistStats = {};

    for (const r of reports) {
      const radId = r.reported_by;
      const radName = r.reportedByUser?.full_name || "Unknown Radiologist";

      if (!radiologistStats[radId]) {
        radiologistStats[radId] = {
          user_id: radId,
          full_name: radName,
          reports_completed: 0,
          verified_count: 0,
          pending_count: 0,
        };
      }

      radiologistStats[radId].reports_completed++;
      if (r.verification_status === "FINAL" || r.verification_status === "AMENDED") {
        radiologistStats[radId].verified_count++;
      } else {
        radiologistStats[radId].pending_count++;
      }
    }

    return Object.values(radiologistStats);
  }
}

module.exports = new RadiologyAnalyticsService();
