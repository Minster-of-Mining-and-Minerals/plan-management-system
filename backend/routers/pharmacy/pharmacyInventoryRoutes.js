"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const pharmacyInventoryController = require("../../controllers/pharmacy/pharmacyInventoryController");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/warehouses",
  checkPermission("pharmacy", "inventory_manage"),
  pharmacyInventoryController.createWarehouse.bind(pharmacyInventoryController)
);

router.get(
  "/warehouses",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyInventoryController.listWarehouses.bind(pharmacyInventoryController)
);

router.post(
  "/batches/receive",
  checkPermission("pharmacy", "stock_receive"),
  pharmacyInventoryController.receiveStock.bind(pharmacyInventoryController)
);

router.get(
  "/batches",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyInventoryController.listBatches.bind(pharmacyInventoryController)
);

router.post(
  "/controlled/log",
  checkPermission("pharmacy", "controlled_dispense"),
  pharmacyInventoryController.logControlledDispensing.bind(pharmacyInventoryController)
);

router.get(
  "/controlled/logs",
  checkPermission("pharmacy", "controlled_verify"),
  pharmacyInventoryController.getControlledLogs.bind(pharmacyInventoryController)
);

router.get(
  "/expiring",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyInventoryController.getExpiringBatches.bind(pharmacyInventoryController)
);

router.post(
  "/quarantine",
  checkPermission("pharmacy", "stock_adjust"),
  pharmacyInventoryController.quarantineExpired.bind(pharmacyInventoryController)
);

router.get(
  "/analytics",
  checkPermission("pharmacy", "billing_view"),
  pharmacyInventoryController.getAnalytics.bind(pharmacyInventoryController)
);

router.post(
  "/substitutions",
  checkPermission("pharmacy", "substitution_request"),
  pharmacyInventoryController.createSubstitutionRequest.bind(pharmacyInventoryController)
);

router.post(
  "/substitutions/:requestId/approve",
  checkPermission("pharmacy", "substitution_approve"),
  pharmacyInventoryController.approveSubstitutionRequest.bind(pharmacyInventoryController)
);

module.exports = router;
