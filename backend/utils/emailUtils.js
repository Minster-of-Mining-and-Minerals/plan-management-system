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
 * Loose format check for demo/internal addresses (e.g. long @mom-demo.et slugs).
 * Joi's .email() enforces a 64-char local-part limit; seeded organogram emails can exceed that.
 */
function isValidEmailFormat(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
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
 * Login email field — relaxed format check so long seeded demo slugs can sign in.
 */
function joiLoginEmailField({ required = true } = {}) {
  let schema = Joi.string()
    .trim()
    .lowercase()
    .custom((value, helpers) => {
      if (!isValidEmailFormat(value)) {
        return helpers.error("string.email");
      }
      return value;
    })
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
  isValidEmailFormat,
  joiEmailField,
  joiLoginEmailField,
  normalizeEmailBody,
};
