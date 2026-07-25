"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

class ClinicalProblemService {
  async addProblem({
    patient_id,
    problem_code = null,
    problem_name,
    status = "ACTIVE",
    severity = "MEDIUM",
    onset_date = null,
    notes = null,
    encounter_id = null,
  }, createdBy) {
    if (!patient_id || !problem_name || !createdBy) {
      throw Object.assign(new Error("patient_id, problem_name, and createdBy are required"), { status: 400 });
    }

    const t = await db.sequelize.transaction();
    try {
      const problem = await db.ClinicalProblem.create(
        {
          problem_id: uuidv4(),
          patient_id,
          problem_code,
          problem_name: problem_name.trim(),
          status: status.toUpperCase(),
          severity: severity.toUpperCase(),
          onset_date: onset_date || null,
          notes: notes || null,
          encounter_id: encounter_id || null,
          created_by: createdBy,
        },
        { transaction: t }
      );

      await clinicalAuditEngine.recordAuditEvent({
        event_type: "CLINICAL_PROBLEM_ADDED",
        domain: "GENERAL",
        entity_type: "ClinicalProblem",
        entity_id: problem.problem_id,
        patient_id,
        actor_id: createdBy,
        action: "ADD_PROBLEM",
        new_value: { problem_name, status, severity },
      });

      try {
        await timelineEventService.emit({
          patient_id,
          event_type: "CLINICAL_PROBLEM_ADDED",
          title: `Problem Added: ${problem_name}`,
          description: `${severity} severity problem "${problem_name}" added to problem list.`,
          actor_id: createdBy,
          resource_type: "ClinicalProblem",
          resource_id: problem.problem_id,
        }, t);
      } catch (tErr) {
        console.error("Failed to emit problem list timeline event:", tErr.message);
      }

      await t.commit();
      return problem.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async resolveProblem(problemId, userId) {
    const problem = await db.ClinicalProblem.findByPk(problemId);
    if (!problem) throw Object.assign(new Error("Clinical problem not found"), { status: 404 });

    await problem.update({ status: "RESOLVED", resolved_date: new Date() });

    await clinicalAuditEngine.recordAuditEvent({
      event_type: "CLINICAL_PROBLEM_RESOLVED",
      domain: "GENERAL",
      entity_type: "ClinicalProblem",
      entity_id: problemId,
      patient_id: problem.patient_id,
      actor_id: userId,
      action: "RESOLVE_PROBLEM",
      previous_value: { status: "ACTIVE" },
      new_value: { status: "RESOLVED" },
    });

    return problem.get({ plain: true });
  }

  async listProblems(patientId, statusFilter = null) {
    const where = { patient_id: patientId };
    if (statusFilter) where.status = statusFilter.toUpperCase();

    const problems = await db.ClinicalProblem.findAll({
      where,
      include: [{ model: db.User, as: "creator", attributes: ["user_id", "full_name"] }],
      order: [["created_at", "DESC"]],
    });

    return problems.map((p) => p.get({ plain: true }));
  }
}

module.exports = new ClinicalProblemService();
