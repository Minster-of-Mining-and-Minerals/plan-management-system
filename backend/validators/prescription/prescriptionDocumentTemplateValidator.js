"use strict";

const Joi = require("joi");

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).required(),
  code: Joi.string().trim().lowercase().min(2).max(64).required(),
  category_id: Joi.string().uuid().allow(null).optional(),
  html_content: Joi.string().trim().min(20).max(100000).required(),
  is_default: Joi.boolean().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(255).optional(),
  code: Joi.string().trim().lowercase().min(2).max(64).optional(),
  category_id: Joi.string().uuid().allow(null).optional(),
  html_content: Joi.string().trim().min(20).max(100000).optional(),
  is_default: Joi.boolean().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
}).min(1);

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  next();
};

module.exports = {
  validateCreateDocumentTemplate: validate(createSchema),
  validateUpdateDocumentTemplate: validate(updateSchema),
};
