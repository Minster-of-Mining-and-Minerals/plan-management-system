"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/diagnosis/diagnosisTemplateController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateTemplate,
  validateUpdateTemplate,
  validateDuplicateTemplate,
  validateCreateGroup,
  validateUpdateGroup,
  validateCreateField,
  validateUpdateField,
  validateReorder,
} = require("../../validators/diagnosis/diagnosisFormValidator");

router.use(authenticateToken, requireInternalAccount);

router.get("/", checkPermission("diagnosis_forms", "read"), controller.list);
router.get(
  "/:templateId/form-config",
  checkPermission("diagnosis_forms", "read"),
  controller.getFormConfig
);
router.get(
  "/:templateId",
  checkPermission("diagnosis_forms", "read"),
  controller.getById
);

router.post(
  "/",
  checkPermission("diagnosis_forms", "create"),
  validateCreateTemplate,
  controller.create
);
router.post(
  "/:templateId/duplicate",
  checkPermission("diagnosis_forms", "create"),
  validateDuplicateTemplate,
  controller.duplicate
);
router.put(
  "/:templateId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateTemplate,
  controller.update
);
router.patch(
  "/:templateId/archive",
  checkPermission("diagnosis_forms", "update"),
  controller.archive
);
router.delete(
  "/:templateId",
  checkPermission("diagnosis_forms", "delete"),
  controller.remove
);

router.post(
  "/:templateId/groups",
  checkPermission("diagnosis_forms", "update"),
  validateCreateGroup,
  controller.createGroup
);
router.put(
  "/:templateId/groups/reorder",
  checkPermission("diagnosis_forms", "update"),
  validateReorder,
  controller.reorderGroups
);
router.put(
  "/:templateId/groups/:groupId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateGroup,
  controller.updateGroup
);
router.delete(
  "/:templateId/groups/:groupId",
  checkPermission("diagnosis_forms", "update"),
  controller.deleteGroup
);

router.post(
  "/:templateId/fields",
  checkPermission("diagnosis_forms", "update"),
  validateCreateField,
  controller.createField
);
router.put(
  "/:templateId/fields/reorder",
  checkPermission("diagnosis_forms", "update"),
  validateReorder,
  controller.reorderFields
);
router.put(
  "/:templateId/fields/:fieldId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateField,
  controller.updateField
);
router.delete(
  "/:templateId/fields/:fieldId",
  checkPermission("diagnosis_forms", "update"),
  controller.deleteField
);

module.exports = router;
