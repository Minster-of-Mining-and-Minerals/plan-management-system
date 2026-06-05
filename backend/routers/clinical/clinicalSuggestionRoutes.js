"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/clinical/clinicalSuggestionController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const {
  validateCreateClinicalSuggestion,
  validateUpdateClinicalSuggestion,
  validateLearnClinicalSuggestion,
  validateLearnFormClinicalSuggestion,
} = require("../../validators/clinical/clinicalSuggestionValidator");

router.use(authenticateToken, requireInternalAccount);

router.get(
  "/search",
  checkPermission("clinical_suggestion", "read"),
  controller.search
);

router.get(
  "/categories",
  checkPermission("clinical_suggestion", "read"),
  controller.getCategories
);

router.post(
  "/learn",
  checkPermission("clinical_suggestion", "read"),
  validateLearnClinicalSuggestion,
  controller.learn
);

router.post(
  "/learn-form",
  checkPermission("clinical_suggestion", "read"),
  validateLearnFormClinicalSuggestion,
  controller.learnForm
);

router.post(
  "/:suggestionId/usage",
  checkPermission("clinical_suggestion", "read"),
  controller.recordUsage
);

router.get(
  "/",
  checkPermission("clinical_suggestion", "manage"),
  controller.list
);

router.post(
  "/import-defaults",
  checkPermission("clinical_suggestion", "manage"),
  controller.importDefaults
);

router.post(
  "/",
  checkPermission("clinical_suggestion", "create"),
  validateCreateClinicalSuggestion,
  controller.create
);

router.put(
  "/:suggestionId",
  checkPermission("clinical_suggestion", "update"),
  validateUpdateClinicalSuggestion,
  controller.update
);

router.delete(
  "/:suggestionId",
  checkPermission("clinical_suggestion", "delete"),
  controller.remove
);

module.exports = router;
