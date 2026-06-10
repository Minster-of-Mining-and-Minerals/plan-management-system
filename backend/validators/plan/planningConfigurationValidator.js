"use strict";

const Joi = require("joi");

const updatePlanningConfigurationSchema = Joi.object({
  min_duration_years: Joi.number().integer().min(1).max(50).optional(),
  max_duration_years: Joi.number().integer().min(1).max(50).optional(),
  draft_entity_label_singular: Joi.string().trim().max(100).optional(),
  draft_entity_label_plural: Joi.string().trim().max(100).optional(),
  create_action_label: Joi.string().trim().max(120).optional(),
  planning_period_label: Joi.string().trim().max(100).optional(),
  duration_label: Joi.string().trim().max(100).optional(),
  start_year_label: Joi.string().trim().max(100).optional(),
  end_year_label: Joi.string().trim().max(100).optional(),
  target_units: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().trim().max(50).optional(),
        label: Joi.string().trim().max(100).required(),
        symbol: Joi.string().trim().max(30).optional(),
      })
    )
    .min(1)
    .optional(),
  breakdown_mode: Joi.string().valid("quarterly", "semi_annual", "custom").optional(),
  custom_periods: Joi.array()
    .items(
      Joi.object({
        label: Joi.string().trim().max(100).required(),
      })
    )
    .min(1)
    .max(12)
    .optional(),
})
  .min(1)
  .custom((value, helpers) => {
    const min = value.min_duration_years;
    const max = value.max_duration_years;
    if (min !== undefined && max !== undefined && min > max) {
      return helpers.error("any.custom", {
        message: "Minimum duration cannot exceed maximum duration.",
      });
    }
    return value;
  });

const validate = (schema, source = "body") => (req, res, next) => {
  const dataToValidate =
    source === "query" ? req.query : source === "params" ? req.params : req.body;
  const { error, value } = schema.validate(dataToValidate, {
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
  if (source === "body") req.body = value;
  next();
};

module.exports = {
  validateUpdatePlanningConfiguration: validate(updatePlanningConfigurationSchema),
};
