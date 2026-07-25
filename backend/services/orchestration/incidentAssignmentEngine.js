"use strict";

const db = require("../../models");
const auditService = require("../auditService");

class IncidentAssignmentEngine {
  /**
   * Assign an incident to a user or role.
   */
  async assignIncident(incidentId, { assigned_to_user_id = null, assigned_owner_role = null }, actorUserId = null) {
    const incident = await db.ClinicalIncident.findByPk(incidentId);
    if (!incident) {
      const err = new Error("Incident not found");
      err.status = 404;
      throw err;
    }

    const updates = {};
    if (assigned_to_user_id) updates.assigned_to_user_id = assigned_to_user_id;
    if (assigned_owner_role) updates.assigned_owner_role = assigned_owner_role;

    await incident.update(updates);

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: "operations:incident_assign",
        resourceType: "INCIDENT",
        resourceId: incidentId,
        details: { assigned_to_user_id, assigned_owner_role },
      });
    }

    return incident;
  }

  /**
   * Auto-route incident based on department and type.
   */
  getSuggestedOwnerRole(incidentType, departmentId) {
    if (incidentType === "EMERGENCY_OVERLOAD" || incidentType === "SAFETY_INCIDENT") return "CHIEF_MEDICAL_OFFICER";
    if (departmentId === "LABORATORY" || incidentType === "LAB_BACKLOG") return "LABORATORY_SUPERVISOR";
    if (departmentId === "RADIOLOGY" || incidentType === "RADIOLOGY_BACKLOG") return "RADIOLOGY_SUPERVISOR";
    if (departmentId === "PHARMACY" || incidentType === "CRITICAL_MEDICATION_UNAVAILABLE") return "PHARMACY_SUPERVISOR";
    if (departmentId === "NURSING") return "NURSING_SUPERVISOR";
    return "OPERATIONS_MANAGER";
  }
}

module.exports = new IncidentAssignmentEngine();
