"use strict";

const Joi = require("joi");
const { validateMiddleware, requiredUuid, optionalUuid } = require("../helpers/joiFieldHelpers");

const ENTITY_TYPES = [
  "plan_version",
  "strategic",
  "objective",
  "goal",
  "kpi",
  "activity",
  "task",
  "initiative",
  "budget",
  "target",
];

const formFieldSchema = Joi.object({
  key: Joi.string().trim().min(1).max(80).required(),
  label: Joi.string().trim().min(1).max(150).required(),
  type: Joi.string().valid("text", "textarea", "select").required(),
  required: Joi.boolean().optional(),
  placeholder: Joi.string().trim().max(255).allow("", null).optional(),
  options: Joi.array()
    .items(
      Joi.object({
        value: Joi.string().trim().required(),
        label: Joi.string().trim().required(),
      })
    )
    .optional(),
});

const standardFieldRuleSchema = Joi.object({
  visible: Joi.boolean().optional(),
  required: Joi.boolean().optional(),
  allowedTypes: Joi.array()
    .items(Joi.string().valid(...ENTITY_TYPES))
    .optional(),
});

const formConfigSchema = Joi.object({
  fields: Joi.array().items(formFieldSchema).default([]),
  standardFields: Joi.object()
    .pattern(Joi.string(), standardFieldRuleSchema)
    .default({}),
});

const idParamSchema = Joi.object({
  id: requiredUuid("id"),
});

const createCategorySchema = Joi.object({
  parent_category_id: optionalUuid("parent_category_id"),
  code: Joi.string().trim().min(2).max(80).allow(null, "").optional(),
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().allow("", null).optional(),
  form_config: formConfigSchema.optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_selectable: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
});

const updateCategorySchema = Joi.object({
  parent_category_id: optionalUuid("parent_category_id"),
  code: Joi.string().trim().min(2).max(80).allow(null, "").optional(),
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  form_config: formConfigSchema.optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_selectable: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const listCategoriesQuerySchema = Joi.object({
  is_active: Joi.boolean().optional(),
  for_raising: Joi.boolean().optional(),
});

module.exports = {
  validateIdParam: validateMiddleware(idParamSchema, "params"),
  validateCreateCategory: validateMiddleware(createCategorySchema),
  validateUpdateCategory: validateMiddleware(updateCategorySchema),
  validateListCategoriesQuery: validateMiddleware(listCategoriesQuerySchema, "query"),
  ENTITY_TYPES,
  formConfigSchema,
};
