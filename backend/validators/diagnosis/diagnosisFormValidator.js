"use strict";

const Joi = require("joi");
const { DIAGNOSIS_FIELD_TYPES } = require("../../config/diagnosisFormConstants");

const configSchema = Joi.object({
  options: Joi.array().items(Joi.string()).optional(),
  multiple: Joi.boolean().optional(),
  max_selected: Joi.number().integer().min(1).optional(),
  min_length: Joi.number().integer().min(0).optional(),
  max_length: Joi.number().integer().min(1).optional(),
  pattern: Joi.string().valid("email", "text", "phone").optional(),
  placeholder: Joi.string().max(255).optional(),
  default_value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).optional(),
  allowed_types: Joi.array().items(Joi.string()).optional(),
  max_size_mb: Joi.number().positive().optional(),
}).default({});

const createTemplateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow("", null).optional(),
  seed_defaults: Joi.boolean().optional(),
});

const updateTemplateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().allow("", null).optional(),
  status: Joi.string().valid("active", "archived").optional(),
}).min(1);

const duplicateTemplateSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
});

const createConfigSchema = Joi.object({
  assigned_staff_id: Joi.string().guid({ version: "uuidv4" }).required(),
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().allow("", null).optional(),
  source_template_id: Joi.string().guid({ version: "uuidv4" }).optional(),
});

const assignTemplateSchema = Joi.object({
  template_id: Joi.string().guid({ version: "uuidv4" }).required(),
  replace_existing: Joi.boolean().optional(),
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().allow("", null).optional(),
});

const updateConfigSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().allow("", null).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const createGroupSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().allow("", null).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_visible: Joi.boolean().optional(),
  is_required: Joi.boolean().optional(),
});

const updateGroupSchema = createGroupSchema.fork(["title"], (s) => s.optional()).min(1);

const fieldKeySchema = Joi.string()
  .pattern(/^[a-z][a-z0-9_]{0,63}$/)
  .required();

const createFieldSchema = Joi.object({
  group_id: Joi.string().guid({ version: "uuidv4" }).required(),
  field_key: fieldKeySchema,
  label: Joi.string().min(1).max(255).required(),
  field_type: Joi.string().valid(...DIAGNOSIS_FIELD_TYPES).required(),
  category: Joi.string().min(1).max(64).optional(),
  is_required: Joi.boolean().optional(),
  is_visible: Joi.boolean().optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  config: configSchema,
});

const updateFieldSchema = createFieldSchema
  .fork(["group_id", "field_key", "label", "field_type"], (s) => s.optional())
  .min(1);

const reorderSchema = Joi.object({
  ids: Joi.array().items(Joi.string().guid({ version: "uuidv4" })).min(1).required(),
});

const saveRecordSchema = Joi.object({
  form_data: Joi.object().required(),
  status: Joi.string().valid("draft", "submitted", "finalized").optional(),
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
  if (value) req.body = value;
  next();
};

module.exports = {
  validateCreateTemplate: validate(createTemplateSchema),
  validateUpdateTemplate: validate(updateTemplateSchema),
  validateDuplicateTemplate: validate(duplicateTemplateSchema),
  validateCreateConfig: validate(createConfigSchema),
  validateUpdateConfig: validate(updateConfigSchema),
  validateAssignTemplate: validate(assignTemplateSchema),
  validateCreateGroup: validate(createGroupSchema),
  validateUpdateGroup: validate(updateGroupSchema),
  validateCreateField: validate(createFieldSchema),
  validateUpdateField: validate(updateFieldSchema),
  validateReorder: validate(reorderSchema),
  validateSaveRecord: validate(saveRecordSchema),
};
