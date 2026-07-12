"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/finance/appointmentBillingController");
const {
  validateCreateEntry,
  validateUpdateEntry,
} = require("../../validators/finance/billingValidator");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/services/active",
  checkPermission("appointment_billing", "view"),
  controller.listActiveServices
);

router.get(
  "/:appointmentId",
  checkPermission("appointment_billing", "view"),
  controller.getContext
);

router.post(
  "/:appointmentId/entries",
  checkPermission("appointment_billing", "create"),
  validateCreateEntry,
  controller.createEntry
);

router.patch(
  "/entries/:entryId",
  checkPermission("appointment_billing", "update"),
  validateUpdateEntry,
  controller.updateEntry
);

router.delete(
  "/entries/:entryId",
  checkPermission("appointment_billing", "delete"),
  controller.cancelEntry
);

module.exports = router;
