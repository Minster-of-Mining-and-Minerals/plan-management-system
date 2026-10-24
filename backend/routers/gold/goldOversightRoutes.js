"use strict";

const express = require("express");
const router = express.Router();
const oversightController = require("../../controllers/gold/goldOversightController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Purchasing center gold dashboard
router.get(
  "/dashboard",
  checkAnyPermission([
    { resource: "gold_purchases", action: "read" },
    { resource: "gold_reports", action: "read" },
    { resource: "purchasing_center_dashboard", action: "view" },
    { resource: "purchasing_centers", action: "read" },
    { resource: "gold_oversight", action: "read" },
  ]),
  oversightController.getPurchasingCenterDashboard
);

// Centralized federal gold operations oversight dashboard
router.get(
  "/oversight-dashboard",
  checkAnyPermission([
    { resource: "gold_oversight", action: "read" },
    { resource: "gold_oversight", action: "manage" },
    { resource: "purchasing_centers", action: "read" },
    { resource: "purchasing_centers", action: "manage" },
  ]),
  oversightController.getFederalOversightDashboard
);

module.exports = router;
