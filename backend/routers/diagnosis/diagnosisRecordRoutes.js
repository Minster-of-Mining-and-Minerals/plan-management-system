"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/diagnosis/diagnosisRecordController");
const {
  authenticateToken,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const { validateSaveRecord } = require("../../validators/diagnosis/diagnosisFormValidator");

router.use(authenticateToken, requireInternalAccount, controller.ensureClinicalStaff);

router.get("/appointment/:appointmentId", controller.getForAppointment);
router.put(
  "/appointment/:appointmentId",
  validateSaveRecord,
  controller.saveForAppointment
);

module.exports = router;
