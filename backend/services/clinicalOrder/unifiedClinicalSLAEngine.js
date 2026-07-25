"use strict";

const notificationService = require("../notificationService");

const SLA_DURATION_MINUTES = {
  STAT: 30,
  URGENT: 60,
  ROUTINE: 240,
};

class UnifiedClinicalSLAEngine {
  /**
   * Calculate expected SLA completion time and status.
   */
  evaluateSLA(createdDate, priority = "ROUTINE", domain = "GENERAL") {
    const created = new Date(createdDate || Date.now());
    const prioKey = (priority || "ROUTINE").toUpperCase();
    const durationMins = SLA_DURATION_MINUTES[prioKey] || SLA_DURATION_MINUTES.ROUTINE;

    const expectedCompletionTime = new Date(created.getTime() + durationMins * 60 * 1000);
    const now = new Date();
    const elapsedMinutes = Math.max(0, Math.round((now.getTime() - created.getTime()) / (1000 * 60)));

    const warningMinutes = Math.round(durationMins * 0.75);

    let status = "SLA_OK";
    if (elapsedMinutes >= durationMins) {
      status = "SLA_BREACHED";
    } else if (elapsedMinutes >= warningMinutes) {
      status = "SLA_WARNING";
    }

    return {
      domain,
      priority: prioKey,
      created_at: created,
      expected_completion_time: expectedCompletionTime,
      elapsed_minutes: elapsedMinutes,
      allowed_duration_minutes: durationMins,
      status,
    };
  }

  /**
   * Check for SLA breach and dispatch escalation notification if breached.
   */
  async checkAndEscalateSLA(clinicalOrder, staffId) {
    if (!clinicalOrder) return null;

    const slaInfo = this.evaluateSLA(clinicalOrder.created_at, clinicalOrder.priority, clinicalOrder.order_type);

    if (slaInfo.status === "SLA_BREACHED" && notificationService && typeof notificationService.notifyUser === "function") {
      try {
        await notificationService.notifyUser({
          user_id: staffId || clinicalOrder.ordering_doctor_id,
          header_title: `🚨 SLA BREACH ESCALATION: ${clinicalOrder.order_type} Order #${clinicalOrder.order_id.slice(0, 8)}`,
          content: `Clinical order #${clinicalOrder.order_id.slice(0, 8)} (${clinicalOrder.order_type}) has exceeded its SLA target of ${slaInfo.allowed_duration_minutes} minutes! Elapsed: ${slaInfo.elapsed_minutes} minutes.`,
          priority: "HIGH",
        });
      } catch (err) {
        console.error("SLA escalation notification failed:", err.message);
      }
    }

    return slaInfo;
  }
}

module.exports = new UnifiedClinicalSLAEngine();
