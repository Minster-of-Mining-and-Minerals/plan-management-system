"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/appointment/appointmentController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/me",
  checkPermission("patients", "receive_patient"),
  controller.listMyAppointments
);

router.get(
  "/:id",
  checkPermission("patients", "receive_patient"),
  controller.getAppointment
);

module.exports = router;
