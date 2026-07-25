"use strict";

const carePlanService = require("../../services/careManagement/clinicalCarePlanService");
const goalService = require("../../services/careManagement/clinicalGoalService");
const interventionService = require("../../services/careManagement/clinicalInterventionService");
const careTeamService = require("../../services/careManagement/careTeamService");
const taskService = require("../../services/careManagement/clinicalTaskService");
const outcomeService = require("../../services/careManagement/patientOutcomeService");

class CareManagementController {
  // ── Care Plans ──────────────────────────────────────────────
  async createCarePlan(req, res, next) {
    try {
      const createdBy = req.user.user_id;
      const plan = await carePlanService.createPlan(req.body, createdBy);
      return res.status(201).json({ success: true, data: plan });
    } catch (err) { next(err); }
  }

  async updateCarePlanStatus(req, res, next) {
    try {
      const { planId } = req.params;
      const { status } = req.body;
      const plan = await carePlanService.updatePlanStatus(planId, status, req.user.user_id);
      return res.json({ success: true, data: plan });
    } catch (err) { next(err); }
  }

  async getPatientPlans(req, res, next) {
    try {
      const { patientId } = req.params;
      const plans = await carePlanService.getPlansForPatient(patientId);
      return res.json({ success: true, data: plans });
    } catch (err) { next(err); }
  }

  async getFullPlan(req, res, next) {
    try {
      const { planId } = req.params;
      const plan = await carePlanService.getFullPlan(planId);
      return res.json({ success: true, data: plan });
    } catch (err) { next(err); }
  }

  // ── Goals ────────────────────────────────────────────────────
  async addGoal(req, res, next) {
    try {
      const goal = await goalService.addGoal(req.body, req.user.user_id);
      return res.status(201).json({ success: true, data: goal });
    } catch (err) { next(err); }
  }

  async updateGoalProgress(req, res, next) {
    try {
      const { goalId } = req.params;
      const { current_value } = req.body;
      const goal = await goalService.updateGoalProgress(goalId, current_value, req.user.user_id);
      return res.json({ success: true, data: goal });
    } catch (err) { next(err); }
  }

  async listGoals(req, res, next) {
    try {
      const { planId } = req.params;
      const { status } = req.query;
      const goals = await goalService.listGoals(planId, status);
      return res.json({ success: true, data: goals });
    } catch (err) { next(err); }
  }

  // ── Interventions ────────────────────────────────────────────
  async addIntervention(req, res, next) {
    try {
      const intervention = await interventionService.addIntervention(req.body, req.user.user_id);
      return res.status(201).json({ success: true, data: intervention });
    } catch (err) { next(err); }
  }

  async completeIntervention(req, res, next) {
    try {
      const { interventionId } = req.params;
      const intervention = await interventionService.completeIntervention(interventionId, req.user.user_id);
      return res.json({ success: true, data: intervention });
    } catch (err) { next(err); }
  }

  async listInterventions(req, res, next) {
    try {
      const { planId } = req.params;
      const interventions = await interventionService.listInterventions(planId);
      return res.json({ success: true, data: interventions });
    } catch (err) { next(err); }
  }

  // ── Care Team ────────────────────────────────────────────────
  async addTeamMember(req, res, next) {
    try {
      const member = await careTeamService.addTeamMember(req.body, req.user.user_id);
      return res.status(201).json({ success: true, data: member });
    } catch (err) { next(err); }
  }

  async removeTeamMember(req, res, next) {
    try {
      const { memberId } = req.params;
      const result = await careTeamService.removeTeamMember(memberId);
      return res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async getTeamForPlan(req, res, next) {
    try {
      const { planId } = req.params;
      const team = await careTeamService.getTeamForPlan(planId);
      return res.json({ success: true, data: team });
    } catch (err) { next(err); }
  }

  // ── Tasks ────────────────────────────────────────────────────
  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.body, req.user.user_id);
      return res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
  }

  async acceptTask(req, res, next) {
    try {
      const task = await taskService.acceptTask(req.params.taskId, req.user.user_id);
      return res.json({ success: true, data: task });
    } catch (err) { next(err); }
  }

  async completeTask(req, res, next) {
    try {
      const task = await taskService.completeTask(req.params.taskId, req.user.user_id);
      return res.json({ success: true, data: task });
    } catch (err) { next(err); }
  }

  async getPatientTasks(req, res, next) {
    try {
      const { patientId } = req.params;
      const { status } = req.query;
      const tasks = await taskService.getTasksForPatient(patientId, status);
      return res.json({ success: true, data: tasks });
    } catch (err) { next(err); }
  }

  // ── Outcomes ─────────────────────────────────────────────────
  async recordOutcome(req, res, next) {
    try {
      const outcome = await outcomeService.recordOutcome(req.body, req.user.user_id);
      return res.status(201).json({ success: true, data: outcome });
    } catch (err) { next(err); }
  }

  async getPlanOutcomes(req, res, next) {
    try {
      const { planId } = req.params;
      const outcomes = await outcomeService.getOutcomesForPlan(planId);
      return res.json({ success: true, data: outcomes });
    } catch (err) { next(err); }
  }
}

module.exports = new CareManagementController();
