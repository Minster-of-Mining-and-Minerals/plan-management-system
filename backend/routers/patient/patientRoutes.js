"use strict";

const express = require("express");
const router = express.Router();
const {
  createPatient,
  updatePatient,
  getPatients,
  getPatientById,
  getMyPatientProfile,
  deletePatient,
} = require("../../controllers/patient/patientController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const {
  requireInternalAccount,
  requirePatientAccount,
} = require("../../middlewares/accountTypeMiddleware");
const {
  dynamicValidateCreateUser: dynamicValidateCreatePatient,
  dynamicValidateUpdateUser: dynamicValidateUpdatePatient,
} = require("../../middlewares/dynamicUserValidationMiddleware");
const {
  getSlipConfiguration,
  updateSlipConfiguration,
} = require("../../controllers/patient/patientSlipConfigController");

router.use(authenticateToken);

router.get("/me/profile", requirePatientAccount, getMyPatientProfile);

router.get(
  "/slip-configuration",
  requireInternalAccount,
  checkPermission("patients", "read"),
  getSlipConfiguration
);
router.put(
  "/slip-configuration",
  requireInternalAccount,
  checkPermission("patients", "update"),
  updateSlipConfiguration
);

router.get(
  "/",
  requireInternalAccount,
  checkPermission("patients", "read"),
  getPatients
);
router.get(
  "/:id",
  requireInternalAccount,
  checkPermission("patients", "read"),
  getPatientById
);
router.post(
  "/",
  requireInternalAccount,
  checkPermission("patients", "create"),
  dynamicValidateCreatePatient,
  createPatient
);
router.put(
  "/:id",
  requireInternalAccount,
  checkPermission("patients", "update"),
  dynamicValidateUpdatePatient,
  updatePatient
);
router.delete(
  "/:id",
  requireInternalAccount,
  checkPermission("patients", "delete"),
  deletePatient
);

module.exports = router;
