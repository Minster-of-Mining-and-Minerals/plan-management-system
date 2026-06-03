"use strict";

const Joi = require("joi");
const { MEDICAL_DIAGRAM_CATEGORY_STATUSES } = require("../../config/medicalDiagramConstants");

const categoryCodeSchema = Joi.string().pattern(/^[a-z][a-z0-9_]{0,63}$/);

const createSchema = Joi.object({
  name: Joi.string().min(1).max(150).required(),
  code: categoryCodeSchema.optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid(...MEDICAL_DIAGRAM_CATEGORY_STATUSES).optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().min(1).max(150).optional(),
  code: categoryCodeSchema.optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid(...MEDICAL_DIAGRAM_CATEGORY_STATUSES).optional(),
}).min(1);

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }
  if (value) req.body = value;
  next();
};

module.exports = {
  validateCreateMedicalDiagramCategory: validate(createSchema),
  validateUpdateMedicalDiagramCategory: validate(updateSchema),
};
