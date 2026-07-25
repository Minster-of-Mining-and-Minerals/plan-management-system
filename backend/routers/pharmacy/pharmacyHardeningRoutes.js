"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const pharmacyHardeningController = require("../../controllers/pharmacy/pharmacyHardeningController");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/transfers/request",
  checkPermission("pharmacy", "transfer_manage"),
  pharmacyHardeningController.requestTransfer.bind(pharmacyHardeningController)
);

router.post(
  "/transfers/:transferId/confirm",
  checkPermission("pharmacy", "transfer_manage"),
  pharmacyHardeningController.confirmTransfer.bind(pharmacyHardeningController)
);

router.get(
  "/transfers",
  checkPermission("pharmacy", "inventory_view"),
  pharmacyHardeningController.listTransfers.bind(pharmacyHardeningController)
);

router.post(
  "/barcode/verify",
  checkPermission("pharmacy", "barcode_verify"),
  pharmacyHardeningController.verifyBarcode.bind(pharmacyHardeningController)
);

router.post(
  "/refills/process",
  checkPermission("pharmacy", "refill_manage"),
  pharmacyHardeningController.processRefill.bind(pharmacyHardeningController)
);

router.get(
  "/refills/history/:prescriptionId",
  checkPermission("pharmacy", "refill_manage"),
  pharmacyHardeningController.getRefillHistory.bind(pharmacyHardeningController)
);

router.get(
  "/analytics",
  checkPermission("pharmacy", "analytics_clinical"),
  pharmacyHardeningController.getAdvancedAnalytics.bind(pharmacyHardeningController)
);

module.exports = router;
