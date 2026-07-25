"use strict";

const express = require("express");
const router = express.Router();
const predictiveOperationsController = require("../controllers/predictive/predictiveOperationsController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/",
  checkPermission("operations", "operations:prediction_view"),
  predictiveOperationsController.getPredictions
);

router.get(
  "/risk-scores",
  checkPermission("operations", "operations:risk_view"),
  predictiveOperationsController.getRiskScores
);

router.get(
  "/recommendations",
  checkPermission("operations", "operations:prediction_view"),
  predictiveOperationsController.getPredictiveRecommendations
);

router.post(
  "/preventive-action",
  checkPermission("operations", "operations:recommendation_execute"),
  predictiveOperationsController.executePreventiveAction
);

router.get(
  "/models",
  checkPermission("operations", "operations:model_manage"),
  predictiveOperationsController.getModelRegistry
);

router.get(
  "/history",
  checkPermission("operations", "operations:prediction_view"),
  predictiveOperationsController.getPredictionHistory
);

router.get(
  "/analytics",
  checkPermission("operations", "operations:prediction_analytics"),
  predictiveOperationsController.getPredictiveAnalytics
);

router.get(
  "/dashboard",
  checkPermission("operations", "operations:prediction_view"),
  predictiveOperationsController.getPredictiveDashboard
);

router.get(
  "/department/:dept",
  checkPermission("operations", "operations:prediction_view"),
  predictiveOperationsController.getDepartmentPredictions
);

module.exports = router;
