"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreatePrescription,
  validatePreviewPrescription,
} = require("../../validators/prescription/prescriptionValidator");
const controller = require("../../controllers/prescription/prescriptionController");

router.use(authenticateToken, requireInternalAccount);

router.get("/signature-capabilities", controller.signatureCapabilities);
router.get("/", checkPermission("prescription", "read"), controller.list);
router.get("/:prescriptionId", checkPermission("prescription", "read"), controller.getById);
router.post(
  "/preview",
  checkPermission("prescription", "print"),
  validatePreviewPrescription,
  controller.preview
);
router.post(
  "/",
  checkPermission("prescription", "create"),
  validateCreatePrescription,
  controller.create
);

module.exports = router;
