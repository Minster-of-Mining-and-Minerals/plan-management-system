"use strict";

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/stats",
  checkPermission("dashboard", "view"),
  dashboardController.getDashboardStats
);
router.get(
  "/stats/summary",
  checkPermission("dashboard", "view"),
  dashboardController.getDashboardSummary
);

module.exports = router;
