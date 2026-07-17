"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const timelineEventService = require("./timelineEventService");
const { logAudit } = require("./auditService");
const notificationService = require("./notificationService");
const { userHasPermission } = require("./userPermissionService");

class ClinicalResourceService {
  /**
   * Enforce permission constraints.
   */
  async assertPermission(userId, resource, action) {
    const has = await userHasPermission(userId, resource, action);
    if (!has) {
      const err = new Error(`Permission denied: Cannot perform '${action}' on '${resource}'`);
      err.status = 403;
      throw err;
    }
  }

  /**
   * Log an audit trail.
   */
  async audit(actorId, action, resourceType, resourceId, details, ipAddress = null) {
    await logAudit({
      actorUserId: actorId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
    });
  }

  /**
   * Emit an event to the centralized timeline.
   */
  async emitTimeline(eventData, transaction) {
    return timelineEventService.emit(eventData, transaction);
  }

  /**
   * Link clinical attachments to a resource.
   */
  async linkAttachments(attachmentIds, { resourceType, resourceId, patientId }, transaction) {
    if (!Array.isArray(attachmentIds) || !attachmentIds.length) return;
    try {
      const { linkAttachmentsToResource } = require("./attachmentAccessService");
      await linkAttachmentsToResource(attachmentIds, {
        resourceType,
        resourceId,
        patientId,
      }, transaction);
    } catch (e) {
      console.warn("ClinicalResourceService.linkAttachments non-fatal warning:", e.message);
    }
  }

  /**
   * Notify staff or patient.
   */
  async sendNotification(recipientId, { title, message, category = "general", relatedType = null, relatedId = null }) {
    await notificationService.notifyInternalUser(recipientId, {
      title,
      message,
      category,
      relatedType,
      relatedId,
    });
  }

  /**
   * Generate/Route workflow tasks.
   */
  async createWorkflowTask({ appointmentId, patientId, assigneeStaffId, assignedByStaffId, taskType, resourceType, resourceId }, transaction) {
    const task = await db.WorkflowTask.create(
      {
        task_id: uuidv4(),
        appointment_id: appointmentId,
        patient_id: patientId,
        assignee_staff_id: assigneeStaffId,
        assigned_by_staff_id: assignedByStaffId,
        status: "pending",
        task_type: taskType,
        resource_type: resourceType,
        resource_id: resourceId,
      },
      { transaction }
    );

    return task.get({ plain: true });
  }

  /**
   * Close workflow tasks for a specific assignee.
   */
  async completeWorkflowTask(appointmentId, staffId, transaction) {
    await db.WorkflowTask.update(
      { status: "done" },
      {
        where: {
          appointment_id: appointmentId,
          assignee_staff_id: staffId,
          status: "pending",
        },
        transaction,
      }
    );
  }
}

module.exports = ClinicalResourceService;
