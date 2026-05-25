// controllers/dashboardController.js
const dashboardService = require("../services/dashboardService");

/**
 * Get overall dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  const result = await dashboardService.getDashboardStats();
  
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
};

/**
 * Get dashboard summary metrics
 */
const getDashboardSummary = async (req, res) => {
  const result = await dashboardService.getDashboardSummary();
  
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
};

module.exports = {
  getDashboardStats,
  getDashboardSummary,
};
