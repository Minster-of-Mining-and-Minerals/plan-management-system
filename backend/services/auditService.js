"use strict";

const { AuditLog } = require("../models");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

/**
 * Build common audit context from an Express request.
 */
function auditContextFromReq(req, extra = {}) {
  return {
    actorUserId: req?.user?.user_id || null,
    ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || null,
    details: {
      userAgent: req?.get?.("user-agent") || req?.headers?.["user-agent"] || null,
      ...extra,
    },
  };
}

async function logAudit({
  actorUserId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
  throwOnError = false,
}) {
  try {
    await AuditLog.create({
      audit_id: uuidv4(),
      actor_user_id: actorUserId || null,
      action,
      resource_type: resourceType,
      resource_id: resourceId || null,
      details: details || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    logger.error({ err: err.message, action, resourceType }, "audit_log_failed");
    if (throwOnError) throw err;
  }
}

/**
 * Standardized audit writer — preferred for new call sites.
 * Ensures actor, IP, UA, module, outcome, and optional before/after live in details.
 */
async function recordAudit(req, {
  action,
  resourceType,
  resourceId = null,
  module = null,
  previous = null,
  next = null,
  outcome = "success",
  extra = {},
  throwOnError = false,
} = {}) {
  const ctx = auditContextFromReq(req, {
    module: module || resourceType,
    outcome,
    ...(previous !== null ? { previous } : {}),
    ...(next !== null ? { next } : {}),
    ...extra,
  });
  await logAudit({
    actorUserId: ctx.actorUserId,
    action,
    resourceType,
    resourceId,
    details: ctx.details,
    ipAddress: ctx.ipAddress,
    throwOnError,
  });
}

module.exports = { logAudit, auditContextFromReq, recordAudit };
