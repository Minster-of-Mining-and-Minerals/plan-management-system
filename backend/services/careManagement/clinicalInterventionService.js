"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

const INTERVENTION_TYPES = ["MEDICATION", "INVESTIGATION", "COUNSELING", "DIET", "FOLLOW_UP", "OTHER"];

class ClinicalInterventionService {
  async addIntervention({ plan_id, goal_id = null, patient_id, intervention_type = "OTHER", description, scheduled_date }, createdBy) {
    if (!plan_id || !patient_id || !description || !createdBy) {
      throw Object.assign(new Error("plan_id, patient_id, description, and createdBy are required"), { status: 400 });
    }

    const type = intervention_type.toUpperCase();
    if (!INTERVENTION_TYPES.includes(type)) {
      throw Object.assign(new Error(`Invalid intervention_type. Must be one of: ${INTERVENTION_TYPES.join(", ")}`), { status: 400 });
    }

    const intervention = await db.ClinicalIntervention.create({
      intervention_id: uuidv4(),
      plan_id,
      goal_id: goal_id || null,
      patient_id,
      intervention_type: type,
      description: description.trim(),
      status: "PLANNED",
      scheduled_date: scheduled_date || null,
      created_by: createdBy,
    });

    return intervention.get({ plain: true });
  }

  async completeIntervention(interventionId, actorId) {
    const intervention = await db.ClinicalIntervention.findByPk(interventionId);
    if (!intervention) throw Object.assign(new Error("Intervention not found"), { status: 404 });

    await intervention.update({ status: "COMPLETED", completed_date: new Date() });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "INTERVENTION_COMPLETED",
      domain: "GENERAL",
      entity_type: "ClinicalIntervention",
      entity_id: interventionId,
      patient_id: intervention.patient_id,
      actor_id: actorId,
      action: "COMPLETE_INTERVENTION",
      new_value: { status: "COMPLETED" },
    });

    try {
      await timelineEventService.emit({
        patient_id: intervention.patient_id,
        event_type: "INTERVENTION_COMPLETED",
        title: `Intervention Completed: ${intervention.intervention_type}`,
        description: intervention.description,
        actor_id: actorId,
        resource_type: "ClinicalIntervention",
        resource_id: interventionId,
      });
    } catch (tErr) {
      console.error("Failed to emit intervention timeline event:", tErr.message);
    }

    return intervention.get({ plain: true });
  }

  async listInterventions(planId) {
    const interventions = await db.ClinicalIntervention.findAll({
      where: { plan_id: planId },
      order: [["created_at", "ASC"]],
    });
    return interventions.map((i) => i.get({ plain: true }));
  }
}

module.exports = new ClinicalInterventionService();
