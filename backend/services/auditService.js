"use strict";

const { AuditLog } = require("../models");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

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

module.exports = { logAudit, auditContextFromReq };
