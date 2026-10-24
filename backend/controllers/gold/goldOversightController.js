"use strict";

const goldDashboardService = require("../../services/goldDashboardService");

async function getPurchasingCenterDashboard(req, res) {
  try {
    let pcId = req.query.purchasing_center_id;
    if (req.user?.is_purchasing_center) {
      if (pcId && pcId !== req.user.purchasing_center_id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Cannot view another purchasing center's dashboard.",
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

    const data = await goldDashboardService.getPurchasingCenterDashboard(pcId, req.query, req.user);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error loading gold purchasing center dashboard:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load gold purchasing dashboard.",
    });
  }
}

async function getFederalOversightDashboard(req, res) {
  try {
    const data = await goldDashboardService.getFederalOversightDashboard(req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error loading federal gold oversight dashboard:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load federal gold oversight dashboard.",
    });
  }
}

module.exports = {
  getPurchasingCenterDashboard,
  getFederalOversightDashboard,
};
