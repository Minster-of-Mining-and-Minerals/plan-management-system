"use strict";

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const unifiedClinicalOrderController = require("../../controllers/clinicalOrder/unifiedClinicalOrderController");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/queue",
  unifiedClinicalOrderController.getUnifiedQueue.bind(unifiedClinicalOrderController)
);

router.post(
  "/queue/:clinicalOrderId/claim",
  unifiedClinicalOrderController.claimOrder.bind(unifiedClinicalOrderController)
);

router.post(
  "/queue/:clinicalOrderId/reassign",
  unifiedClinicalOrderController.reassignOrder.bind(unifiedClinicalOrderController)
);

router.post(
  "/billing/integrity",
  unifiedClinicalOrderController.processBillingIntegrity.bind(unifiedClinicalOrderController)
);

router.get(
  "/analytics/operations",
  unifiedClinicalOrderController.getOperationsAnalytics.bind(unifiedClinicalOrderController)
);

router.post(
  "/transition-guard/validate",
  unifiedClinicalOrderController.validateTransitionGuard.bind(unifiedClinicalOrderController)
);

module.exports = router;
