"use strict";

const Joi = require("joi");

const stepSchema = Joi.object({
  step_order: Joi.number().integer().min(1).required(),
  label: Joi.string().trim().max(255).required(),
  requires_weight: Joi.boolean().default(false),
  color_hex: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const createPlanRuleSchema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
  inherit_to_descendants: Joi.boolean().default(false),
  is_active: Joi.boolean().default(true),
  steps: Joi.array().items(stepSchema).min(1).required(),
});

const updatePlanRuleSchema = Joi.object({
  name: Joi.string().trim().max(255).optional(),
  government_structure_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).allow(null).optional(),
  inherit_to_descendants: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  steps: Joi.array().items(stepSchema).min(1).optional(),
});

const validate = (schema, source = "body") => (req, res, next) => {
  let dataToValidate = source === "query" ? req.query : source === "params" ? req.params : req.body;
  const { error } = schema.validate(dataToValidate, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }
  next();
};

module.exports = {
  validateCreatePlanRule: validate(createPlanRuleSchema),
  validateUpdatePlanRule: validate(updatePlanRuleSchema),
  validateIdParam: validate(
    Joi.object({ id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required() }),
    "params"
  ),
};
