"use strict";

const express = require("express");
const router = express.Router();
const clinicalOperationsController = require("../controllers/clinicalOperations/clinicalOperationsController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/dashboard",
  checkPermission("operations", "operations:dashboard"),
  clinicalOperationsController.getHospitalDashboard
);

router.get(
  "/department/:departmentId",
  checkPermission("operations", "operations:dashboard"),
  clinicalOperationsController.getDepartmentDashboard
);

router.get(
  "/queue",
  checkPermission("operations", "operations:queue"),
  clinicalOperationsController.getHospitalQueue
);

router.get(
  "/feed",
  checkPermission("operations", "operations:view"),
  clinicalOperationsController.getOperationsFeed
);

router.get(
  "/provider/:providerId/workload",
  checkPermission("operations", "operations:analytics"),
  clinicalOperationsController.getProviderWorkload
);

router.get(
  "/workload",
  checkPermission("operations", "operations:analytics"),
  clinicalOperationsController.getWorkloadDistribution
);

router.get(
  "/executive-summary",
  checkPermission("operations", "operations:executive"),
  clinicalOperationsController.getExecutiveSummary
);

router.get(
  "/timeline",
  checkPermission("operations", "operations:view"),
  clinicalOperationsController.getHospitalTimeline
);

module.exports = router;
