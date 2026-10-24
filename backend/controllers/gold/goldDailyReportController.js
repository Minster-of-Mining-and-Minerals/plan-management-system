"use strict";

const dailyReportService = require("../../services/goldDailyReportService");

async function getDailyReport(req, res) {
  try {
    let pcId = req.query.purchasing_center_id;
    if (req.user?.is_purchasing_center) {
      if (pcId && pcId !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot view report for another purchasing center.",
        });
      }
      pcId = req.user.purchasing_center_id;
    }

    if (!pcId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id is required.",
      });
    }

    const report = await dailyReportService.getDailyReport(pcId, req.query.business_date, req.user);
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error generating gold daily report:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to generate gold daily report.",
    });
  }
}

async function submitDailyReport(req, res) {
  try {
    let pcId = req.body.purchasing_center_id;
    if (req.user?.is_purchasing_center) {
      if (pcId && pcId !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot submit report for another purchasing center.",
        });
      }
      pcId = req.user.purchasing_center_id;
    }

    if (!pcId) {
      return res.status(400).json({
        success: false,
        message: "purchasing_center_id is required.",
      });
    }

    const report = await dailyReportService.submitDailyReport(
      pcId,
      req.body.business_date,
      req.body.notes,
      req.user
    );
    return res.status(200).json({
      success: true,
      message: "Daily gold purchasing report submitted successfully.",
      data: report,
    });
  } catch (error) {
    console.error("Error submitting daily gold report:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to submit daily gold report.",
    });
  }
}

async function listHistoricalReports(req, res) {
  try {
    const results = await dailyReportService.listHistoricalReports(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: results.items,
      pagination: {
        total: results.total,
        page: results.page,
        limit: results.limit,
        total_pages: results.total_pages,
      },
    });
  } catch (error) {
    console.error("Error listing historical daily reports:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to list historical reports.",
    });
  }
}

module.exports = {
  getDailyReport,
  submitDailyReport,
  listHistoricalReports,
};
