"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/gold/goldParametersController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Read settings (accessible by purchasing centers, gold operations, and oversight)
router.get(
  "/settings",
  checkAnyPermission([
    { resource: "gold_purchases", action: "read" },
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_prices", action: "read" },
    { resource: "gold_oversight", action: "read" },
    { resource: "purchasing_centers", action: "read" },
    { resource: "purchasing_center_dashboard", action: "view" },
  ]),
  controller.getParametersSettings
);

// Update settings (accessible by administrative users managing gold operations / pricing / oversight)
router.put(
  "/settings",
  checkAnyPermission([
    { resource: "gold_prices", action: "manage" },
    { resource: "gold_prices", action: "update" },
    { resource: "gold_oversight", action: "manage" },
    { resource: "gold_purchases", action: "manage" },
  ]),
  controller.updateParametersSettings
);

module.exports = router;
