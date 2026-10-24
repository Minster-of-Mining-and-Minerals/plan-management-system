"use strict";

const express = require("express");
const router = express.Router();
const dailyReportController = require("../../controllers/gold/goldDailyReportController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Generate / view computed daily report for a given business date
router.get(
  "/daily",
  checkAnyPermission([
    { resource: "gold_reports", action: "read" },
    { resource: "gold_reports", action: "generate" },
    { resource: "gold_reports", action: "manage" },
    { resource: "gold_oversight", action: "read" },
    { resource: "gold_oversight", action: "manage" },
  ]),
  dailyReportController.getDailyReport
);

// Submit daily report
router.post(
  "/submit",
  checkAnyPermission([
    { resource: "gold_reports", action: "submit" },
    { resource: "gold_reports", action: "manage" },
  ]),
  dailyReportController.submitDailyReport
);

// List historical daily reports
router.get(
  "/",
  checkAnyPermission([
    { resource: "gold_reports", action: "read" },
    { resource: "gold_reports", action: "manage" },
    { resource: "gold_oversight", action: "read" },
    { resource: "gold_oversight", action: "manage" },
  ]),
  dailyReportController.listHistoricalReports
);

module.exports = router;
