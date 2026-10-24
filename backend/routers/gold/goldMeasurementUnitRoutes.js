"use strict";

const express = require("express");
const router = express.Router();
const unitController = require("../../controllers/gold/goldMeasurementUnitController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Read units: Purchasing center, company production, and federal users
router.get(
  "/",
  checkAnyPermission([
    { resource: "gold_units", action: "read" },
    { resource: "gold_units", action: "manage" },
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_purchases", action: "read" },
    { resource: "production_items", action: "read" },
    { resource: "production_items", action: "manage" },
    { resource: "company_production", action: "read" },
    { resource: "company_production_reports", action: "create" },
  ]),
  unitController.listUnits
);

router.get(
  "/:id",
  checkAnyPermission([
    { resource: "gold_units", action: "read" },
    { resource: "gold_units", action: "manage" },
  ]),
  unitController.getUnitById
);

// Administration of units: Federal administrators with explicit permissions
router.post(
  "/",
  checkAnyPermission([
    { resource: "gold_units", action: "create" },
    { resource: "gold_units", action: "manage" },
  ]),
  unitController.createUnit
);

router.put(
  "/:id",
  checkAnyPermission([
    { resource: "gold_units", action: "update" },
    { resource: "gold_units", action: "manage" },
  ]),
  unitController.updateUnit
);

router.patch(
  "/:id/status",
  checkAnyPermission([
    { resource: "gold_units", action: "deactivate" },
    { resource: "gold_units", action: "update" },
    { resource: "gold_units", action: "manage" },
  ]),
  unitController.toggleUnitStatus
);

module.exports = router;
