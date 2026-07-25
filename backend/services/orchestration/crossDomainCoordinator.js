"use strict";

const db = require("../../models");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");

class CrossDomainCoordinator {
  /**
   * Evaluate downstream cross-domain impact when a department or order encounters delay.
   */
  async evaluateCrossDomainImpact({ source_department = "LABORATORY", order_id = null, patient_id = null, delay_minutes = 45 }, actorUserId = null) {
    const downstreamActions = [];

    if (source_department === "LABORATORY") {
      downstreamActions.push({
        affected_domain: "RADIOLOGY",
        action: "Reschedule Radiology Contrast Study",
        reason: "Laboratory blood test results delayed by 45 minutes",
        adjustment_minutes: delay_minutes,
      });
      downstreamActions.push({
        affected_domain: "PHARMACY",
        action: "Hold Controlled Dose Dispensing",
        reason: "Awaiting baseline lab verification",
        adjustment_minutes: delay_minutes,
      });
      downstreamActions.push({
        affected_domain: "CARE_PLAN",
        action: "Adjust Care Goal Intervention Timeline",
        reason: "Lab observation pending",
        adjustment_minutes: delay_minutes,
      });
    } else if (source_department === "RADIOLOGY") {
      downstreamActions.push({
        affected_domain: "CONSULTATION",
        action: "Postpone Consultation Review",
        reason: "Diagnostic imaging report pending verification",
        adjustment_minutes: delay_minutes,
      });
    } else if (source_department === "PHARMACY") {
      downstreamActions.push({
        affected_domain: "NURSING",
        action: "Delay Medication Administration Schedule",
        reason: "Prescription fulfillment in progress",
        adjustment_minutes: delay_minutes,
      });
    }

    // Emit timeline event for patient if patient_id present
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "CROSS_DOMAIN_DELAY_COORDINATED",
          title: `Cross-Domain Coordination: ${source_department} Delay`,
          notes: `${source_department} delay of ${delay_minutes}m coordinated across ${downstreamActions.length} downstream domains`,
          domain: "CLINICAL",
          patient_id,
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    // Notify assigned clinician
    if (notificationService && typeof notificationService.sendNotification === "function") {
      try {
        await notificationService.sendNotification({
          type: "CROSS_DOMAIN_IMPACT_ALERT",
          title: `Cross-Domain Delay Notification`,
          message: `Downstream impact evaluated for ${source_department} delay (${delay_minutes}m)`,
        });
      } catch (e) {
        // Silently capture notification error
      }
    }

    return {
      source_department,
      order_id,
      patient_id,
      delay_minutes,
      downstream_impact_count: downstreamActions.length,
      downstream_actions: downstreamActions,
    };
  }
}

module.exports = new CrossDomainCoordinator();
