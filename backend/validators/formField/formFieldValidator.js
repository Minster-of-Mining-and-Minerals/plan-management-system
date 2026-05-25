"use strict";

const Joi = require("joi");
const {
  FIELD_TYPES,
  STORAGE_TYPES,
  CORE_USER_COLUMNS,
  USER_MODEL_NAME,
  DEFAULT_FIELD_CATEGORIES,
} = require("../../config/userFormConstants");

const configSchema = Joi.object({
  options: Joi.array().items(Joi.string()).optional(),
  multiple: Joi.boolean().optional(),
  max_selected: Joi.number().integer().min(1).optional(),
  min_length: Joi.number().integer().min(0).optional(),
  max_length: Joi.number().integer().min(1).optional(),
  pattern: Joi.string().valid("email", "text", "phone").optional(),
  allowed_types: Joi.array().items(Joi.string()).optional(),
  max_size_mb: Joi.number().positive().optional(),
}).default({});

const fieldKeySchema = Joi.string()
  .pattern(/^[a-z][a-z0-9_]{0,63}$/)
  .required();

const createFormFieldSchema = Joi.object({
  model_name: Joi.string().default(USER_MODEL_NAME),
  field_key: fieldKeySchema,
  label: Joi.string().min(1).max(255).required(),
  field_type: Joi.string().valid(...FIELD_TYPES).required(),
  storage_type: Joi.string().valid("custom").default("custom"),
  category: Joi.string().min(1).max(64).default("General"),
  is_required: Joi.boolean().optional(),
  is_visible: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  config: configSchema,
});

const updateFormFieldSchema = Joi.object({
  field_key: fieldKeySchema.optional(),
  label: Joi.string().min(1).max(255).optional(),
  field_type: Joi.string().valid(...FIELD_TYPES).optional(),
  storage_type: Joi.forbidden(),
  category: Joi.string().min(1).max(64).optional(),
  is_required: Joi.boolean().optional(),
  is_visible: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  config: configSchema,
}).min(1);

const reorderSchema = Joi.object({
  model_name: Joi.string().default(USER_MODEL_NAME),
  field_ids: Joi.array()
    .items(Joi.string().guid({ version: "uuidv4" }))
    .min(1)
    .required(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
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
  validateCreateFormField: validate(createFormFieldSchema),
  validateUpdateFormField: validate(updateFormFieldSchema),
  validateReorderFormFields: validate(reorderSchema),
  DEFAULT_FIELD_CATEGORIES,
};
