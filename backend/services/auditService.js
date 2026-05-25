"use strict";

const { AuditLog } = require("../models");
const { v4: uuidv4 } = require("uuid");

async function logAudit({
  actorUserId,
  action,
  resourceType,
  resourceId,
  details,
  ipAddress,
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
    console.error("Audit log failed:", err.message);
  }
}

module.exports = { logAudit };
