"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/schedule/scheduleController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/config",
  checkPermission("patients", "read"),
  controller.getConfig
);
router.put(
  "/config",
  checkPermission("patients", "schedule"),
  controller.updateConfig
);

router.get(
  "/eligible-staff",
  checkPermission("patients", "schedule"),
  controller.getEligibleStaff
);

router.get(
  "/matrix",
  checkPermission("patients", "read"),
  controller.getMatrix
);

router.get(
  "/",
  checkPermission("patients", "read"),
  controller.listSchedules
);

router.post(
  "/",
  checkPermission("patients", "schedule"),
  controller.createSchedule
);

router.patch(
  "/:id",
  checkPermission("patients", "schedule"),
  controller.updateSchedule
);

router.post(
  "/shift",
  checkPermission("patients", "schedule"),
  controller.shiftSchedules
);

module.exports = router;
