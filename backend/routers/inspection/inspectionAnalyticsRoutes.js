"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");
const inspectionAnalyticsController = require("../../controllers/inspection/inspectionAnalyticsController");

// Restrict endpoint to users with inspection read or manage permission
const requireInspectionRead = checkAnyPermission([
  { resource: "INSPECTION_ANALYTICS", action: "READ" },
  { resource: "INSPECTION_ANALYTICS", action: "MANAGE" },
]);

router.use(authenticateToken);
router.use(requireInspectionRead);

// Primary comprehensive bundle endpoint
router.get("/", inspectionAnalyticsController.getAnalytics);

// Specialized secondary sub-endpoints
router.get("/summary", inspectionAnalyticsController.getSummary);
router.get("/status", inspectionAnalyticsController.getByStatus);
router.get("/by-status", inspectionAnalyticsController.getByStatus);
router.get("/category", inspectionAnalyticsController.getByCategory);
router.get("/by-category", inspectionAnalyticsController.getByCategory);
router.get("/region", inspectionAnalyticsController.getByRegion);
router.get("/by-region", inspectionAnalyticsController.getByRegion);
router.get("/team", inspectionAnalyticsController.getByTeam);
router.get("/by-team", inspectionAnalyticsController.getByTeam);
router.get("/trends", inspectionAnalyticsController.getTrends);

module.exports = router;

