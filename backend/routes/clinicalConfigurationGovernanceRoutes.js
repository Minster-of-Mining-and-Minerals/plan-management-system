"use strict";

const express = require("express");
const router = express.Router();
const clinicalConfigurationGovernanceController = require("../controllers/workflow/clinicalConfigurationGovernanceController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/validate",
  checkPermission("governance", "configuration:create"),
  clinicalConfigurationGovernanceController.validateConfiguration
);

router.post(
  "/transition",
  checkPermission("governance", "configuration:publish"),
  clinicalConfigurationGovernanceController.transitionLifecycleStatus
);

router.get(
  "/impact-analysis",
  checkPermission("governance", "configuration:view"),
  clinicalConfigurationGovernanceController.performImpactAnalysis
);

router.get(
  "/dependency-tree",
  checkPermission("governance", "configuration:view"),
  clinicalConfigurationGovernanceController.getDependencyTree
);

router.get(
  "/logs",
  checkPermission("governance", "configuration:audit"),
  clinicalConfigurationGovernanceController.getGovernanceLogs
);

module.exports = router;
