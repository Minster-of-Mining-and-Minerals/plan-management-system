"use strict";

const Joi = require("joi");
const { joiEmail } = require("../common/joiEmail");

const loginSchema = Joi.object({
  email: joiEmail.required().messages({
    "string.email": "Must be a valid email (e.g. name@gmail.com)",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
});

const logoutSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token is required for logout",
  }),
});

exports.validateLogin = (req, res, next) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((err) => err.message),
      message: error.details[0]?.message || "Invalid login payload",
    });
  }
  // Normalize email so Gmail / mixed-case addresses authenticate consistently.
  req.body = {
    ...value,
    email: String(value.email).trim().toLowerCase(),
  };
  next();
};

exports.validateLogout = (req, res, next) => {
  const { error } = logoutSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((err) => err.message),
      message: error.details[0]?.message || "Invalid logout payload",
    });
  }
  next();
};
