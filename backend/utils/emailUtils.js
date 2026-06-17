"use strict";

const Joi = require("joi");

/**
 * Trim + lowercase for consistent lookups (demo users use @mom-demo.et slugs).
 */
function normalizeEmail(email) {
  if (email == null) return "";
  return String(email).trim().toLowerCase();
}

/**
 * Joi email field — allows custom/internal TLDs (e.g. mom-demo.et) and trims input.
 */
function joiEmailField({ required = true } = {}) {
  let schema = Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .messages({
      "string.email": "Must be a valid email address",
      "string.empty": "Email is required",
    });

  return required ? schema.required() : schema.optional();
}

/**
 * Apply normalizeEmail to req.body.email when present.
 */
function normalizeEmailBody(req) {
  if (req.body && typeof req.body.email === "string") {
    req.body.email = normalizeEmail(req.body.email);
  }
}

module.exports = {
  normalizeEmail,
  joiEmailField,
  normalizeEmailBody,
};
