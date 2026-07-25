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

const pharmacyClinicalController = require("../../controllers/pharmacy/pharmacyClinicalController");

router.use(authenticateToken, requireInternalAccount);

// ================= Pharmacy Clinical Integration Routes =================
router.post(
  "/clinical-orders",
  checkPermission("pharmacy", "send"),
  pharmacyClinicalController.createPharmacyOrder.bind(pharmacyClinicalController)
);

router.post(
  "/clinical-orders/:orderId/forward",
  checkPermission("pharmacy", "send"),
  pharmacyClinicalController.forwardToPharmacy.bind(pharmacyClinicalController)
);

router.get(
  "/clinical-orders/:orderId/status",
  checkPermission("pharmacy", "clinical_view"),
  pharmacyClinicalController.getPharmacyOrderStatus.bind(pharmacyClinicalController)
);

router.get(
  "/clinical-orders/:orderId/result",
  checkPermission("pharmacy", "clinical_view"),
  pharmacyClinicalController.getPharmacyClinicalResult.bind(pharmacyClinicalController)
);

router.get(
  "/patients/:patientId/pharmacy-history",
  checkPermission("pharmacy", "view_history"),
  pharmacyClinicalController.getPatientPharmacyHistory.bind(pharmacyClinicalController)
);

router.get(
  "/prescriptions/:prescriptionId/version-history",
  checkPermission("pharmacy", "clinical_view"),
  pharmacyClinicalController.getPrescriptionVersionHistory.bind(pharmacyClinicalController)
);

router.post(
  "/clinical-orders/:orderId/request-doctor-approval",
  checkPermission("pharmacy", "manage_status"),
  pharmacyClinicalController.requestDoctorApproval.bind(pharmacyClinicalController)
);

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
