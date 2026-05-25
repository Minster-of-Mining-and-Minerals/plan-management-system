"use strict";

const Joi = require("joi");
const { USER_MODEL_NAME } = require("../../config/userFormConstants");

const createGroupSchema = Joi.object({
  model_name: Joi.string().default(USER_MODEL_NAME),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(2000).allow("", null).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_visible: Joi.boolean().optional(),
  is_required: Joi.boolean().optional(),
});

const updateGroupSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(2000).allow("", null).optional(),
  sort_order: Joi.number().integer().min(0).optional(),
  is_visible: Joi.boolean().optional(),
  is_required: Joi.boolean().optional(),
}).min(1);

const reorderGroupsSchema = Joi.object({
  model_name: Joi.string().default(USER_MODEL_NAME),
  group_ids: Joi.array()
    .items(Joi.string().guid({ version: "uuidv4" }))
    .min(1)
    .required(),
});

const validate = (schema, options = {}) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    ...options,
  });
  if (!error && value) {
    req.body = value;
  }
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
  validateCreateFormFieldGroup: validate(createGroupSchema),
  validateUpdateFormFieldGroup: validate(updateGroupSchema),
  validateReorderFormFieldGroups: validate(reorderGroupsSchema),
};
