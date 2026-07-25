"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const medicationSafetyController = require("../../controllers/medication/medicationSafetyController");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/evaluate",
  checkPermission("medication", "safety_view"),
  medicationSafetyController.evaluatePrescriptionSafety.bind(medicationSafetyController)
);

router.get(
  "/catalog/search",
  checkPermission("medication", "safety_view"),
  medicationSafetyController.searchMedications.bind(medicationSafetyController)
);

router.get(
  "/alerts/patient/:patientId",
  checkPermission("medication", "safety_view"),
  medicationSafetyController.getMedicationAlerts.bind(medicationSafetyController)
);

router.post(
  "/alerts/:alertId/override",
  checkPermission("medication", "override"),
  medicationSafetyController.overrideSafetyAlert.bind(medicationSafetyController)
);

module.exports = router;
