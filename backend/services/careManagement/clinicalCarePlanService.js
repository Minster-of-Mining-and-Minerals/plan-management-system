"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

const VALID_STATUS = ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

class ClinicalCarePlanService {
  async createPlan({ patient_id, appointment_id, problem_id = null, title, priority = "MEDIUM", start_date, target_end_date, notes }, createdBy) {
    if (!patient_id || !title || !createdBy) {
      throw Object.assign(new Error("patient_id, title, and createdBy are required"), { status: 400 });
    }

    const t = await db.sequelize.transaction();
    try {
      const planId = uuidv4();
      const plan = await db.ClinicalCarePlan.create({
        plan_id: planId,
        care_plan_id: planId,
        appointment_id: appointment_id || null,
        patient_id,
        created_by_staff_id: createdBy || null,
        created_by: createdBy || null,
        title: title.trim(),
        status: "DRAFT",
        priority: (priority || "MEDIUM").toUpperCase(),
        goals: [],
        interventions: [],
        patient_instructions: notes || null,
        monitoring_schedule: [],
        risk_factors: [],
      }, { transaction: t });

      await clinicalAuditEngine.recordAuditEvent({
        event_type: "CARE_PLAN_CREATED",
        domain: "GENERAL",
        entity_type: "ClinicalCarePlan",
        entity_id: plan.care_plan_id,
        patient_id,
        actor_id: createdBy,
        action: "CREATE_CARE_PLAN",
        new_value: { title, priority, status: "DRAFT" },
      });

      try {
        await timelineEventService.emit({
          patient_id,
          event_type: "CARE_PLAN_CREATED",
          title: `Care Plan Created: ${title}`,
          description: `A new ${priority} priority care plan has been initiated.`,
          actor_id: createdBy,
          resource_type: "ClinicalCarePlan",
          resource_id: plan.care_plan_id,
        }, t);
      } catch (tErr) {
        console.error("Failed to emit care plan timeline event:", tErr.message);
      }

      await t.commit();
      const plain = plan.get({ plain: true });
      plain.plan_id = plain.care_plan_id;
      return plain;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async updatePlanStatus(planId, newStatus, actorId) {
    if (!VALID_STATUS.includes(newStatus.toUpperCase())) {
      throw Object.assign(new Error(`Invalid status '${newStatus}'`), { status: 400 });
    }

    const plan = await db.ClinicalCarePlan.findByPk(planId);
    if (!plan) throw Object.assign(new Error("Care plan not found"), { status: 404 });

    const previousStatus = plan.status;
    const updatePayload = { status: newStatus.toUpperCase() };
    if (newStatus.toUpperCase() === "COMPLETED" || newStatus.toUpperCase() === "CANCELLED") {
      updatePayload.actual_end_date = new Date().toISOString().split("T")[0];
    }

    await plan.update(updatePayload);

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "CARE_PLAN_STATUS_CHANGED",
      domain: "GENERAL",
      entity_type: "ClinicalCarePlan",
      entity_id: planId,
      patient_id: plan.patient_id,
      actor_id: actorId,
      action: `CARE_PLAN_${newStatus.toUpperCase()}`,
      previous_value: { status: previousStatus },
      new_value: { status: newStatus.toUpperCase() },
    });

    return plan.get({ plain: true });
  }

  async getPlansForPatient(patientId) {
    const plans = await db.ClinicalCarePlan.findAll({
      where: { patient_id: patientId },
      include: [
        { model: db.ClinicalGoal, as: "goalItems" },
        { model: db.CareTeamMember, as: "careTeam", include: [{ model: db.User, as: "clinician", attributes: ["user_id", "full_name"] }] },
      ],
      order: [["created_at", "DESC"]],
    });
    return plans.map((p) => p.get({ plain: true }));
  }

  async getFullPlan(planId) {
    const plan = await db.ClinicalCarePlan.findByPk(planId, {
      include: [
        { model: db.ClinicalGoal, as: "goalItems", include: [{ model: db.ClinicalIntervention, as: "interventions" }, { model: db.PatientOutcome, as: "outcomes" }] },
        { model: db.ClinicalIntervention, as: "interventionItems" },
        { model: db.CareTeamMember, as: "careTeam", include: [{ model: db.User, as: "clinician", attributes: ["user_id", "full_name"] }] },
        { model: db.ClinicalTask, as: "tasks" },
        { model: db.PatientOutcome, as: "outcomes" },
      ],
    });
    if (!plan) throw Object.assign(new Error("Care plan not found"), { status: 404 });
    return plan.get({ plain: true });
  }
}

module.exports = new ClinicalCarePlanService();
