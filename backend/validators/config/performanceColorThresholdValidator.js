"use strict";

const Joi = require("joi");

const hexColorSchema = Joi.string()
  .trim()
  .pattern(/^#[0-9A-Fa-f]{6}$/)
  .messages({ "string.pattern.base": "Color must be a valid hex value (e.g. #DC2626)" });

const thresholdBodySchema = {
  label: Joi.string().trim().max(100).required(),
  min_percentage: Joi.number().integer().min(0).max(100).required(),
  max_percentage: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .when("min_percentage", {
      is: Joi.number(),
      then: Joi.number().min(Joi.ref("min_percentage")),
    }),
  color_hex: hexColorSchema.required(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().default(true),
};

const createSchema = Joi.object(thresholdBodySchema);
const updateSchema = Joi.object({
  label: Joi.string().trim().max(100).optional(),
  min_percentage: Joi.number().integer().min(0).max(100).optional(),
  max_percentage: Joi.number().integer().min(0).max(100).optional(),
  color_hex: hexColorSchema.optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const validate = (schema, source = "body") => (req, res, next) => {
  const dataToValidate =
    source === "query" ? req.query : source === "params" ? req.params : req.body;
  const { error, value } = schema.validate(dataToValidate, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }
  if (source === "body") req.body = value;
  next();
};

module.exports = {
  validateCreateThreshold: validate(createSchema),
  validateUpdateThreshold: validate(updateSchema),
  validateIdParam: validate(
    Joi.object({ id: Joi.string().guid({ version: "uuidv4" }).required() }),
    "params"
  ),
};
