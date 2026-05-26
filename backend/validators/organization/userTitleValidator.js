"use strict";

const Joi = require("joi");

const createUserTitleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).required().messages({
    "string.empty": "Title name is required",
  }),
  code: Joi.string().trim().min(1).max(30).required().messages({
    "string.empty": "Title code is required",
  }),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateUserTitleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(80).optional(),
  code: Joi.string().trim().min(1).max(30).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
}).min(1);

const statusSchema = Joi.object({
  status: Joi.string().valid("active", "inactive").required(),
});

const validate =
  (schema) =>
  (req, res, next) => {
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

exports.validateCreateUserTitle = validate(createUserTitleSchema);
exports.validateUpdateUserTitle = validate(updateUserTitleSchema);
exports.validateUserTitleStatus = validate(statusSchema);
