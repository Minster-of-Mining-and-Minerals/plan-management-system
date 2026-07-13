"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/appointment/appointmentController");
const {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/me",
  checkPermission("patients", "receive_appointment"),
  controller.listMyAppointments
);

router.get(
  "/:id",
  checkAnyPermission([
    ["patients", "receive_appointment"],
    ["patients", "receive_patient"],
  ]),
  controller.getAppointment
);

module.exports = router;
