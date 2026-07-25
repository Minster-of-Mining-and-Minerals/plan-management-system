"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

class PatientOutcomeService {
  computeProgressPercentage(baseline, target, current) {
    const b = parseFloat(baseline);
    const t = parseFloat(target);
    const c = parseFloat(current);
    if (isNaN(b) || isNaN(t) || isNaN(c) || t === b) return null;
    // Use absolute distance so both directions compute correctly
    const totalRange = Math.abs(t - b);
    const progress = Math.abs(c - b);
    const pct = (progress / totalRange) * 100;
    return Math.min(Math.max(parseFloat(pct.toFixed(2)), 0), 100);
  }

  _computeStatus(baseline, target, current) {
    const b = parseFloat(baseline);
    const t = parseFloat(target);
    const c = parseFloat(current);
    if (isNaN(b) || isNaN(t) || isNaN(c) || t === b) return "STABLE";

    // Determine if improvement means going up or going down
    const targetIsHigher = t > b; // e.g. increase step count
    const targetIsLower = t < b;  // e.g. reduce HbA1c, BP, weight

    if (targetIsHigher) {
      if (c >= t) return "ACHIEVED";
      if (c > b) return "IMPROVING";
      if (c < b) return "WORSENING";
    } else {
      // lower is better
      if (c <= t) return "ACHIEVED";
      if (c < b) return "IMPROVING";
      if (c > b) return "WORSENING";
    }
    return "STABLE";
  }

  async recordOutcome({ plan_id, goal_id = null, patient_id, outcome_name, baseline_value, target_value, current_value, unit, notes }, recordedBy) {
    if (!plan_id || !patient_id || !outcome_name || !recordedBy) {
      throw Object.assign(new Error("plan_id, patient_id, outcome_name, and recordedBy are required"), { status: 400 });
    }

    const progress = this.computeProgressPercentage(baseline_value, target_value, current_value);
    const status = this._computeStatus(baseline_value, target_value, current_value);

    const outcome = await db.PatientOutcome.create({
      outcome_id: uuidv4(),
      plan_id,
      goal_id: goal_id || null,
      patient_id,
      outcome_name: outcome_name.trim(),
      baseline_value: baseline_value !== undefined ? parseFloat(baseline_value) : null,
      target_value: target_value !== undefined ? parseFloat(target_value) : null,
      current_value: current_value !== undefined ? parseFloat(current_value) : null,
      unit: unit || null,
      progress_percentage: progress,
      status,
      measured_at: new Date(),
      recorded_by: recordedBy,
      notes: notes || null,
    });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "OUTCOME_RECORDED",
      domain: "GENERAL",
      entity_type: "PatientOutcome",
      entity_id: outcome.outcome_id,
      patient_id,
      actor_id: recordedBy,
      action: "RECORD_OUTCOME",
      new_value: { outcome_name, current_value, status, progress_percentage: progress },
    });

    try {
      await timelineEventService.emit({
        patient_id,
        event_type: "OUTCOME_RECORDED",
        title: `Outcome Recorded: ${outcome_name}`,
        description: `${status} — Current: ${current_value ?? "N/A"} ${unit || ""}, Target: ${target_value ?? "N/A"} ${unit || ""}.${progress !== null ? ` Progress: ${progress}%.` : ""}`,
        actor_id: recordedBy,
        resource_type: "PatientOutcome",
        resource_id: outcome.outcome_id,
      });
    } catch (tErr) {
      console.error("Failed to emit outcome timeline event:", tErr.message);
    }

    return outcome.get({ plain: true });
  }

  async getOutcomesForPlan(planId) {
    const outcomes = await db.PatientOutcome.findAll({
      where: { plan_id: planId },
      include: [{ model: db.User, as: "recorder", attributes: ["user_id", "full_name"] }],
      order: [["measured_at", "DESC"]],
    });
    return outcomes.map((o) => o.get({ plain: true }));
  }
}

module.exports = new PatientOutcomeService();
