"use strict";

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middlewares/authMiddleware");
const { requirePatientAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/patient/patientPortalController");

router.use(authenticateToken, requirePatientAccount);

router.get("/me", controller.getMe);
router.put("/me", controller.updateMe);
router.get("/dashboard", controller.getDashboard);

router.get("/schedules", controller.listSchedules);
router.get("/doctors", controller.listDoctors);
router.get("/availability", controller.getAvailability);
router.post("/schedules", controller.bookSchedule);
router.patch("/schedules/:id", controller.rescheduleSchedule);
router.post("/schedules/:id/cancel", controller.cancelSchedule);

router.get("/prescriptions", controller.listPrescriptions);
router.get("/medical-history", controller.listMedicalHistory);

router.get("/notifications/unread-count", controller.getUnreadCount);
router.get("/notifications", controller.listNotifications);
router.patch("/notifications/read-all", controller.markAllNotificationsRead);
router.patch("/notifications/:id/read", controller.markNotificationRead);

module.exports = router;
