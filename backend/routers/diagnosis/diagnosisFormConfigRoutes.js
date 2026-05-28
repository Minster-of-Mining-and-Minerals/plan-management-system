"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/diagnosis/diagnosisFormConfigController");
const {
  authenticateToken,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const { checkPermission } = require("../../middlewares/authMiddleware");
const {
  validateCreateConfig,
  validateUpdateConfig,
  validateCreateGroup,
  validateUpdateGroup,
  validateCreateField,
  validateUpdateField,
  validateReorder,
} = require("../../validators/diagnosis/diagnosisFormValidator");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/",
  checkPermission("diagnosis_forms", "read"),
  controller.list
);
router.get(
  "/staff/:staffId",
  checkPermission("diagnosis_forms", "read"),
  controller.getByStaff
);
router.get(
  "/:configId",
  checkPermission("diagnosis_forms", "read"),
  controller.getById
);
router.get(
  "/:configId/form-config",
  checkPermission("diagnosis_forms", "read"),
  controller.getFormConfig
);

router.post(
  "/",
  checkPermission("diagnosis_forms", "create"),
  validateCreateConfig,
  controller.create
);
router.put(
  "/:configId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateConfig,
  controller.update
);
router.delete(
  "/:configId",
  checkPermission("diagnosis_forms", "delete"),
  controller.remove
);

router.post(
  "/:configId/groups",
  checkPermission("diagnosis_forms", "update"),
  validateCreateGroup,
  controller.createGroup
);
router.put(
  "/:configId/groups/reorder",
  checkPermission("diagnosis_forms", "update"),
  validateReorder,
  controller.reorderGroups
);
router.put(
  "/:configId/groups/:groupId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateGroup,
  controller.updateGroup
);
router.delete(
  "/:configId/groups/:groupId",
  checkPermission("diagnosis_forms", "update"),
  controller.deleteGroup
);

router.post(
  "/:configId/fields",
  checkPermission("diagnosis_forms", "update"),
  validateCreateField,
  controller.createField
);
router.put(
  "/:configId/fields/reorder",
  checkPermission("diagnosis_forms", "update"),
  validateReorder,
  controller.reorderFields
);
router.put(
  "/:configId/fields/:fieldId",
  checkPermission("diagnosis_forms", "update"),
  validateUpdateField,
  controller.updateField
);
router.delete(
  "/:configId/fields/:fieldId",
  checkPermission("diagnosis_forms", "update"),
  controller.deleteField
);

module.exports = router;
