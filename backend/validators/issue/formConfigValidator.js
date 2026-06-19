"use strict";

const Joi = require("joi");
const { validateMiddleware, requiredUuid, optionalUuid } = require("../helpers/joiFieldHelpers");
const { FIELD_TYPES } = require("../../utils/formConfigFieldTypes");

const fieldTypeSchema = Joi.string()
  .trim()
  .uppercase()
  .valid(...FIELD_TYPES);

const optionSchema = Joi.object({
  label: Joi.string().trim().required(),
  value: Joi.string().trim().required(),
});

const validationRulesSchema = Joi.object({
  min_length: Joi.number().integer().min(0).optional(),
  max_length: Joi.number().integer().min(1).optional(),
  min: Joi.number().optional(),
  max: Joi.number().optional(),
  regex: Joi.string().trim().optional(),
  allowed_extensions: Joi.array().items(Joi.string().trim()).optional(),
  max_file_size: Joi.number().integer().min(1).optional(),
  multiple_files: Joi.boolean().optional(),
}).unknown(false);

const idParamSchema = Joi.object({ id: requiredUuid("id") });
const containerIdParamSchema = Joi.object({ containerId: requiredUuid("containerId") });
const fieldIdParamSchema = Joi.object({ fieldId: requiredUuid("fieldId") });

const createContainerSchema = Joi.object({
  issue_category_id: requiredUuid("issue_category_id"),
  name: Joi.string().trim().min(2).max(150).required(),
  code: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().allow("", null).optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

const updateContainerSchema = Joi.object({
  issue_category_id: requiredUuid("issue_category_id").optional(),
  name: Joi.string().trim().min(2).max(150).optional(),
  code: Joi.string().trim().min(2).max(80).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const listContainersQuerySchema = Joi.object({
  is_active: Joi.boolean().optional(),
  is_published: Joi.boolean().optional(),
  search: Joi.string().trim().allow("").optional(),
  issue_category_id: optionalUuid("issue_category_id"),
});

const createFieldSchema = Joi.object({
  label: Joi.string().trim().min(1).max(200).required(),
  field_key: Joi.string().trim().min(1).max(80).optional(),
  placeholder: Joi.string().trim().max(255).allow("", null).optional(),
  help_text: Joi.string().trim().allow("", null).optional(),
  field_type: fieldTypeSchema.default("TEXT"),
  required: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional(),
  default_value: Joi.string().trim().allow("", null).optional(),
  validation_rules: validationRulesSchema.optional(),
  options: Joi.array().items(optionSchema).optional(),
});

const updateFieldSchema = Joi.object({
  label: Joi.string().trim().min(1).max(200).optional(),
  field_key: Joi.string().trim().min(1).max(80).optional(),
  placeholder: Joi.string().trim().max(255).allow("", null).optional(),
  help_text: Joi.string().trim().allow("", null).optional(),
  field_type: fieldTypeSchema.optional(),
  required: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  display_order: Joi.number().integer().min(0).optional(),
  default_value: Joi.string().trim().allow("", null).optional(),
  validation_rules: validationRulesSchema.optional(),
  options: Joi.array().items(optionSchema).optional(),
}).min(1);

const reorderFieldsSchema = Joi.object({
  ordered_field_ids: Joi.array().items(requiredUuid("field_id")).min(1).required(),
});

const categoryIdParamSchema = Joi.object({ categoryId: requiredUuid("categoryId") });

module.exports = {
  validateIdParam: validateMiddleware(idParamSchema, "params"),
  validateContainerIdParam: validateMiddleware(containerIdParamSchema, "params"),
  validateFieldIdParam: validateMiddleware(fieldIdParamSchema, "params"),
  validateCategoryIdParam: validateMiddleware(categoryIdParamSchema, "params"),
  validateCreateContainer: validateMiddleware(createContainerSchema),
  validateUpdateContainer: validateMiddleware(updateContainerSchema),
  validateListContainersQuery: validateMiddleware(listContainersQuerySchema, "query"),
  validateCreateField: validateMiddleware(createFieldSchema),
  validateUpdateField: validateMiddleware(updateFieldSchema),
  validateReorderFields: validateMiddleware(reorderFieldsSchema),
  FIELD_TYPES,
};
