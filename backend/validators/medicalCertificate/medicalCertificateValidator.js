"use strict";

const Joi = require("joi");
const {
  CERTIFICATE_SIGNATURE_TYPES,
  INCLUDE_OPTION_KEYS,
} = require("../../config/medicalCertificateConstants");

const includeOptionsSchema = Joi.object(
  Object.fromEntries(
    INCLUDE_OPTION_KEYS.map((key) => [key, Joi.boolean().optional()])
  )
).optional();

const previewSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  schedule_id: Joi.string().uuid().required(),
  appointment_id: Joi.string().uuid().optional(),
  template_id: Joi.string().uuid().optional(),
  include_options: includeOptionsSchema,
  signature_type: Joi.string()
    .valid(...CERTIFICATE_SIGNATURE_TYPES)
    .optional(),
  doctor_notes: Joi.string().max(5000).allow("", null).optional(),
});

const issueSchema = previewSchema;

function validatePreview(req, res, next) {
  const { error, value } = previewSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  req.body = value;
  return next();
}

function validateIssue(req, res, next) {
  const { error, value } = issueSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
  req.body = value;
  return next();
}

module.exports = {
  validatePreview,
  validateIssue,
};
