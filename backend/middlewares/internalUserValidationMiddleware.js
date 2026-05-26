"use strict";

const Joi = require("joi");

const profileFields = {
  department_id: Joi.string().uuid().allow(null, "").optional(),
  department: Joi.string().trim().max(128).allow(null, "").optional(),
  title_id: Joi.string().uuid().allow(null, "").optional(),
  job_title: Joi.string().trim().max(128).allow(null, "").optional(),
  employee_id: Joi.string().trim().max(64).allow(null, "").optional(),
};

const createSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone_number: Joi.string().trim().max(50).allow("", null).optional(),
  role_ids: Joi.array().items(Joi.string().uuid()).optional(),
  ...profileFields,
}).unknown(false);

const updateSchema = Joi.object({
  full_name: Joi.string().trim().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().trim().max(50).allow("", null).optional(),
  role_ids: Joi.array().items(Joi.string().uuid()).optional(),
  is_active: Joi.boolean().optional(),
  ...profileFields,
}).unknown(false);

const validateCreateInternalUser = (req, res, next) => {
  const { error, value } = createSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join("; "),
    });
  }
  req.validatedUserData = {
    full_name: value.full_name,
    email: value.email.trim().toLowerCase(),
    phone_number: value.phone_number || null,
  };
  req.validatedRoleIds = value.role_ids;
  next();
};

const validateUpdateInternalUser = (req, res, next) => {
  const { error, value } = updateSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join("; "),
    });
  }
  req.validatedUserData = {};
  if (value.full_name !== undefined) req.validatedUserData.full_name = value.full_name;
  if (value.email !== undefined) {
    req.validatedUserData.email = value.email.trim().toLowerCase();
  }
  if (value.phone_number !== undefined) {
    req.validatedUserData.phone_number = value.phone_number || null;
  }
  if (value.is_active !== undefined) req.validatedUserData.is_active = value.is_active;
  req.validatedRoleIds = value.role_ids;
  next();
};

module.exports = {
  validateCreateInternalUser,
  validateUpdateInternalUser,
};
