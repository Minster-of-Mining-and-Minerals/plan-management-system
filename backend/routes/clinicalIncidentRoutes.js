"use strict";

const express = require("express");
const router = express.Router();
const clinicalIncidentController = require("../controllers/orchestration/clinicalIncidentController");
const {
  authenticateToken,
  checkPermission,
} = require("../middlewares/authMiddleware");
const { requireInternalAccount } = require("../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/",
  checkPermission("operations", "operations:incident_view"),
  clinicalIncidentController.getIncidents
);

router.post(
  "/",
  checkPermission("operations", "operations:incident_manage"),
  clinicalIncidentController.createIncident
);

router.patch(
  "/:id/status",
  checkPermission("operations", "operations:incident_manage"),
  clinicalIncidentController.updateIncidentStatus
);

router.patch(
  "/:id/assign",
  checkPermission("operations", "operations:incident_assign"),
  clinicalIncidentController.assignIncident
);

router.post(
  "/evaluate-rules",
  checkPermission("operations", "operations:incident_manage"),
  clinicalIncidentController.evaluateOperationalRules
);

router.get(
  "/playbooks",
  checkPermission("operations", "operations:playbook_manage"),
  clinicalIncidentController.getPlaybooks
);

router.post(
  "/playbooks/execute-step",
  checkPermission("operations", "operations:incident_execute"),
  clinicalIncidentController.executePlaybookStep
);

router.post(
  "/automation/execute",
  checkPermission("operations", "operations:incident_execute"),
  clinicalIncidentController.executeAutomationAction
);

router.post(
  "/cross-domain/evaluate",
  checkPermission("operations", "operations:incident_view"),
  clinicalIncidentController.evaluateCrossDomainImpact
);

router.get(
  "/messages",
  checkPermission("operations", "operations:communication"),
  clinicalIncidentController.getMessages
);

router.post(
  "/messages",
  checkPermission("operations", "operations:communication"),
  clinicalIncidentController.sendMessage
);

router.get(
  "/analytics",
  checkPermission("operations", "operations:incident_analytics"),
  clinicalIncidentController.getIncidentAnalytics
);

router.get(
  "/executive-summary",
  checkPermission("operations", "operations:incident_view"),
  clinicalIncidentController.getExecutiveIncidentSummary
);

module.exports = router;
