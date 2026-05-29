"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/workflow/medicalWorkflowController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  requireWorkflowAction,
} = require("../../middlewares/workflowPermissionMiddleware");

router.use(authenticateToken, requireInternalAccount, controller.ensureReceivePatient);

router.get("/inbox", checkPermission("workflow", "read"), controller.listInbox);
router.get(
  "/receivers",
  checkPermission("workflow", "forward"),
  controller.listReceivers
);
router.get("/timeline", checkPermission("workflow", "read"), controller.listTimeline);
router.get(
  "/appointment/:appointmentId/context",
  checkPermission("workflow", "read"),
  controller.getContext
);
router.post("/submit", requireWorkflowAction, controller.submitEntry);

module.exports = router;
