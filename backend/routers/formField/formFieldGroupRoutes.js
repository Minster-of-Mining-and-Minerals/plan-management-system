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
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.get("/", getFormFieldGroups);
router.post("/", validateCreateFormFieldGroup, createFormFieldGroup);
router.put("/reorder", validateReorderFormFieldGroups, reorderFormFieldGroups);
router.put("/:id", validateUpdateFormFieldGroup, updateFormFieldGroup);
router.delete("/:id", deleteFormFieldGroup);

module.exports = router;
