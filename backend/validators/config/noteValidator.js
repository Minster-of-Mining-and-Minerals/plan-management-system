"use strict";

const Joi = require("joi");
const { requiredUuid, UUID_GUID } = require("../helpers/joiFieldHelpers");

const attachmentIdsSchema = Joi.array()
  .items(
    Joi.string()
      .trim()
      .guid(UUID_GUID)
      .messages({
        "string.guid": '"attachment_id" must be a valid GUID',
      })
  )
  .optional()
  .default([]);

function sanitizeNoteBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }

  const sanitized = { ...body };
  if (sanitized.attachment_ids === "" || sanitized.attachment_ids == null) {
    delete sanitized.attachment_ids;
  } else if (Array.isArray(sanitized.attachment_ids)) {
    sanitized.attachment_ids = sanitized.attachment_ids.filter(
      (id) => typeof id === "string" && id.trim() !== ""
    );
  }
  return sanitized;
}

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(200).optional(),
  title: Joi.string().trim().max(255).optional(),
  is_pinned: Joi.boolean().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
});

const createSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  content: Joi.string().allow("").optional(),
  is_pinned: Joi.boolean().optional(),
  attachment_ids: attachmentIdsSchema,
});

const updateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional(),
  content: Joi.string().allow("").optional(),
  is_pinned: Joi.boolean().optional(),
  attachment_ids: attachmentIdsSchema,
}).min(1);

const idParamSchema = Joi.object({
  id: requiredUuid("id"),
});

const validate = (schema, source = "body") => (req, res, next) => {
  const dataToValidate =
    source === "query"
      ? { ...req.query }
      : source === "params"
        ? req.params
        : sanitizeNoteBody(req.body);
  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: error.details.map((e) => e.message),
    });
  }
  if (source === "body") req.body = value;
  if (source === "query") req.validatedQuery = value;
  if (source === "params") req.params = value;
  next();
};

module.exports = {
  validateListNotes: validate(listQuerySchema, "query"),
  validateCreateNote: validate(createSchema),
  validateUpdateNote: validate(updateSchema),
  validateNoteIdParam: validate(idParamSchema, "params"),
};
