"use strict";

const express = require("express");
const router = express.Router();
const goldPurchaseController = require("../../controllers/gold/goldPurchaseController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// List purchases (scoped by controller to caller's center or query)
router.get(
  "/",
  checkAnyPermission([
    { resource: "gold_purchases", action: "read" },
    { resource: "gold_purchases", action: "manage" },
    { resource: "gold_oversight", action: "read" },
    { resource: "gold_oversight", action: "manage" },
  ]),
  goldPurchaseController.listPurchases
);

// Get single purchase by ID
router.get(
  "/:id",
  checkAnyPermission([
    { resource: "gold_purchases", action: "read" },
    { resource: "gold_purchases", action: "manage" },
    { resource: "gold_oversight", action: "read" },
    { resource: "gold_oversight", action: "manage" },
  ]),
  goldPurchaseController.getPurchaseById
);

// Record a new gold purchase
router.post(
  "/",
  checkAnyPermission([
    { resource: "gold_purchases", action: "create" },
    { resource: "gold_purchases", action: "manage" },
  ]),
  goldPurchaseController.recordPurchase
);

// Cancel a gold purchase
router.post(
  "/:id/cancel",
  checkAnyPermission([
    { resource: "gold_purchases", action: "cancel" },
    { resource: "gold_purchases", action: "manage" },
  ]),
  goldPurchaseController.cancelPurchase
);

module.exports = router;
