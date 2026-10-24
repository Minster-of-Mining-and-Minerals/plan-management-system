"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/gold/goldPriceConfigurationController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// 1. Get active official rate (used during purchase recording)
router.get(
  "/active",
  checkAnyPermission([
    { resource: "gold_prices", action: "read" },
    { resource: "gold_prices", action: "manage" },
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_purchases", action: "read" },
  ]),
  controller.getActivePriceConfig
);

// 2. List all price configurations
router.get(
  "/",
  checkAnyPermission([
    { resource: "gold_prices", action: "read" },
    { resource: "gold_prices", action: "manage" },
    { resource: "gold_purchases", action: "read" },
    { resource: "gold_purchases", action: "create" },
  ]),
  controller.listPriceConfigurations
);

// 3. Create price configuration
router.post(
  "/",
  checkAnyPermission([
    { resource: "gold_prices", action: "create" },
    { resource: "gold_prices", action: "manage" },
  ]),
  controller.createPriceConfiguration
);

// 4. Update price configuration
router.put(
  "/:id",
  checkAnyPermission([
    { resource: "gold_prices", action: "update" },
    { resource: "gold_prices", action: "manage" },
  ]),
  controller.updatePriceConfiguration
);

// 5. Delete price configuration
router.delete(
  "/:id",
  checkAnyPermission([
    { resource: "gold_prices", action: "delete" },
    { resource: "gold_prices", action: "manage" },
  ]),
  controller.deletePriceConfiguration
);

module.exports = router;
