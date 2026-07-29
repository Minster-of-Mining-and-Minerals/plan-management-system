"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const carePlanService = require("../services/careManagement/clinicalCarePlanService");
const goalService = require("../services/careManagement/clinicalGoalService");
const interventionService = require("../services/careManagement/clinicalInterventionService");
const careTeamService = require("../services/careManagement/careTeamService");
const taskService = require("../services/careManagement/clinicalTaskService");
const outcomeService = require("../services/careManagement/patientOutcomeService");

jest.setTimeout(30000);

describe("Phase 2.9.4 — Clinical Care Plan, Goal Management & Patient Outcome Tracking Engine", () => {
  let patientId;
  let doctorId;
  let nurseId;
  let appointmentId;
  let planId;
  let goalId;
  let interventionId;

  beforeAll(async () => {
    try {
      await db.ClinicalCarePlan.sync({ alter: true }).catch(() => {});
      await db.ClinicalGoal.sync({ alter: true }).catch(() => {});
      await db.ClinicalIntervention.sync({ alter: true }).catch(() => {});
      await db.CareTeamMember.sync({ alter: true }).catch(() => {});
      await db.ClinicalTask.sync({ alter: true }).catch(() => {});
      await db.PatientOutcome.sync({ alter: true }).catch(() => {});
    } catch (e) {
      // Sync skipped if tables already exist
    }

    const patient = await db.User.create({
      user_id: uuidv4(), full_name: "Care Plan Test Patient",
      email: `cp_patient_${uuidv4()}@novacure.com`, password: "password_123",
      account_type: "PATIENT", is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(), full_name: "Dr. Care Plan Lead",
      email: `cp_doc_${uuidv4()}@novacure.com`, password: "password_123",
      account_type: "INTERNAL", is_active: true,
    });
    doctorId = doctor.user_id;

    const nurse = await db.User.create({
      user_id: uuidv4(), full_name: "Care Plan Nurse",
      email: `cp_nurse_${uuidv4()}@novacure.com`, password: "password_123",
      account_type: "INTERNAL", is_active: true,
    });
    nurseId = nurse.user_id;

    await db.PatientSchedule.sync({ alter: true }).catch(() => {});
    await db.StaffAppointment.sync({ alter: true }).catch(() => {});

    const schedule = await db.PatientSchedule.create({
      schedule_id: uuidv4(),
      patient_id: patientId,
      assigned_staff_id: doctorId,
      schedule_date: "2026-07-26",
      start_time: "09:00",
      end_time: "09:30",
      appointment_type: "General Outpatient",
      status: "SCHEDULED",
      created_by: doctorId,
    });

    const appointment = await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedule.schedule_id,
      patient_id: patientId,
      assigned_staff_id: doctorId,
      appointment_date: new Date(),
      admitted_at: new Date(),
      appointment_type: "General Outpatient",
      status: "CHECKED_IN",
      workflow_status: "IN_TRIAGE",
    });
    appointmentId = appointment.appointment_id;
  });

  describe("1. Clinical Care Plan Lifecycle", () => {
    it("should create a DRAFT care plan", async () => {
      const plan = await carePlanService.createPlan({
        patient_id: patientId,
        appointment_id: appointmentId,
        title: "Diabetes Management Plan",
        priority: "HIGH",
        start_date: "2026-07-25",
        target_end_date: "2026-12-31",
        notes: "Comprehensive diabetes management plan.",
      }, doctorId);

      expect(plan).toBeDefined();
      expect(plan.status).toBe("DRAFT");
      expect(plan.priority).toBe("HIGH");
      planId = plan.care_plan_id || plan.plan_id;
    });

    it("should activate a care plan", async () => {
      const updated = await carePlanService.updatePlanStatus(planId, "ACTIVE", doctorId);
      expect(updated.status).toBe("ACTIVE");
    });

    it("should retrieve care plans for patient", async () => {
      const plans = await carePlanService.getPlansForPatient(patientId);
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThanOrEqual(1);
    });

    it("should retrieve full plan with goals and team", async () => {
      const full = await carePlanService.getFullPlan(planId);
      expect(full.plan_id).toBe(planId);
      expect(Array.isArray(full.goals)).toBe(true);
    });

    it("should complete a care plan", async () => {
      const tempPlan = await carePlanService.createPlan({ patient_id: patientId, title: "Temp Plan to Complete", priority: "LOW" }, doctorId);
      const completed = await carePlanService.updatePlanStatus(tempPlan.plan_id, "COMPLETED", doctorId);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.actual_end_date).toBeDefined();
    });
  });

  describe("2. Clinical Goal Management", () => {
    it("should add a SMART goal to a care plan", async () => {
      const goal = await goalService.addGoal({
        plan_id: planId,
        patient_id: patientId,
        description: "Reduce HbA1c from 9.5% to below 7.0%",
        baseline_value: 9.5,
        target_value: 7.0,
        current_value: 9.5,
        unit: "%",
        target_date: "2026-12-31",
      }, doctorId);

      expect(goal).toBeDefined();
      expect(goal.status).toBe("PENDING");
      expect(parseFloat(goal.baseline_value)).toBe(9.5);
      goalId = goal.goal_id;
    });

    it("should update goal progress", async () => {
      const updated = await goalService.updateGoalProgress(goalId, 8.2, doctorId);
      expect(updated.status).toBe("IN_PROGRESS");
      expect(parseFloat(updated.current_value)).toBeCloseTo(8.2, 1);
    });

    it("should automatically mark goal as ACHIEVED when target reached", async () => {
      const achieved = await goalService.updateGoalProgress(goalId, 6.8, doctorId);
      expect(achieved.status).toBe("ACHIEVED");
    });

    it("should list goals for a plan", async () => {
      const goals = await goalService.listGoals(planId);
      expect(goals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Clinical Intervention Engine", () => {
    it("should add an investigation intervention", async () => {
      const intervention = await interventionService.addIntervention({
        plan_id: planId,
        goal_id: goalId,
        patient_id: patientId,
        intervention_type: "INVESTIGATION",
        description: "Order HbA1c blood test every 3 months.",
        scheduled_date: "2026-08-01",
      }, doctorId);

      expect(intervention).toBeDefined();
      expect(intervention.status).toBe("PLANNED");
      expect(intervention.intervention_type).toBe("INVESTIGATION");
      interventionId = intervention.intervention_id;
    });

    it("should complete an intervention with timeline event", async () => {
      const completed = await interventionService.completeIntervention(interventionId, doctorId);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completed_date).toBeDefined();
    });

    it("should list interventions for a plan", async () => {
      const interventions = await interventionService.listInterventions(planId);
      expect(Array.isArray(interventions)).toBe(true);
      expect(interventions.length).toBeGreaterThanOrEqual(1);
    });

    it("should reject invalid intervention type", async () => {
      await expect(
        interventionService.addIntervention({
          plan_id: planId, patient_id: patientId,
          intervention_type: "INVALID_TYPE", description: "Test",
        }, doctorId)
      ).rejects.toThrow();
    });
  });

  describe("4. Care Team Management", () => {
    it("should add a nurse to care team", async () => {
      const member = await careTeamService.addTeamMember({
        plan_id: planId,
        patient_id: patientId,
        clinician_id: nurseId,
        role: "NURSE",
        responsibilities: "Daily glucose monitoring and patient education.",
      }, doctorId);

      expect(member).toBeDefined();
      expect(member.role).toBe("NURSE");
    });

    it("should retrieve care team for plan", async () => {
      const team = await careTeamService.getTeamForPlan(planId);
      expect(Array.isArray(team)).toBe(true);
      expect(team.length).toBeGreaterThanOrEqual(1);
    });

    it("should remove a team member", async () => {
      const member = await careTeamService.addTeamMember({
        plan_id: planId, patient_id: patientId, clinician_id: nurseId, role: "OTHER",
      }, doctorId);
      const result = await careTeamService.removeTeamMember(member.team_member_id);
      expect(result.removed).toBe(true);
    });
  });

  describe("5. Clinical Task Engine", () => {
    let taskId;

    it("should create an OPEN clinical task assigned to nurse", async () => {
      const task = await taskService.createTask({
        patient_id: patientId,
        plan_id: planId,
        title: "Review glucose log and update care plan",
        description: "Weekly glucose review task.",
        assigned_to: nurseId,
        priority: "HIGH",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }, doctorId);

      expect(task).toBeDefined();
      expect(task.status).toBe("OPEN");
      taskId = task.task_id;
    });

    it("should accept a clinical task", async () => {
      const accepted = await taskService.acceptTask(taskId, nurseId);
      expect(accepted.status).toBe("ACCEPTED");
    });

    it("should complete a clinical task with audit trail", async () => {
      const completed = await taskService.completeTask(taskId, nurseId);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completed_at).toBeDefined();
    });

    it("should retrieve tasks for patient", async () => {
      const tasks = await taskService.getTasksForPatient(patientId);
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    it("should mark overdue tasks", async () => {
      await db.ClinicalTask.create({
        task_id: uuidv4(), patient_id: patientId,
        title: "Overdue task test", assigned_to: nurseId, assigned_by: doctorId,
        status: "OPEN", priority: "MEDIUM",
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        created_at: new Date(), updated_at: new Date(),
      });

      const result = await taskService.markOverdueTasks();
      expect(result.marked_overdue).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Patient Outcome Tracking", () => {
    it("should compute correct progress percentage", () => {
      const pct = outcomeService.computeProgressPercentage(100, 70, 85);
      expect(pct).toBeCloseTo(50, 0);
    });

    it("should return 100% when current equals target", () => {
      const pct = outcomeService.computeProgressPercentage(100, 70, 70);
      expect(pct).toBe(100);
    });

    it("should record a patient outcome with status IMPROVING", async () => {
      const outcome = await outcomeService.recordOutcome({
        plan_id: planId,
        goal_id: goalId,
        patient_id: patientId,
        outcome_name: "HbA1c Level",
        baseline_value: 9.5,
        target_value: 7.0,
        current_value: 8.0,
        unit: "%",
        notes: "Patient showing improvement after dietary changes.",
      }, doctorId);

      expect(outcome).toBeDefined();
      expect(outcome.status).toBe("IMPROVING");
      expect(parseFloat(outcome.progress_percentage)).toBeCloseTo(60, 0);
    });

    it("should record an ACHIEVED outcome", async () => {
      const outcome = await outcomeService.recordOutcome({
        plan_id: planId,
        patient_id: patientId,
        outcome_name: "Weight Management",
        baseline_value: 100,
        target_value: 85,
        current_value: 84,
        unit: "kg",
      }, doctorId);
      expect(outcome.status).toBe("ACHIEVED");
    });

    it("should record a WORSENING outcome", async () => {
      const outcome = await outcomeService.recordOutcome({
        plan_id: planId, patient_id: patientId,
        outcome_name: "Blood Pressure",
        baseline_value: 130, target_value: 120, current_value: 145,
        unit: "mmHg",
      }, doctorId);
      expect(outcome.status).toBe("WORSENING");
    });

    it("should retrieve all outcomes for a plan", async () => {
      const outcomes = await outcomeService.getOutcomesForPlan(planId);
      expect(Array.isArray(outcomes)).toBe(true);
      expect(outcomes.length).toBeGreaterThanOrEqual(1);
    });
  });
});
