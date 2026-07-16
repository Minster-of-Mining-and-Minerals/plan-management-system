"use strict";

const Joi = require("joi");
const { AMENDMENT_TYPE_VALUES } = require("../../utils/planAmendmentTypes");
const { AMENDMENT_STATUS_VALUES } = require("../../utils/planAmendmentWorkflowUtils");
const { EFFECTIVE_MODE_VALUES } = require("../../utils/planAmendmentActionUtils");

const uuid = () => Joi.string().guid({ version: ["uuidv4", "uuidv5"] });

const actionSchema = Joi.object({
  actionType: Joi.string().optional(),
  action_type: Joi.string().optional(),
  type: Joi.string().optional(),
  amendmentType: Joi.string().optional(),
  amendment_type: Joi.string().optional(),
  sequence: Joi.number().integer().min(1).optional(),
  seq: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().unknown(true).optional(),
  dependsOnSequence: Joi.number().integer().min(1).optional().allow(null),
  depends_on_sequence: Joi.number().integer().min(1).optional().allow(null),
  dependsOn: Joi.number().integer().min(1).optional().allow(null),
  depends_on: Joi.number().integer().min(1).optional().allow(null),
}).or("actionType", "action_type", "type", "amendmentType", "amendment_type");

const createPlanAmendmentSchema = Joi.object({
  draftId: uuid().optional(),
  draft_id: uuid().optional(),
  masterPlanVersionId: uuid().optional(),
  master_plan_version_id: uuid().optional(),
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().max(4000).optional().allow("", null),
  reason: Joi.string().trim().max(4000).optional().allow("", null),
  amendmentReason: Joi.string().trim().max(4000).optional().allow("", null),
  amendment_reason: Joi.string().trim().max(4000).optional().allow("", null),
  amendmentType: Joi.string().optional(),
  amendment_type: Joi.string().optional(),
  type: Joi.string().optional(),
  actions: Joi.array().items(actionSchema).min(1).optional(),
  metadata: Joi.object().unknown(true).optional(),
  effectiveMode: Joi.string()
    .valid(...EFFECTIVE_MODE_VALUES, "now", "next", "custom")
    .optional(),
  effective_mode: Joi.string()
    .valid(...EFFECTIVE_MODE_VALUES, "now", "next", "custom")
    .optional(),
  effectiveDate: Joi.date().iso().optional().allow(null),
  effective_date: Joi.date().iso().optional().allow(null),
  expectedVersion: Joi.number().integer().min(0).optional().allow(null),
  expected_version: Joi.number().integer().min(0).optional().allow(null),
  baseVersion: Joi.number().integer().min(0).optional().allow(null),
  compensatesAmendmentId: uuid().optional().allow(null),
  compensates_amendment_id: uuid().optional().allow(null),
  compensates: uuid().optional().allow(null),
  emergency: Joi.boolean().optional(),
  isEmergency: Joi.boolean().optional(),
  submit: Joi.boolean().optional(),
  submitImmediately: Joi.boolean().optional(),
  asDraft: Joi.boolean().optional(),
  as_draft: Joi.boolean().optional(),
  status: Joi.string().optional(),
})
  .or("draftId", "draft_id", "masterPlanVersionId", "master_plan_version_id")
  .custom((value, helpers) => {
    const hasActions = Array.isArray(value.actions) && value.actions.length > 0;
    const hasType = Boolean(value.amendmentType || value.amendment_type || value.type);
    if (!hasActions && !hasType) {
      return helpers.message("actions or amendmentType is required");
    }
    return value;
  })
  .messages({
    "object.custom": "{#message}",
  });

const reviewPlanAmendmentSchema = Joi.object({
  comment: Joi.string().trim().max(4000).optional().allow("", null),
  review_comment: Joi.string().trim().max(4000).optional().allow("", null),
  emergency: Joi.boolean().optional(),
});

const rejectPlanAmendmentSchema = Joi.object({
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

const listPlanAmendmentsQuerySchema = Joi.object({
  draftId: uuid().optional(),
  draft_id: uuid().optional(),
  master_plan_version_id: uuid().optional(),
  masterPlanVersionId: uuid().optional(),
  amendmentType: Joi.string()
    .valid(...AMENDMENT_TYPE_VALUES)
    .optional(),
  amendment_type: Joi.string()
    .valid(...AMENDMENT_TYPE_VALUES)
    .optional(),
  type: Joi.string()
    .valid(...AMENDMENT_TYPE_VALUES)
    .optional(),
  status: Joi.string()
    .valid(...AMENDMENT_STATUS_VALUES)
    .optional(),
  requestorId: uuid().optional(),
  requestor_id: uuid().optional(),
  requested_by: uuid().optional(),
  requestedFrom: Joi.date().iso().optional(),
  requested_from: Joi.date().iso().optional(),
  requestedTo: Joi.date().iso().optional(),
  requested_to: Joi.date().iso().optional(),
  version: Joi.number().integer().min(1).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort_by: Joi.string()
    .valid("requested_at", "created_at", "updated_at", "status", "version", "applied_at")
    .optional(),
  sort_order: Joi.string().valid("ASC", "DESC", "asc", "desc").optional(),
});

const reportingQuerySchema = Joi.object({
  draftId: uuid().optional(),
  draft_id: uuid().optional(),
  master_plan_version_id: uuid().optional(),
  masterPlanVersionId: uuid().optional(),
}).or("draftId", "draft_id", "master_plan_version_id", "masterPlanVersionId");

const compensatingAmendmentSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().max(4000).optional().allow("", null),
  reason: Joi.string().trim().max(4000).optional().allow("", null),
  amendmentType: Joi.string().optional(),
  amendment_type: Joi.string().optional(),
  actions: Joi.array().items(actionSchema).min(1).optional(),
  metadata: Joi.object().unknown(true).optional(),
  effectiveMode: Joi.string().valid(...EFFECTIVE_MODE_VALUES).optional(),
  effective_mode: Joi.string().valid(...EFFECTIVE_MODE_VALUES).optional(),
  effectiveDate: Joi.date().iso().optional().allow(null),
  effective_date: Joi.date().iso().optional().allow(null),
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
  validateCreatePlanAmendment: validate(createPlanAmendmentSchema),
  validateReviewPlanAmendment: validate(reviewPlanAmendmentSchema),
  validateRejectPlanAmendment: validate(rejectPlanAmendmentSchema),
  validateListPlanAmendmentsQuery: validate(listPlanAmendmentsQuerySchema, "query"),
  validateReportingQuery: validate(reportingQuerySchema, "query"),
  validateCompensatingAmendment: validate(compensatingAmendmentSchema),
};
