"use strict";

const Joi = require("joi");

const uuid = Joi.string().guid({ version: "uuidv4" });

const createDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required().messages({
    "string.empty": "Department name is required",
  }),
  code: Joi.string().trim().min(2).max(50).required().messages({
    "string.empty": "Department code is required",
  }),
  dept_head: uuid.allow(null, "").optional(),
  status: Joi.string().valid("active", "inactive").optional(),
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).optional(),
  code: Joi.string().trim().min(2).max(50).optional(),
  dept_head: uuid.allow(null, "").optional(),
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

    if (value.dept_head === "") value.dept_head = null;
    req.body = value;
    next();
  };

exports.validateCreateDepartment = validate(createDepartmentSchema);
exports.validateUpdateDepartment = validate(updateDepartmentSchema);
exports.validateDepartmentStatus = validate(statusSchema);
