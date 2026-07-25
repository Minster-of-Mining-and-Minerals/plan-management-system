"use strict";

const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");

class ClinicalIncidentEngine {
  /**
   * Create an operational incident.
   */
  async createIncident({ title, incident_type, severity = "MEDIUM", department_id = "HOSPITAL", assigned_owner_role = "OPERATIONS_MANAGER", source_entity_type = null, source_entity_id = null, root_cause = null }, actorUserId = null) {
    const incident = await db.ClinicalIncident.create({
      title,
      incident_type,
      severity,
      status: "OPEN",
      department_id,
      assigned_owner_role,
      source_entity_type,
      source_entity_id,
      root_cause,
    });

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: "operations:incident_create",
        resourceType: "INCIDENT",
        resourceId: incident.incident_id,
        details: { incident_type, severity, department_id },
      });
    }

    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "INCIDENT_CREATED",
          title: `Operational Incident Created: ${title}`,
          notes: `[${severity}] ${incident_type} in ${department_id}`,
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    if ((severity === "HIGH" || severity === "CRITICAL") && notificationService && typeof notificationService.sendNotification === "function") {
      try {
        await notificationService.sendNotification({
          type: "OPERATIONAL_INCIDENT_ALERT",
          title: `[${severity}] ${title}`,
          message: `Critical operational incident detected in ${department_id}`,
        });
      } catch (e) {
        // Silently capture notification error
      }
    }

    return incident;
  }

  /**
   * Update incident status (OPEN -> ACKNOWLEDGED -> IN_PROGRESS -> RESOLVED -> CLOSED).
   */
  async updateIncidentStatus(incidentId, status, { resolution_notes = null, root_cause = null } = {}, actorUserId = null) {
    const incident = await db.ClinicalIncident.findByPk(incidentId);
    if (!incident) {
      const err = new Error("Incident not found");
      err.status = 404;
      throw err;
    }

    const updates = { status };
    const now = new Date();

    if (status === "ACKNOWLEDGED" && !incident.acknowledged_at) updates.acknowledged_at = now;
    if (status === "RESOLVED") {
      updates.resolved_at = now;
      if (resolution_notes) updates.resolution_notes = resolution_notes;
      if (root_cause) updates.root_cause = root_cause;
    }
    if (status === "CLOSED") updates.closed_at = now;

    await incident.update(updates);

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: `operations:incident_${status.toLowerCase()}`,
        resourceType: "INCIDENT",
        resourceId: incidentId,
        details: { previous_status: incident.status, new_status: status },
      });
    }

    if (status === "RESOLVED" && timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "INCIDENT_RESOLVED",
          title: `Incident Resolved: ${incident.title}`,
          notes: resolution_notes || "Incident resolved successfully",
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    return incident;
  }

  /**
   * List incidents with optional filters.
   */
  async getIncidents(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.department_id) where.department_id = filters.department_id;
    if (filters.incident_type) where.incident_type = filters.incident_type;

    return await db.ClinicalIncident.findAll({
      where,
      order: [["created_at", "DESC"]],
    });
  }
}

module.exports = new ClinicalIncidentEngine();
