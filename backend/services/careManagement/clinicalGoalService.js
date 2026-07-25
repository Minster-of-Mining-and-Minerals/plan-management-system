"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

class ClinicalGoalService {
  async addGoal({ plan_id, patient_id, description, baseline_value, target_value, unit, target_date }, createdBy) {
    if (!plan_id || !patient_id || !description || !createdBy) {
      throw Object.assign(new Error("plan_id, patient_id, description, and createdBy are required"), { status: 400 });
    }

    const goal = await db.ClinicalGoal.create({
      goal_id: uuidv4(),
      plan_id,
      patient_id,
      description: description.trim(),
      status: "PENDING",
      baseline_value: baseline_value !== undefined ? parseFloat(baseline_value) : null,
      current_value: baseline_value !== undefined ? parseFloat(baseline_value) : null,
      target_value: target_value !== undefined ? parseFloat(target_value) : null,
      unit: unit || null,
      target_date: target_date || null,
      created_by: createdBy,
    });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "CLINICAL_GOAL_ADDED",
      domain: "GENERAL",
      entity_type: "ClinicalGoal",
      entity_id: goal.goal_id,
      patient_id,
      actor_id: createdBy,
      action: "ADD_GOAL",
      new_value: { description, baseline_value, target_value, unit },
    });

    return goal.get({ plain: true });
  }

  async updateGoalProgress(goalId, currentValue, actorId) {
    const goal = await db.ClinicalGoal.findByPk(goalId);
    if (!goal) throw Object.assign(new Error("Clinical goal not found"), { status: 404 });

    const baseline = parseFloat(goal.baseline_value || 0);
    const target = parseFloat(goal.target_value || 0);
    const current = parseFloat(currentValue);

    let newStatus = "IN_PROGRESS";
    if (target !== baseline) {
      const progressRatio = (current - baseline) / (target - baseline);
      if (progressRatio >= 1.0) newStatus = "ACHIEVED";
    }

    await goal.update({ current_value: current, status: newStatus });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "GOAL_UPDATED",
      domain: "GENERAL",
      entity_type: "ClinicalGoal",
      entity_id: goalId,
      patient_id: goal.patient_id,
      actor_id: actorId,
      action: "UPDATE_GOAL_PROGRESS",
      previous_value: { current_value: goal.current_value },
      new_value: { current_value: current, status: newStatus },
    });

    try {
      await timelineEventService.emit({
        patient_id: goal.patient_id,
        event_type: "GOAL_UPDATED",
        title: `Goal Progress Updated`,
        description: `Goal "${goal.description}" updated: current value is ${current} ${goal.unit || ""}. Status: ${newStatus}.`,
        actor_id: actorId,
        resource_type: "ClinicalGoal",
        resource_id: goalId,
      });
    } catch (tErr) {
      console.error("Failed to emit goal update timeline event:", tErr.message);
    }

    return goal.get({ plain: true });
  }

  async listGoals(planId, status = null) {
    const where = { plan_id: planId };
    if (status) where.status = status.toUpperCase();
    const goals = await db.ClinicalGoal.findAll({ where, order: [["created_at", "ASC"]] });
    return goals.map((g) => g.get({ plain: true }));
  }
}

module.exports = new ClinicalGoalService();
