"use strict";

const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");
const auditService = require("../auditService");

class ClinicalOrderEventContract {
  /**
   * Format standardized clinical order event payload.
   */
  createEventPayload({ event_type, domain, clinical_order_id, patient_id, previous_state, new_state, actor, metadata = {} }) {
    if (!event_type || !domain || !clinical_order_id || !patient_id) {
      const err = new Error("event_type, domain, clinical_order_id, and patient_id are required in event contract");
      err.status = 400;
      throw err;
    }

    return {
      event_type,
      domain: domain.toUpperCase(),
      clinical_order_id,
      patient_id,
      previous_state: previous_state || "UNKNOWN",
      new_state: new_state || "UNKNOWN",
      actor: actor || "SYSTEM",
      timestamp: new Date().toISOString(),
      metadata,
    };
  }

  /**
   * Dispatch standardized event across Timeline, Notification, and Audit.
   */
  async dispatchEvent(eventData, transaction = null) {
    const payload = this.createEventPayload(eventData);

    // 1. Emit Timeline Event
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(
          {
            patient_id: payload.patient_id,
            event_type: payload.event_type,
            title: `[${payload.domain}] ${payload.event_type}`,
            description: `Order #${payload.clinical_order_id.slice(0, 8)}: ${payload.previous_state} → ${payload.new_state}`,
            actor_id: payload.actor,
            resource_type: "ClinicalOrder",
            resource_id: payload.clinical_order_id,
            metadata: payload.metadata,
          },
          transaction
        );
      } catch (err) {
        console.error("Timeline dispatch failed:", err.message);
      }
    }

    // 2. Log Audit Event
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: payload.actor,
        action: payload.event_type,
        resourceType: "ClinicalOrder",
        resourceId: payload.clinical_order_id,
        details: payload,
      });
    }

    return payload;
  }
}

module.exports = new ClinicalOrderEventContract();
