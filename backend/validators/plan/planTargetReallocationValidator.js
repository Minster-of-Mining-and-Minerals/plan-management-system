"use strict";

const Joi = require("joi");
const { normalizeCreatePayload } = require("../../utils/planTargetReallocationValidationUtils");
const { REALLOCATION_STATUS_VALUES } = require("../../utils/planTargetReallocationWorkflowUtils");

const createTargetReallocationSchema = Joi.object({
  draftId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  draft_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  masterPlanVersionId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  master_plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  kpiId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  kpi_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  fromPeriodId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  from_period_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  toPeriodId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  to_period_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  amount: Joi.number().required().messages({
    "number.base": "Amount must be a number",
    "any.required": "Amount is required",
  }),
  reason: Joi.string().trim().min(1).max(4000).required().messages({
    "string.empty": "Reason is required",
    "any.required": "Reason is required",
  }),
})
  .custom((value, helpers) => {
    const normalized = normalizeCreatePayload(value);
    if (!normalized.kpiId) {
      return helpers.message("kpiId is required");
    }
    if (!normalized.fromPeriodId) {
      return helpers.message("fromPeriodId is required");
    }
    if (!normalized.toPeriodId) {
      return helpers.message("toPeriodId is required");
    }
    return value;
  })
  .messages({
    "object.custom": "{#message}",
  });

const reviewTargetReallocationSchema = Joi.object({
  comment: Joi.string().trim().max(4000).optional().allow("", null),
  review_comment: Joi.string().trim().max(4000).optional().allow("", null),
});

const rejectTargetReallocationSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(4000).optional(),
  review_comment: Joi.string().trim().min(1).max(4000).optional(),
})
  .custom((value, helpers) => {
    const comment = value.comment ?? value.review_comment;
    if (!comment || !String(comment).trim()) {
      return helpers.message("comment is required");
    }
    return value;
  })
  .messages({
    "object.custom": "{#message}",
  });

const listTargetReallocationsQuerySchema = Joi.object({
  draftId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  draft_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  master_plan_version_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  kpiId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  kpi_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  periodId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  period_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  requestorId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  requestor_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  requested_by: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  status: Joi.string()
    .valid(...REALLOCATION_STATUS_VALUES)
    .optional(),
  requestedFrom: Joi.date().iso().optional(),
  requested_from: Joi.date().iso().optional(),
  requestedTo: Joi.date().iso().optional(),
  requested_to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort_by: Joi.string()
    .valid("requested_at", "created_at", "updated_at", "status", "amount", "applied_at")
    .optional(),
  sort_order: Joi.string().valid("ASC", "DESC", "asc", "desc").optional(),
});

const periodTargetReallocationReportingQuerySchema = Joi.object({
  kpiId: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
  kpi_id: Joi.string().guid({ version: ["uuidv4", "uuidv5"] }).optional(),
});

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const dataToValidate =
      source === "body"
        ? req.body
        : source === "query"
          ? { ...req.query }
          : req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((detail) => detail.message),
      });
    }

    if (source === "body") {
      req.body = value;
    } else if (source === "query") {
      req.validatedQuery = value;
    }

    next();
  };

module.exports = {
  validateCreateTargetReallocation: validate(createTargetReallocationSchema),
  validateReviewTargetReallocation: validate(reviewTargetReallocationSchema),
  validateRejectTargetReallocation: validate(rejectTargetReallocationSchema),
  validateListTargetReallocationsQuery: validate(listTargetReallocationsQuerySchema, "query"),
  validatePeriodTargetReallocationReportingQuery: validate(
    periodTargetReallocationReportingQuerySchema,
    "query"
  ),
};
