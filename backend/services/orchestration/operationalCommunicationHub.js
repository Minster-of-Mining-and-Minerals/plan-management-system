"use strict";

const db = require("../../models");
const notificationService = require("../notificationService");
const timelineEventService = require("../timelineEventService");
const auditService = require("../auditService");

class OperationalCommunicationHub {
  /**
   * Broadcast or send an operational communication message.
   */
  async sendMessage({ incident_id = null, recipient_role = "OPERATIONS_MANAGER", message_type = "UPDATE", content, channel = "HUB" }, senderId = null) {
    if (!content) {
      const err = new Error("Message content is required");
      err.status = 400;
      throw err;
    }

    const message = await db.ClinicalOperationalMessage.create({
      incident_id,
      sender_id: senderId,
      recipient_role,
      message_type,
      content,
      channel,
    });

    if (senderId) {
      await auditService.logAudit({
        actorUserId: senderId,
        action: "operations:communication_send",
        resourceType: "COMMUNICATION",
        resourceId: message.message_id,
        details: { recipient_role, message_type, channel },
      });
    }

    // Send push/in-app notification
    if (notificationService && typeof notificationService.sendNotification === "function") {
      try {
        await notificationService.sendNotification({
          type: "OPERATIONAL_COMMUNICATION",
          title: `[Ops Hub: ${message_type}] to ${recipient_role}`,
          message: content,
        });
      } catch (e) {
        // Silently capture notification error
      }
    }

    // Emit timeline event
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "OPERATIONAL_COMMUNICATION_SENT",
          title: `Operational Communication: ${message_type}`,
          notes: content,
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    return message;
  }

  /**
   * List operational messages.
   */
  async getMessages(filters = {}) {
    const where = {};
    if (filters.incident_id) where.incident_id = filters.incident_id;
    if (filters.recipient_role) where.recipient_role = filters.recipient_role;
    if (filters.message_type) where.message_type = filters.message_type;

    return await db.ClinicalOperationalMessage.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: 20,
    });
  }
}

module.exports = new OperationalCommunicationHub();
