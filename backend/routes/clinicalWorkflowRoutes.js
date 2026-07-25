"use strict";

const express = require("express");
const router = express.Router();
const clinicalWorkflowController = require("../controllers/workflow/clinicalWorkflowController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/activities",
  checkPermission("workflow", "workflow:activity_view"),
  clinicalWorkflowController.getActivityDefinitions
);

router.post(
  "/activities",
  checkPermission("workflow", "workflow:activity_manage"),
  clinicalWorkflowController.createActivityDefinition
);

router.post(
  "/intent",
  checkPermission("workflow", "workflow:intent_execute"),
  clinicalWorkflowController.submitClinicalIntent
);

router.get(
  "/definitions",
  checkPermission("workflow", "workflow:definition_manage"),
  clinicalWorkflowController.getWorkflowDefinitions
);

router.post(
  "/execute-step",
  checkPermission("workflow", "workflow:intent_execute"),
  clinicalWorkflowController.executeOrderStep
);

module.exports = router;
