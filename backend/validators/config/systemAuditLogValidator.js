"use strict";

const Joi = require("joi");
const { MODULE_LABELS } = require("../../services/auditLogService");

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  module: Joi.string()
    .valid(...Object.keys(MODULE_LABELS))
    .optional(),
  action: Joi.string().valid("create", "update", "delete", "restore").optional(),
  search: Joi.string().trim().max(200).optional(),
});

const validate = (schema, source = "query") => (req, res, next) => {
  const dataToValidate =
    source === "body"
      ? req.body
      : source === "params"
        ? req.params
        : { ...req.query };
  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }
  if (source === "query") {
    req.validatedQuery = value;
  }
  next();
};

module.exports = {
  validateListSystemAuditLogs: validate(listQuerySchema, "query"),
  validateIdParam: validate(
    Joi.object({ id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).required() }),
    "params"
  ),
};
