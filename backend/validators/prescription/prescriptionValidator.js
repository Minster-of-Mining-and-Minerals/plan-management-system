"use strict";

const Joi = require("joi");
const { SIGNATURE_TYPES } = require("../../config/prescriptionConstants");

const itemSchema = Joi.object({
  item_name: Joi.string().trim().min(1).max(255).required(),
  strength: Joi.string().trim().max(120).allow("", null).optional(),
  route: Joi.string().trim().max(120).allow("", null).optional(),
  dosage: Joi.string().trim().max(120).allow("", null).optional(),
  frequency: Joi.string().trim().max(120).allow("", null).optional(),
  duration: Joi.string().trim().max(120).allow("", null).optional(),
  instructions: Joi.string().trim().max(4000).allow("", null).optional(),
  quantity: Joi.string().trim().max(64).allow("", null).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
});

const createSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  appointment_id: Joi.string().uuid().optional(),
  category_id: Joi.string().uuid().optional(),
  template_id: Joi.string().uuid().optional(),
  document_template_id: Joi.string().uuid().optional(),
  header_title: Joi.string().trim().max(255).allow("", null).optional(),
  signature_type: Joi.string()
    .valid(...SIGNATURE_TYPES)
    .required(),
  notes: Joi.string().trim().max(4000).allow("", null).optional(),
  status: Joi.string().valid("draft", "issued", "cancelled").optional(),
  workflow_log_id: Joi.string().uuid().optional(),
  items: Joi.array().items(itemSchema).optional(),
});

const previewSchema = createSchema.fork(["patient_id", "signature_type"], (s) =>
  s.optional()
);

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  if (value) req.body = value;
  next();
};

module.exports = {
  validateCreatePrescription: validate(createSchema),
  validatePreviewPrescription: validate(previewSchema),
};
