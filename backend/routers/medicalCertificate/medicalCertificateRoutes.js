"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validatePreview,
  validateIssue,
} = require("../../validators/medicalCertificate/medicalCertificateValidator");
const controller = require("../../controllers/medicalCertificate/medicalCertificateController");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/preview",
  checkPermission("medical_certificate", "create"),
  validatePreview,
  controller.preview
);

router.post(
  "/issue",
  checkPermission("medical_certificate", "create"),
  validateIssue,
  controller.issue
);

router.get(
  "/schedule/:scheduleId",
  checkPermission("medical_certificate", "read"),
  controller.listBySchedule
);

router.get(
  "/:certificateId",
  checkPermission("medical_certificate", "read"),
  controller.getById
);

module.exports = router;
