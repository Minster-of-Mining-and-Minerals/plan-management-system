"use strict";

const Joi = require("joi");

const statuses = [
  "RECOMMENDED",
  "PENDING_SCHEDULING",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "MISSED",
];

const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

const createSchema = Joi.object({
  patient_id: Joi.string().uuid().required(),
  appointment_id: Joi.string().uuid().required(),
  recommended_by: Joi.string().uuid().required(),
  assigned_department_id: Joi.string().uuid().allow(null).optional(),
  assigned_user_id: Joi.string().uuid().allow(null).optional(),
  reason: Joi.string().trim().min(1).max(2000).required(),
  clinical_instructions: Joi.string().trim().max(5000).allow("", null).optional(),
  priority: Joi.string()
    .valid(...priorities)
    .optional(),
  recommended_date: Joi.date().iso().optional(),
  target_date: Joi.date().iso().allow(null).optional(),
  metadata: Joi.object().unknown().optional(),
});

const updateSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(2000).optional(),
  clinical_instructions: Joi.string().trim().max(5000).allow("", null).optional(),
  priority: Joi.string()
    .valid(...priorities)
    .optional(),
  recommended_date: Joi.date().iso().optional(),
  target_date: Joi.date().iso().allow(null).optional(),
  assigned_department_id: Joi.string().uuid().allow(null).optional(),
  assigned_user_id: Joi.string().uuid().allow(null).optional(),
  metadata: Joi.object().unknown().optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

const cancelSchema = Joi.object({
  cancel_reason: Joi.string().trim().max(2000).allow("", null).optional(),
});

// Attempt-based scheduling schema (replaces linked_schedule_id)
const createAttemptSchema = Joi.object({
  schedule_id: Joi.string().uuid().required(),
  scheduled_date: Joi.date().iso().allow(null).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
});

const updateAttemptSchema = Joi.object({
  cancel_reason: Joi.string().trim().max(2000).allow("", null).optional(),
});

const completeSchema = Joi.object({
  completed_encounter_id: Joi.string().uuid().required(),
  completion_notes: Joi.string().trim().max(5000).allow("", null).optional(),
});

const listQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...statuses)
    .optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  offset: Joi.number().integer().min(0).optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  if (value) req.body = value;
  next();
};

const validateQuery = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  if (value) req.query = value;
  next();
};

module.exports = {
  validateCreateFollowUp: validate(createSchema),
  validateUpdateFollowUp: validate(updateSchema),
  validateCancelFollowUp: validate(cancelSchema),
  validateCreateAttempt: validate(createAttemptSchema),
  validateUpdateAttempt: validate(updateAttemptSchema),
  validateCompleteFollowUp: validate(completeSchema),
  validateListFollowUps: validateQuery(listQuerySchema),
};