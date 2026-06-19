"use strict";

const Joi = require("joi");
const { validateMiddleware, requiredUuid, optionalUuid } = require("../helpers/joiFieldHelpers");
const { ENTITY_TYPES } = require("./issueCategoryValidator");

const ISSUE_STATUSES = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "resolved",
  "closed",
];

const idParamSchema = Joi.object({
  id: requiredUuid("id"),
});

const createIssueSchema = Joi.object({
  issue_category_id: requiredUuid("issue_category_id"),
  form_config_container_id: requiredUuid("form_config_container_id"),
  issue_priority_id: requiredUuid("issue_priority_id"),
  title: Joi.string().trim().min(3).max(255).required(),
  entity_type: Joi.string()
    .trim()
    .lowercase()
    .valid(...ENTITY_TYPES)
    .required(),
  entity_id: requiredUuid("entity_id"),
  current_value: Joi.string().trim().allow("", null).optional(),
  suggested_value: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().min(3).required(),
  justification: Joi.string().trim().min(3).required(),
  form_data: Joi.object().unknown(true).optional(),
  form_responses: Joi.object().unknown(true).required(),
  attachment_path: Joi.string().trim().max(500).allow("", null).optional(),
  assigned_to: optionalUuid("assigned_to"),
  attachment_ids: Joi.array().items(requiredUuid("attachment_id")).optional(),
});

const updateIssueSchema = Joi.object({
  issue_category_id: optionalUuid("issue_category_id"),
  issue_priority_id: optionalUuid("issue_priority_id"),
  title: Joi.string().trim().min(3).max(255).optional(),
  entity_type: Joi.string()
    .trim()
    .lowercase()
    .valid(...ENTITY_TYPES)
    .optional(),
  entity_id: optionalUuid("entity_id"),
  current_value: Joi.string().trim().allow("", null).optional(),
  suggested_value: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().min(3).optional(),
  justification: Joi.string().trim().min(3).optional(),
  form_data: Joi.object().unknown(true).optional(),
  attachment_path: Joi.string().trim().max(500).allow("", null).optional(),
  assigned_to: optionalUuid("assigned_to"),
}).min(1);

const listIssuesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow("").optional(),
  status: Joi.string()
    .valid(...ISSUE_STATUSES)
    .optional(),
  issue_category_id: optionalUuid("issue_category_id"),
  issue_priority_id: optionalUuid("issue_priority_id"),
  raised_by: optionalUuid("raised_by"),
  assigned_to: optionalUuid("assigned_to"),
  entity_type: Joi.string().trim().lowercase().optional(),
  entity_id: optionalUuid("entity_id"),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  sort_by: Joi.string()
    .valid("created_at", "updated_at", "issue_number", "title", "status")
    .default("created_at"),
  sort_order: Joi.string().valid("ASC", "DESC", "asc", "desc").default("DESC"),
});

const dashboardQuerySchema = Joi.object({
  issue_category_id: optionalUuid("issue_category_id"),
  issue_priority_id: optionalUuid("issue_priority_id"),
  raised_by: optionalUuid("raised_by"),
  assigned_to: optionalUuid("assigned_to"),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
});

const acceptIssueSchema = Joi.object({
  review_notes: Joi.string().trim().allow("", null).optional(),
});

const rejectIssueSchema = Joi.object({
  rejection_reason: Joi.string().trim().min(3).required(),
});

const resolveIssueSchema = Joi.object({
  resolution_notes: Joi.string().trim().allow("", null).optional(),
});

module.exports = {
  validateIdParam: validateMiddleware(idParamSchema, "params"),
  validateCreateIssue: validateMiddleware(createIssueSchema),
  validateUpdateIssue: validateMiddleware(updateIssueSchema),
  validateListIssuesQuery: validateMiddleware(listIssuesQuerySchema, "query"),
  validateDashboardQuery: validateMiddleware(dashboardQuerySchema, "query"),
  validateAcceptIssue: validateMiddleware(acceptIssueSchema),
  validateRejectIssue: validateMiddleware(rejectIssueSchema),
  validateResolveIssue: validateMiddleware(resolveIssueSchema),
  ISSUE_STATUSES,
  ENTITY_TYPES,
};
