"use strict";

const express = require("express");
const router = express.Router();
const federalRegionalEscalationController = require("../../controllers/issue/federalRegionalEscalationController");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/dashboard",
  checkAnyPermission([
    ["federal_regional_escalations", "read"],
    ["federal_regional_escalations", "read_all"],
  ]),
  federalRegionalEscalationController.getDashboardStats
);

router.get(
  "/",
  checkAnyPermission([
    ["federal_regional_escalations", "read"],
    ["federal_regional_escalations", "read_all"],
  ]),
  federalRegionalEscalationController.getEscalations
);

router.get(
  "/:escalationId",
  checkAnyPermission([
    ["federal_regional_escalations", "read"],
    ["federal_regional_escalations", "read_all"],
  ]),
  federalRegionalEscalationController.getEscalationById
);

router.get(
  "/:escalationId/attachments/:attachmentId/download",
  checkAnyPermission([
    ["federal_regional_escalations", "read"],
    ["federal_regional_escalations", "read_all"],
  ]),
  federalRegionalEscalationController.downloadEscalationAttachment
);

router.patch(
  "/:escalationId/assign",
  checkPermission("federal_regional_escalations", "assign"),
  federalRegionalEscalationController.assignFederalOfficer
);

router.patch(
  "/:escalationId/start-review",
  checkPermission("federal_regional_escalations", "review"),
  federalRegionalEscalationController.startFederalReview
);

router.post(
  "/:escalationId/request-clarification",
  checkPermission("federal_regional_escalations", "request_clarification"),
  federalRegionalEscalationController.requestClarification
);

router.post(
  "/:escalationId/provide-assistance",
  checkPermission("federal_regional_escalations", "provide_assistance"),
  federalRegionalEscalationController.provideAssistance
);

router.post(
  "/:escalationId/return",
  checkPermission("federal_regional_escalations", "review"),
  federalRegionalEscalationController.returnToRegion
);

router.patch(
  "/:escalationId/close",
  checkPermission("federal_regional_escalations", "close"),
  federalRegionalEscalationController.closeFederalIntervention
);

router.post(
  "/:escalationId/messages",
  checkPermission("federal_regional_escalations", "respond"),
  federalRegionalEscalationController.addFederalMessage
);

module.exports = router;

