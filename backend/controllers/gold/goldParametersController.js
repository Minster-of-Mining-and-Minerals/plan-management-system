"use strict";

const service = require("../../services/goldParametersService");

async function getParametersSettings(req, res) {
  try {
    const data = await service.getGoldParametersSettings();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching gold parameter settings:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch gold parameter settings.",
    });
  }
}

async function updateParametersSettings(req, res) {
  try {
    const payload = req.body || {};
    const data = await service.updateGoldParametersSettings(payload);
    return res.status(200).json({
      success: true,
      data,
      message: "Gold parameter settings updated successfully.",
    });
  } catch (error) {
    console.error("Error updating gold parameter settings:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update gold parameter settings.",
    });
  }
}

module.exports = {
  getParametersSettings,
  updateParametersSettings,
};
