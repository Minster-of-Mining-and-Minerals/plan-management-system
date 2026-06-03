"use strict";

const Joi = require("joi");
const { MEDICAL_CERTIFICATE_TEMPLATE_STATUSES } = require("../../config/medicalCertificateConstants");

const createSchema = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(64).required(),
  header_html: Joi.string().optional(),
  footer_html: Joi.string().optional(),
  html_content: Joi.string().optional(),
  stamp_image_file: Joi.string().max(512).allow(null, "").optional(),
  has_template_stamp: Joi.boolean().optional(),
  is_default: Joi.boolean().optional(),
  status: Joi.string()
    .valid(...MEDICAL_CERTIFICATE_TEMPLATE_STATUSES)
    .optional(),
});

const updateSchema = createSchema.fork(
  ["name", "code"],
  (field) => field.optional()
);

function validateCreate(req, res, next) {
  const { error, value } = createSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  req.body = value;
  return next();
}

function validateUpdate(req, res, next) {
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  req.body = value;
  return next();
}

module.exports = {
  validateCreate,
  validateUpdate,
};
