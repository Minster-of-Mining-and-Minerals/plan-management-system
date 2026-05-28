"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateTemplate,
  validateUpdateTemplate,
} = require("../../validators/prescription/prescriptionTemplateValidator");
const controller = require("../../controllers/prescription/prescriptionTemplateController");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("prescription_template", "view"), controller.list);
router.get("/:templateId", checkPermission("prescription_template", "view"), controller.getById);
router.post(
  "/",
  checkPermission("prescription_template", "create"),
  validateCreateTemplate,
  controller.create
);
router.put(
  "/:templateId",
  checkPermission("prescription_template", "update"),
  validateUpdateTemplate,
  controller.update
);
router.patch(
  "/:templateId/archive",
  checkPermission("prescription_template", "update"),
  controller.archive
);

module.exports = router;
