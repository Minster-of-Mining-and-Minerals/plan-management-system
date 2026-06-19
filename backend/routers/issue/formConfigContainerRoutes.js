const express = require("express");
const router = express.Router();

const controller = require("../../controllers/issue/formConfigContainerController");
const {
  validateIdParam,
  validateContainerIdParam,
  validateFieldIdParam,
  validateCategoryIdParam,
  validateCreateContainer,
  validateUpdateContainer,
  validateListContainersQuery,
  validateCreateField,
  validateUpdateField,
  validateReorderFields,
} = require("../../validators/issue/formConfigValidator");
const { authenticateToken, checkPermission, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

const VIEW_FORM_CONFIG = [
  { resource: "FORM_CONFIG_CONTAINERS", action: "READ" },
  { resource: "ISSUES", action: "CREATE" },
  { resource: "PLAN", action: "RAISE_REVIEW_ISSUE" },
];

router.get("/published", checkAnyPermission(VIEW_FORM_CONFIG), controller.listPublishedContainers);

router.get("/by-category/:categoryId/published", checkAnyPermission(VIEW_FORM_CONFIG), validateCategoryIdParam, controller.getPublishedFormByCategory);

router.get(
  "/by-category/:categoryId",
  checkAnyPermission(VIEW_FORM_CONFIG),
  validateCategoryIdParam,
  controller.getPublishedFormByCategory
);

router.get(
  "/",
  checkPermission("FORM_CONFIG_CONTAINERS", "READ"),
  validateListContainersQuery,
  controller.listContainers
);

router.get(
  "/:id/published-form",
  checkAnyPermission(VIEW_FORM_CONFIG),
  validateIdParam,
  controller.getPublishedFormByContainer
);

router.get(
  "/:id",
  checkPermission("FORM_CONFIG_CONTAINERS", "READ"),
  validateIdParam,
  controller.getContainerById
);

router.post(
  "/",
  checkPermission("FORM_CONFIG_CONTAINERS", "CREATE"),
  validateCreateContainer,
  controller.createContainer
);

router.put(
  "/:id",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateIdParam,
  validateUpdateContainer,
  controller.updateContainer
);

router.delete(
  "/:id",
  checkPermission("FORM_CONFIG_CONTAINERS", "DELETE"),
  validateIdParam,
  controller.deleteContainer
);

router.patch(
  "/:id/publish",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateIdParam,
  controller.publishContainer
);

router.patch(
  "/:id/unpublish",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateIdParam,
  controller.unpublishContainer
);

router.patch(
  "/:id/activate",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateIdParam,
  controller.activateContainer
);

router.patch(
  "/:id/deactivate",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateIdParam,
  controller.deactivateContainer
);

router.get(
  "/:containerId/fields",
  checkPermission("FORM_CONFIG_CONTAINERS", "READ"),
  validateContainerIdParam,
  controller.listFields
);

router.post(
  "/:containerId/fields",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateContainerIdParam,
  validateCreateField,
  controller.createField
);

router.put(
  "/:containerId/fields/reorder",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateContainerIdParam,
  validateReorderFields,
  controller.reorderFields
);

router.put(
  "/fields/:fieldId",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateFieldIdParam,
  validateUpdateField,
  controller.updateField
);

router.delete(
  "/fields/:fieldId",
  checkPermission("FORM_CONFIG_CONTAINERS", "DELETE"),
  validateFieldIdParam,
  controller.deleteField
);

router.patch(
  "/fields/:fieldId/activate",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateFieldIdParam,
  controller.activateField
);

router.patch(
  "/fields/:fieldId/deactivate",
  checkPermission("FORM_CONFIG_CONTAINERS", "UPDATE"),
  validateFieldIdParam,
  controller.deactivateField
);

module.exports = router;
