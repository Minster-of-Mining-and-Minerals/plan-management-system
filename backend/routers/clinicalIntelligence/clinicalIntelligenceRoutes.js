"use strict";

const express = require("express");
const router = express.Router();
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const ctrl = require("../../controllers/clinicalIntelligence/clinicalIntelligenceController");

router.use(authenticateToken, requireInternalAccount);

// Patient Intelligence Snapshot
router.get(
  "/patients/:patientId/snapshot",
  checkPermission("clinical", "intelligence_view"),
  ctrl.getPatientSnapshot.bind(ctrl)
);

// Clinical Decision Support — evaluate patient context
router.post(
  "/patients/:patientId/evaluate",
  checkPermission("clinical", "intelligence_view"),
  ctrl.evaluatePatientContext.bind(ctrl)
);

// Patient Risk Assessment
router.get(
  "/patients/:patientId/risk",
  checkPermission("clinical", "risk_view"),
  ctrl.getRiskScore.bind(ctrl)
);

// Clinical Alerts
router.get(
  "/patients/:patientId/alerts",
  checkPermission("clinical", "intelligence_view"),
  ctrl.getAlerts.bind(ctrl)
);

router.post(
  "/alerts/:alertId/acknowledge",
  checkPermission("clinical", "alert_manage"),
  ctrl.acknowledgeAlert.bind(ctrl)
);

router.post(
  "/alerts/:alertId/action-taken",
  checkPermission("clinical", "alert_manage"),
  ctrl.markAlertActionTaken.bind(ctrl)
);

router.post(
  "/alerts/:alertId/dismiss",
  checkPermission("clinical", "alert_manage"),
  ctrl.dismissAlert.bind(ctrl)
);

// Clinical Problem List
router.post(
  "/problems",
  checkPermission("clinical", "intelligence_view"),
  ctrl.addProblem.bind(ctrl)
);

router.post(
  "/problems/:problemId/resolve",
  checkPermission("clinical", "intelligence_view"),
  ctrl.resolveProblem.bind(ctrl)
);

router.get(
  "/patients/:patientId/problems",
  checkPermission("clinical", "intelligence_view"),
  ctrl.listProblems.bind(ctrl)
);

module.exports = router;
