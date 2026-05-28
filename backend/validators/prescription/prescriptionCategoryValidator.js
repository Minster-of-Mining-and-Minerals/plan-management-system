"use strict";

const Joi = require("joi");

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  code: Joi.string().trim().lowercase().min(2).max(64).required(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  code: Joi.string().trim().lowercase().min(2).max(64).optional(),
  description: Joi.string().trim().max(2000).allow("", null).optional(),
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
  validateCreateCategory: validate(createSchema),
  validateUpdateCategory: validate(updateSchema),
};
