"use strict";

const Joi = require("joi");
const { optionalUuid } = require("../helpers/joiFieldHelpers");

const hexColorSchema = Joi.string()
  .trim()
  .pattern(/^#[0-9A-Fa-f]{6}$/)
  .messages({ "string.pattern.base": "Color must be a valid hex value (e.g. #0C4A6E)" });

const optionalPathSchema = Joi.string().trim().max(500).allow("", null);

const updateSchema = Joi.object({
  government_structure_id: optionalUuid("government_structure_id"),
  system_name_full: Joi.string().trim().max(255).optional(),
  system_name_short: Joi.string().trim().max(50).optional(),
  system_tagline: Joi.string().trim().max(255).allow("", null).optional(),
  logo_primary_path: optionalPathSchema.optional(),
  logo_secondary_path: optionalPathSchema.optional(),
  favicon_path: optionalPathSchema.optional(),
  primary_color: hexColorSchema.optional(),
  secondary_color: hexColorSchema.optional(),
  accent_color: hexColorSchema.optional(),
  success_color: hexColorSchema.optional(),
  warning_color: hexColorSchema.optional(),
  error_color: hexColorSchema.optional(),
  info_color: hexColorSchema.optional(),
  background_color: hexColorSchema.optional(),
  surface_color: hexColorSchema.optional(),
  sidebar_color: hexColorSchema.optional(),
  header_color: hexColorSchema.optional(),
  text_primary_color: hexColorSchema.optional(),
  text_secondary_color: hexColorSchema.optional(),
  border_color: hexColorSchema.optional(),
}).min(1);

const structureQuerySchema = Joi.object({
  government_structure_id: optionalUuid("government_structure_id"),
});

const structureParamsSchema = Joi.object({
  government_structure_id: Joi.string()
    .trim()
    .guid({ version: ["uuidv4", "uuidv5"] })
    .required()
    .messages({
      "string.guid": '"government_structure_id" must be a valid GUID',
      "any.required": '"government_structure_id" is required',
    }),
});

const validate = (schema, source = "body") => (req, res, next) => {
  const dataToValidate =
    source === "query" ? req.query : source === "params" ? req.params : req.body;
  const { error, value } = schema.validate(dataToValidate, {
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
  if (source === "body") req.body = value;
  if (source === "query") req.query = value;
  if (source === "params") req.params = value;
  next();
};

module.exports = {
  validateUpdateBranding: validate(updateSchema),
  validateBrandingStructureQuery: validate(structureQuerySchema, "query"),
  validateBrandingStructureParams: validate(structureParamsSchema, "params"),
};
