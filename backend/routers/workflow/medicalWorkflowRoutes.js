"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/workflow/medicalWorkflowController");
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount, controller.ensureReceivePatient);

router.get("/inbox", controller.listInbox);
router.get("/receivers", controller.listReceivers);
router.get("/timeline", controller.listTimeline);
router.get("/appointment/:appointmentId/context", controller.getContext);
router.post("/submit", controller.submitEntry);

module.exports = router;
