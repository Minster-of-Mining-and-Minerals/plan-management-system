"use strict";

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const controller = require("../../controllers/finance/receiptTemplateController");
const {
  validateCreateReceiptTemplate,
  validateUpdateReceiptTemplate,
} = require("../../validators/finance/receiptTemplateValidator");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/placeholders",
  checkPermission("receipt_template", "view"),
  controller.getPlaceholders
);

router.get("/", checkPermission("receipt_template", "view"), controller.list);

router.get(
  "/:templateId",
  checkPermission("receipt_template", "view"),
  controller.getById
);

router.post(
  "/",
  checkPermission("receipt_template", "create"),
  validateCreateReceiptTemplate,
  controller.create
);

router.put(
  "/:templateId",
  checkPermission("receipt_template", "update"),
  validateUpdateReceiptTemplate,
  controller.update
);

router.delete(
  "/:templateId",
  checkPermission("receipt_template", "delete"),
  controller.remove
);

module.exports = router;
