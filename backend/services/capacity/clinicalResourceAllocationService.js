"use strict";

const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");

class ClinicalResourceAllocationService {
  /**
   * Allocate a resource (STAFF, ROOM, EQUIPMENT) to a target entity (DEPARTMENT, ENCOUNTER, CLINICAL_ORDER).
   */
  async allocateResource({ resource_type, resource_id, assigned_to_type, assigned_to_id, priority = "ROUTINE", notes = null, is_emergency = false }, actorUserId) {
    if (!resource_type || !resource_id) {
      const err = new Error("resource_type and resource_id are required for allocation");
      err.status = 400;
      throw err;
    }

    // 1. Conflict detection
    const existingActiveAssignment = await db.ClinicalResourceAssignment.findOne({
      where: {
        resource_type,
        resource_id,
        status: "ACTIVE",
      },
    });

    if (existingActiveAssignment && !is_emergency) {
      const err = new Error(`Conflict detected: Resource ${resource_id} of type ${resource_type} is currently allocated.`);
      err.status = 409;
      throw err;
    }

    // If emergency override, release existing assignment
    if (existingActiveAssignment && is_emergency) {
      await existingActiveAssignment.update({ status: "OVERRIDDEN", end_time: new Date() });
    }

    // 2. Create new assignment
    const assignment = await db.ClinicalResourceAssignment.create({
      resource_type,
      resource_id,
      assigned_to_type,
      assigned_to_id,
      priority: is_emergency ? "STAT" : priority,
      notes,
      status: "ACTIVE",
      start_time: new Date(),
    });

    // Update entity status if ROOM or EQUIPMENT
    if (resource_type === "ROOM" && db.ClinicalRoom) {
      await db.ClinicalRoom.update({ status: "OCCUPIED" }, { where: { room_id: resource_id } });
    } else if (resource_type === "EQUIPMENT" && db.ClinicalEquipment) {
      await db.ClinicalEquipment.update({ status: "IN_USE" }, { where: { equipment_id: resource_id } });
    }

    // 3. Audit trail
    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: is_emergency ? "operations:resource_emergency_override" : "operations:resource_allocate",
        resourceType: resource_type,
        resourceId: resource_id,
        details: { assigned_to_type, assigned_to_id, priority },
      });
    }

    // 4. Timeline Event emission
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "RESOURCE_REALLOCATED",
          title: `Resource Allocated: ${resource_type}`,
          notes: `Allocated ${resource_type} to ${assigned_to_type} (${priority})`,
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    // 5. Notification if emergency
    if (is_emergency && notificationService && typeof notificationService.sendNotification === "function") {
      try {
        await notificationService.sendNotification({
          type: "EMERGENCY_REASSIGNMENT",
          title: "Emergency Resource Reassignment",
          message: `Resource ${resource_type} was forcibly reassigned via Emergency Override`,
        });
      } catch (e) {
        // Silently capture notification error
      }
    }

    return assignment;
  }

  /**
   * Release or complete an active resource assignment.
   */
  async releaseAssignment(assignmentId, actorUserId) {
    const assignment = await db.ClinicalResourceAssignment.findByPk(assignmentId);
    if (!assignment) {
      const err = new Error("Resource assignment not found");
      err.status = 404;
      throw err;
    }

    await assignment.update({ status: "RELEASED", end_time: new Date() });

    if (assignment.resource_type === "ROOM" && db.ClinicalRoom) {
      await db.ClinicalRoom.update({ status: "AVAILABLE" }, { where: { room_id: assignment.resource_id } });
    } else if (assignment.resource_type === "EQUIPMENT" && db.ClinicalEquipment) {
      await db.ClinicalEquipment.update({ status: "AVAILABLE" }, { where: { equipment_id: assignment.resource_id } });
    }

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: "operations:resource_release",
        resourceType: assignment.resource_type,
        resourceId: assignment.resource_id,
        details: { assignment_id: assignmentId },
      });
    }

    return assignment;
  }

  /**
   * List active assignments.
   */
  async getActiveAssignments(filters = {}) {
    const where = { status: "ACTIVE" };
    if (filters.resource_type) where.resource_type = filters.resource_type;
    return await db.ClinicalResourceAssignment.findAll({ where, order: [["created_at", "DESC"]] });
  }
}

module.exports = new ClinicalResourceAllocationService();
