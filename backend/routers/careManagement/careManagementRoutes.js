"use strict";

const express = require("express");
const router = express.Router();
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");
const ctrl = require("../../controllers/careManagement/careManagementController");

router.use(authenticateToken, requireInternalAccount);

// ── Care Plans ──────────────────────────────────────────────
router.post("/plans", checkPermission("clinical", "careplan_manage"), ctrl.createCarePlan.bind(ctrl));
router.patch("/plans/:planId/status", checkPermission("clinical", "careplan_manage"), ctrl.updateCarePlanStatus.bind(ctrl));
router.get("/plans/:planId", checkPermission("clinical", "careplan_view"), ctrl.getFullPlan.bind(ctrl));
router.get("/patients/:patientId/plans", checkPermission("clinical", "careplan_view"), ctrl.getPatientPlans.bind(ctrl));

// ── Goals ────────────────────────────────────────────────────
router.post("/goals", checkPermission("clinical", "goal_manage"), ctrl.addGoal.bind(ctrl));
router.patch("/goals/:goalId/progress", checkPermission("clinical", "goal_manage"), ctrl.updateGoalProgress.bind(ctrl));
router.get("/plans/:planId/goals", checkPermission("clinical", "careplan_view"), ctrl.listGoals.bind(ctrl));

// ── Interventions ────────────────────────────────────────────
router.post("/interventions", checkPermission("clinical", "careplan_manage"), ctrl.addIntervention.bind(ctrl));
router.post("/interventions/:interventionId/complete", checkPermission("clinical", "careplan_manage"), ctrl.completeIntervention.bind(ctrl));
router.get("/plans/:planId/interventions", checkPermission("clinical", "careplan_view"), ctrl.listInterventions.bind(ctrl));

// ── Care Team ────────────────────────────────────────────────
router.post("/team-members", checkPermission("clinical", "careteam_manage"), ctrl.addTeamMember.bind(ctrl));
router.delete("/team-members/:memberId", checkPermission("clinical", "careteam_manage"), ctrl.removeTeamMember.bind(ctrl));
router.get("/plans/:planId/team", checkPermission("clinical", "careplan_view"), ctrl.getTeamForPlan.bind(ctrl));

// ── Tasks ────────────────────────────────────────────────────
router.post("/tasks", checkPermission("clinical", "task_assign"), ctrl.createTask.bind(ctrl));
router.post("/tasks/:taskId/accept", checkPermission("clinical", "task_assign"), ctrl.acceptTask.bind(ctrl));
router.post("/tasks/:taskId/complete", checkPermission("clinical", "task_assign"), ctrl.completeTask.bind(ctrl));
router.get("/patients/:patientId/tasks", checkPermission("clinical", "careplan_view"), ctrl.getPatientTasks.bind(ctrl));

// ── Outcomes ─────────────────────────────────────────────────
router.post("/outcomes", checkPermission("clinical", "outcome_record"), ctrl.recordOutcome.bind(ctrl));
router.get("/plans/:planId/outcomes", checkPermission("clinical", "careplan_view"), ctrl.getPlanOutcomes.bind(ctrl));

module.exports = router;
