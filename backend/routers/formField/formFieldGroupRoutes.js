"use strict";

const express = require("express");
const router = express.Router();

const {
  validateCreateFormFieldGroup,
  validateUpdateFormFieldGroup,
  validateReorderFormFieldGroups,
} = require("../../validators/formField/formFieldGroupValidator");

const {
  getFormFieldGroups,
  createFormFieldGroup,
  updateFormFieldGroup,
  deleteFormFieldGroup,
  reorderFormFieldGroups,
} = require("../../controllers/formField/formFieldGroupController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("form_field_groups", "read"), getFormFieldGroups);
router.post(
  "/",
  checkPermission("form_field_groups", "create"),
  validateCreateFormFieldGroup,
  createFormFieldGroup
);
router.put(
  "/reorder",
  checkPermission("form_field_groups", "update"),
  validateReorderFormFieldGroups,
  reorderFormFieldGroups
);
router.put(
  "/:id",
  checkPermission("form_field_groups", "update"),
  validateUpdateFormFieldGroup,
  updateFormFieldGroup
);
router.delete(
  "/:id",
  checkPermission("form_field_groups", "delete"),
  deleteFormFieldGroup
);

module.exports = router;
