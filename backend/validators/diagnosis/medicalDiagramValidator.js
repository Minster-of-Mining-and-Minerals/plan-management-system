"use strict";

const Joi = require("joi");
const { MEDICAL_DIAGRAM_STATUSES } = require("../../config/medicalDiagramConstants");

const codeSchema = Joi.string()
  .pattern(/^[a-z][a-z0-9_]{0,63}$/)
  .required();

const createSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  code: codeSchema,
  image_file: Joi.string().max(512).allow("", null).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  status: Joi.string().valid(...MEDICAL_DIAGRAM_STATUSES).optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  code: codeSchema.optional(),
  image_file: Joi.string().max(512).allow("", null).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  status: Joi.string().valid(...MEDICAL_DIAGRAM_STATUSES).optional(),
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
  validateCreateMedicalDiagram: validate(createSchema),
  validateUpdateMedicalDiagram: validate(updateSchema),
};
