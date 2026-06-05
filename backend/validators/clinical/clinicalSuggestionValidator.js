"use strict";

const Joi = require("joi");
const { CLINICAL_SUGGESTION_CATEGORIES } = require("../../config/clinicalSuggestionConstants");

const categorySchema = Joi.string().valid(...CLINICAL_SUGGESTION_CATEGORIES);

const createSchema = Joi.object({
  text: Joi.string().min(2).max(2000).required(),
  category: categorySchema.optional(),
  department_id: Joi.string().uuid().allow(null).optional(),
  is_pinned: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  text: Joi.string().min(2).max(2000).optional(),
  category: categorySchema.optional(),
  department_id: Joi.string().uuid().allow(null).optional(),
  is_pinned: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const learnSchema = Joi.object({
  text: Joi.string().min(4).max(10000).required(),
  category: categorySchema.optional(),
  department_id: Joi.string().uuid().allow(null).optional(),
});

const learnFormSchema = Joi.object({
  form_data: Joi.object().required(),
  fields_meta: Joi.array().items(Joi.object()).optional(),
  default_category: categorySchema.optional(),
});

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
  req.body = value;
  next();
};

module.exports = {
  validateCreateClinicalSuggestion: validate(createSchema),
  validateUpdateClinicalSuggestion: validate(updateSchema),
  validateLearnClinicalSuggestion: validate(learnSchema),
  validateLearnFormClinicalSuggestion: validate(learnFormSchema),
};
