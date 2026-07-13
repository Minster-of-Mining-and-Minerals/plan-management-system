"use strict";

const Joi = require("joi");

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required(),
  code: Joi.string().trim().min(1).max(64).required(),
  html_content: Joi.string().allow("").optional(),
  is_default: Joi.boolean().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).optional(),
  code: Joi.string().trim().min(1).max(64).optional(),
  html_content: Joi.string().allow("").optional(),
  is_default: Joi.boolean().optional(),
  status: Joi.string().valid("active", "inactive").optional(),
}).min(1);

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details.map((d) => d.message).join("; "),
      });
    }
    next();
  };
}

module.exports = {
  validateCreateReceiptTemplate: validate(createSchema),
  validateUpdateReceiptTemplate: validate(updateSchema),
};
