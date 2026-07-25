"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class ClinicalAuditEngine {
  /**
   * Record standardized clinical audit event.
   */
  async recordAuditEvent({
    event_type,
    domain = "GENERAL",
    entity_type,
    entity_id,
    patient_id,
    actor_id,
    actor_role = "CLINICIAN",
    action,
    previous_value = null,
    new_value = null,
    reason = null,
    metadata = {},
  }) {
    if (!event_type || !entity_type || !entity_id || !patient_id || !actor_id || !action) {
      const err = new Error("event_type, entity_type, entity_id, patient_id, actor_id, and action are required");
      err.status = 400;
      throw err;
    }

    const auditEvent = await db.ClinicalAuditEvent.create({
      id: uuidv4(),
      event_type,
      domain: domain.toUpperCase(),
      entity_type,
      entity_id,
      patient_id,
      actor_id,
      actor_role,
      action,
      previous_value_json: previous_value,
      new_value_json: new_value,
      reason: reason || null,
      timestamp: new Date(),
      metadata_json: metadata,
    });

    return auditEvent.get({ plain: true });
  }

  /**
   * Search standardized audit trail events with filtering.
   */
  async getAuditTrail(filters = {}) {
    const where = {};
    if (filters.patient_id) where.patient_id = filters.patient_id;
    if (filters.domain) where.domain = filters.domain.toUpperCase();
    if (filters.entity_type) where.entity_type = filters.entity_type;
    if (filters.entity_id) where.entity_id = filters.entity_id;

    const events = await db.ClinicalAuditEvent.findAll({
      where,
      include: [
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "actor", attributes: ["user_id", "full_name"] },
      ],
      order: [["timestamp", "DESC"]],
      limit: filters.limit ? Number(filters.limit) : 100,
    });

    return events.map((e) => e.get({ plain: true }));
  }
}

module.exports = new ClinicalAuditEngine();
