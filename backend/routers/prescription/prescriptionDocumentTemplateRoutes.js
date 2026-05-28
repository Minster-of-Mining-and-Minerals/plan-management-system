"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateDocumentTemplate,
  validateUpdateDocumentTemplate,
} = require("../../validators/prescription/prescriptionDocumentTemplateValidator");
const controller = require("../../controllers/prescription/prescriptionDocumentTemplateController");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/placeholders",
  checkPermission("prescription_template", "view"),
  controller.getPlaceholders
);
router.get("/", checkPermission("prescription_template", "view"), controller.list);
router.get(
  "/:documentTemplateId",
  checkPermission("prescription_template", "view"),
  controller.getById
);
router.post(
  "/",
  checkPermission("prescription_template", "create"),
  validateCreateDocumentTemplate,
  controller.create
);
router.put(
  "/:documentTemplateId",
  checkPermission("prescription_template", "update"),
  validateUpdateDocumentTemplate,
  controller.update
);
router.delete(
  "/:documentTemplateId",
  checkPermission("prescription_template", "delete"),
  controller.remove
);

module.exports = router;
