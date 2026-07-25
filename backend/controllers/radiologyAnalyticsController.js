"use strict";

const radiologyAnalyticsService = require("../services/radiologyAnalyticsService");

class RadiologyAnalyticsController {
  async getOverviewMetrics(req, res, next) {
    try {
      const overview = await radiologyAnalyticsService.getOverviewMetrics();
      return res.json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  async getModalityStats(req, res, next) {
    try {
      const modalityStats = await radiologyAnalyticsService.getModalityStats();
      return res.json({
        success: true,
        data: modalityStats,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPerformanceMetrics(req, res, next) {
    try {
      const performance = await radiologyAnalyticsService.getPerformanceMetrics();
      return res.json({
        success: true,
        data: performance,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyAnalyticsController();
