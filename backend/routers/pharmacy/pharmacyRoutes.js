"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreatePharmacy,
  validateUpdatePharmacy,
  validatePharmacyId,
  validateCreatePharmacyUser,
  validateSendPrescription,
  validateForwardFromSchedule,
} = require("../../validators/pharmacy/pharmacyValidator");
const {
  listPharmacies,
  getPharmacy,
  createPharmacy,
  updatePharmacy,
  togglePharmacyStatus,
  deletePharmacy,
  listActivePharmacies,
  createPharmacyUser,
  updatePharmacyUser,
  togglePharmacyUserStatus,
  sendPrescription,
  forwardPrescriptionsFromSchedule,
  listSchedulePrescriptions,
  listPatientPrescriptionsForSend,
  listHospitalPharmacyPrescriptions,
} = require("../../controllers/pharmacy/pharmacyController");

router.use(authenticateToken, requireInternalAccount);

router.get("/active", checkPermission("pharmacy", "view"), listActivePharmacies);
router.post(
  "/prescriptions/send",
  checkPermission("pharmacy_prescription", "send"),
  validateSendPrescription,
  sendPrescription
);
router.get(
  "/prescriptions/hospital",
  checkPermission("pharmacy_prescription", "view"),
  listHospitalPharmacyPrescriptions
);
router.get(
  "/patients/:patientId/prescriptions",
  checkPermission("pharmacy_prescription", "view"),
  listPatientPrescriptionsForSend
);
router.get(
  "/schedules/:scheduleId/prescriptions",
  checkPermission("pharmacy_prescription", "send"),
  listSchedulePrescriptions
);
router.post(
  "/schedules/forward",
  checkPermission("pharmacy_prescription", "send"),
  validateForwardFromSchedule,
  forwardPrescriptionsFromSchedule
);

router.get("/", checkPermission("pharmacy", "view"), listPharmacies);
router.post("/", checkPermission("pharmacy", "create"), validateCreatePharmacy, createPharmacy);

router.put(
  "/users/:userId",
  checkPermission("pharmacy", "user_manage"),
  updatePharmacyUser
);
router.patch(
  "/users/:userId/status",
  checkPermission("pharmacy", "user_manage"),
  togglePharmacyUserStatus
);

router.get("/:id", checkPermission("pharmacy", "view"), validatePharmacyId, getPharmacy);
router.put(
  "/:id",
  checkPermission("pharmacy", "update"),
  validateUpdatePharmacy,
  updatePharmacy
);
router.patch(
  "/:id/status",
  checkPermission("pharmacy", "manage"),
  validatePharmacyId,
  togglePharmacyStatus
);
router.delete(
  "/:id",
  checkPermission("pharmacy", "delete"),
  validatePharmacyId,
  deletePharmacy
);
router.post(
  "/:id/users",
  checkPermission("pharmacy", "user_manage"),
  validateCreatePharmacyUser,
  createPharmacyUser
);

module.exports = router;
