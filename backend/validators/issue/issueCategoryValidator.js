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

const idParamSchema = Joi.object({
  id: requiredUuid("id"),
});

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().allow("", null).optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  display_order: Joi.number().integer().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

const listCategoriesQuerySchema = Joi.object({
  is_active: Joi.boolean().optional(),
});

module.exports = {
  validateIdParam: validateMiddleware(idParamSchema, "params"),
  validateCreateCategory: validateMiddleware(createCategorySchema),
  validateUpdateCategory: validateMiddleware(updateCategorySchema),
  validateListCategoriesQuery: validateMiddleware(listCategoriesQuerySchema, "query"),
  ENTITY_TYPES,
};
