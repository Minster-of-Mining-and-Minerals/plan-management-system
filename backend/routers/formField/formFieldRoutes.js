"use strict";

const express = require("express");
const router = express.Router();

const {
  validateCreateFormField,
  validateUpdateFormField,
  validateReorderFormFields,
} = require("../../validators/formField/formFieldValidator");

const {
  getFormFields,
  getUserFormConfig,
  createFormField,
  updateFormField,
  deleteFormField,
  reorderFormFields,
} = require("../../controllers/formField/formFieldController");
const {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("form_fields", "read"), getFormFields);
// Operational patient forms — not only form-field admins
router.get(
  "/config",
  checkAnyPermission([
    ["form_fields", "read"],
    ["patients", "read"],
    ["patients", "create"],
    ["patients", "update"],
  ]),
  getUserFormConfig
);
router.post("/", checkPermission("form_fields", "create"), validateCreateFormField, createFormField);
router.put(
  "/reorder",
  checkPermission("form_fields", "update"),
  validateReorderFormFields,
  reorderFormFields
);
router.put(
  "/:id",
  checkPermission("form_fields", "update"),
  validateUpdateFormField,
  updateFormField
);
router.delete("/:id", checkPermission("form_fields", "delete"), deleteFormField);

module.exports = router;
