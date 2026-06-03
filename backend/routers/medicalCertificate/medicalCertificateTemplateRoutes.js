"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreate,
  validateUpdate,
} = require("../../validators/medicalCertificate/medicalCertificateTemplateValidator");
const controller = require("../../controllers/medicalCertificate/medicalCertificateTemplateController");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/placeholders",
  checkPermission("medical_certificate_template", "view"),
  controller.getPlaceholders
);

router.get(
  "/",
  checkPermission("medical_certificate_template", "view"),
  controller.list
);

router.get(
  "/:templateId",
  checkPermission("medical_certificate_template", "view"),
  controller.getById
);

router.post(
  "/",
  checkPermission("medical_certificate_template", "create"),
  validateCreate,
  controller.create
);

router.put(
  "/:templateId",
  checkPermission("medical_certificate_template", "update"),
  validateUpdate,
  controller.update
);

router.delete(
  "/:templateId",
  checkPermission("medical_certificate_template", "delete"),
  controller.remove
);

module.exports = router;
