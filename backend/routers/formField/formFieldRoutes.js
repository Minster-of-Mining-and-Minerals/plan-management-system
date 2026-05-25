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

router.get("/", getFormFields);
router.get("/config", getUserFormConfig);
router.post("/", validateCreateFormField, createFormField);
router.put("/reorder", validateReorderFormFields, reorderFormFields);
router.put("/:id", validateUpdateFormField, updateFormField);
router.delete("/:id", deleteFormField);

module.exports = router;
