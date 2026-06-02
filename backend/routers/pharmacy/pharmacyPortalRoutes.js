"use strict";

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { requirePharmacyAccount } = require("../../middlewares/accountTypeMiddleware");
const { attachPharmacyContext } = require("../../middlewares/pharmacyMiddleware");
const {
  validateUpdatePharmacyWorkflow,
  validatePortalList,
} = require("../../validators/pharmacy/pharmacyValidator");
const {
  getDashboard,
  listPrescriptions,
  getPrescription,
  updateWorkflow,
  getMyPharmacyProfile,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../../controllers/pharmacy/pharmacyPortalController");

router.use(authenticateToken, requirePharmacyAccount, attachPharmacyContext);

router.get("/me", getMyPharmacyProfile);
router.get("/dashboard", getDashboard);
router.get("/notifications/unread-count", getUnreadCount);
router.get("/notifications", listNotifications);
router.patch("/notifications/read-all", markAllNotificationsRead);
router.patch("/notifications/:id/read", markNotificationRead);
router.get("/prescriptions", validatePortalList, listPrescriptions);
router.get("/prescriptions/:id", getPrescription);
router.patch(
  "/prescriptions/:id/workflow",
  validateUpdatePharmacyWorkflow,
  updateWorkflow
);

module.exports = router;
