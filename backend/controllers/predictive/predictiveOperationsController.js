"use strict";

const predictiveOperationsEngine = require("../../services/predictive/predictiveOperationsEngine");
const clinicalOperationalRiskService = require("../../services/predictive/clinicalOperationalRiskService");
const clinicalRecommendationService = require("../../services/capacity/clinicalRecommendationService");
const hospitalAutomationEngine = require("../../services/orchestration/hospitalAutomationEngine");
const predictionModelRegistryService = require("../../services/predictive/predictionModelRegistryService");
const clinicalPredictionService = require("../../services/predictive/clinicalPredictionService");
const predictiveAnalyticsService = require("../../services/predictive/predictiveAnalyticsService");
const predictiveDashboardService = require("../../services/predictive/predictiveDashboardService");

class PredictiveOperationsController {
  async getPredictions(req, res, next) {
    try {
      const data = await predictiveOperationsEngine.generatePredictions();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getRiskScores(req, res, next) {
    try {
      const data = await clinicalOperationalRiskService.getOperationalRiskScores();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPredictiveRecommendations(req, res, next) {
    try {
      const data = await clinicalRecommendationService.getPredictiveRecommendations();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async executePreventiveAction(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await hospitalAutomationEngine.executePreventiveAction(req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getModelRegistry(req, res, next) {
    try {
      const data = await predictionModelRegistryService.getModelRegistry();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPredictionHistory(req, res, next) {
    try {
      const data = await clinicalPredictionService.getPredictionHistory();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPredictiveAnalytics(req, res, next) {
    try {
      const data = await predictiveAnalyticsService.getPredictiveAnalytics();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPredictiveDashboard(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await predictiveDashboardService.getPredictiveDashboard(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentPredictions(req, res, next) {
    try {
      const { dept } = req.params;
      const data = await predictiveDashboardService.getDepartmentPredictions(dept);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PredictiveOperationsController();
