"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const followUpOutcomeService = require("../services/followUpOutcomeService");
const encounterFollowUpService = require("../services/encounterFollowUpService");
const followUpContinuityService = require("../services/followUpContinuityService");

/**
 * Phase 2.4.4 - Follow-up Clinical Resolution Engine Tests
 */
describe("Follow-up Clinical Resolution Engine (Phase 2.4.4)", () => {
  let patientId;
  let staffId;
  let appointmentId;
  let scheduleId;
  let followUpId;
  let encounterId;

  async function createTestAppointment(pId, sId, overrides = {}) {
    const schedId = overrides.schedule_id || uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      schedule_date: overrides.schedule_date || todayStr,
      start_time: overrides.start_time || "07:30",
      end_time: "17:00",
      status: overrides.status || "admitted",
      appointment_type: "Test Follow-up",
      created_by: sId,
      updated_by: sId,
    });

    return await db.StaffAppointment.create({
      appointment_id: overrides.appointment_id || uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      admitted_by: sId,
      admitted_at: new Date(),
      status: overrides.status || "admitted",
      notes: overrides.notes || null,
    });
  }

  beforeAll(async () => {
    const user = await db.User.findOne({ where: { account_type: "PATIENT" } });
    patientId = user ? user.user_id : uuidv4();
    const staff = await db.User.findOne({ where: { account_type: "INTERNAL" } });
    staffId = staff ? staff.user_id : uuidv4();

    // Create a base appointment
    const appt = await createTestAppointment(patientId, staffId);
    appointmentId = appt.appointment_id;
  });

  describe("1. Outcome Creation", () => {
    it("should create a new EncounterFollowUpOutcome", async () => {
      // First create a follow-up
      const followUp = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Follow-up for cataract evaluation",
        priority: "HIGH",
        recommended_date: new Date().toISOString().split("T")[0],
      });
      followUpId = followUp.follow_up_id;
      expect(followUpId).toBeDefined();

      // Create another appointment that will be the follow-up encounter
      const encounter = await createTestAppointment(patientId, staffId);
      encounterId = encounter.appointment_id;

      // Create outcome
      const outcome = await followUpOutcomeService.createOutcome({
        follow_up_id: followUpId,
        encounter_id: encounterId,
        outcome_status: "IMPROVED",
        treatment_response: "Patient responded well to medication",
        resolution_notes: "Vision improved from 6/12 to 6/9",
        requires_additional_follow_up: false,
        recorded_by: staffId,
      });

      expect(outcome).toBeDefined();
      expect(outcome.follow_up_outcome_id).toBeDefined();
      expect(outcome.outcome_status).toBe("IMPROVED");
      expect(outcome.follow_up_id).toBe(followUpId);
      expect(outcome.encounter_id).toBe(encounterId);
      expect(outcome.requires_additional_follow_up).toBe(false);
    });

    it("should reject duplicate outcome creation", async () => {
      await expect(
        followUpOutcomeService.createOutcome({
          follow_up_id: followUpId,
          encounter_id: encounterId,
          outcome_status: "RESOLVED",
          recorded_by: staffId,
        })
      ).rejects.toThrow(/Outcome already exists/);
    });

    it("should create outcome with all 8 valid statuses", async () => {
      const statuses = [
        "RESOLVED", "IMPROVED", "STABLE", "WORSENED",
        "REFERRED", "LOST_TO_FOLLOW_UP", "PATIENT_DECLINED", "OTHER",
      ];

      for (const status of statuses) {
        const fu = await encounterFollowUpService.createFollowUp({
          patient_id: patientId,
          appointment_id: appointmentId,
          recommended_by: staffId,
          reason: `Test follow-up for status ${status}`,
          recommended_date: new Date().toISOString().split("T")[0],
        });

        const enc = await createTestAppointment(patientId, staffId);

        const outcome = await followUpOutcomeService.createOutcome({
          follow_up_id: fu.follow_up_id,
          encounter_id: enc.appointment_id,
          outcome_status: status,
          recorded_by: staffId,
        });

        expect(outcome.outcome_status).toBe(status);
      }
    });
  });

  describe("2. Outcome Retrieval", () => {
    it("should retrieve outcome by follow-up ID", async () => {
      const outcome = await followUpOutcomeService.getOutcome(followUpId);
      expect(outcome).toBeDefined();
      expect(outcome.follow_up_id).toBe(followUpId);
      expect(outcome.outcome_status).toBe("IMPROVED");
      expect(outcome.recorder).toBeDefined();
      expect(outcome.encounter).toBeDefined();
    });

    it("should return null for non-existent outcome", async () => {
      const outcome = await followUpOutcomeService.getOutcome(uuidv4());
      expect(outcome).toBeNull();
    });
  });

  describe("3. Outcome Update", () => {
    it("should update an existing outcome", async () => {
      // Get the outcome ID
      const outcome = await followUpOutcomeService.getOutcome(followUpId);
      const outcomeId = outcome.follow_up_outcome_id;

      const updated = await followUpOutcomeService.updateOutcome(
        outcomeId,
        {
          outcome_status: "RESOLVED",
          resolution_notes: "Fully resolved after treatment course",
          requires_additional_follow_up: true,
        }
      );

      expect(updated.outcome_status).toBe("RESOLVED");
      expect(updated.resolution_notes).toContain("Fully resolved");
      expect(updated.requires_additional_follow_up).toBe(true);
    });
  });

  describe("4. Follow-up Chain Creation", () => {
    it("should create a follow-up chain (parent to child)", async () => {
      const parentFollowUp = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Initial diabetic screening follow-up",
        priority: "HIGH",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      const childFollowUp = await followUpOutcomeService.createNextFollowUp(
        parentFollowUp.follow_up_id,
        {
          patient_id: patientId,
          appointment_id: appointmentId,
          recommended_by: staffId,
          reason: "3-month diabetic review",
          priority: "NORMAL",
          recommended_date: new Date().toISOString().split("T")[0],
        }
      );

      expect(childFollowUp).toBeDefined();
      expect(childFollowUp.parent_follow_up_id).toBe(parentFollowUp.follow_up_id);
    });

    it("should build a follow-up chain correctly", async () => {
      // Create a chain: FU1 -> FU2 -> FU3
      const fu1 = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Chain root",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      const fu2 = await followUpOutcomeService.createNextFollowUp(fu1.follow_up_id, {
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Chain middle",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      const fu3 = await followUpOutcomeService.createNextFollowUp(fu2.follow_up_id, {
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Chain leaf",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      // Build chain from the middle
      const chain = await followUpOutcomeService.buildFollowUpChain(fu2.follow_up_id);

      expect(chain).toBeDefined();
      expect(chain.length).toBe(3);
      expect(chain[0].follow_up_id).toBe(fu1.follow_up_id);
      expect(chain[1].follow_up_id).toBe(fu2.follow_up_id);
      expect(chain[2].follow_up_id).toBe(fu3.follow_up_id);
    });

    it("should inherit patient from parent when creating next follow-up", async () => {
      const fu1 = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Parent with patient",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      const child = await followUpOutcomeService.createNextFollowUp(
        fu1.follow_up_id,
        {
          appointment_id: appointmentId,
          recommended_by: staffId,
          reason: "Child inherits patient",
          recommended_date: new Date().toISOString().split("T")[0],
        }
      );

      // Should have inherited patient from parent
      const childRecord = await db.EncounterFollowUp.findByPk(child.follow_up_id, {
        paranoid: false,
        raw: true,
      });
      expect(childRecord.patient_id).toBe(patientId);
    });
  });

  describe("5. Outcome Validation", () => {
    it("should detect that outcome is required for follow-up encounter", async () => {
      // Create a schedule and attempt to simulate a follow-up encounter
      const fu = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Validation test",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      // Create outcome
      await followUpOutcomeService.createOutcome({
        follow_up_id: fu.follow_up_id,
        encounter_id: encounterId,
        outcome_status: "RESOLVED",
        recorded_by: staffId,
      });

      const validation = await followUpOutcomeService.validateOutcome(encounterId);
      expect(validation.requiresOutcome).toBe(true);
      expect(validation.hasOutcome).toBe(true);
    });

    it("should return false for non-follow-up encounters", async () => {
      const freshAppt = await createTestAppointment(patientId, staffId);

      const validation = await followUpOutcomeService.validateOutcome(freshAppt.appointment_id);
      expect(validation.requiresOutcome).toBe(false);
    });
  });

  describe("6. Analytics", () => {
    it("should return outcome distribution", async () => {
      const distribution = await followUpOutcomeService.getOutcomeDistribution();
      expect(distribution).toBeDefined();
      expect(typeof distribution.RESOLVED).toBe("number");
      expect(typeof distribution.IMPROVED).toBe("number");
    });

    it("should return resolution rate", async () => {
      const rate = await followUpOutcomeService.getResolutionRate();
      expect(typeof rate).toBe("number");
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it("should return worsened rate", async () => {
      const rate = await followUpOutcomeService.getWorsenedRate();
      expect(typeof rate).toBe("number");
    });

    it("should return referral rate", async () => {
      const rate = await followUpOutcomeService.getReferralRate();
      expect(typeof rate).toBe("number");
    });
  });

  describe("7. Backward Compatibility", () => {
    it("should not affect historical follow-ups without outcomes", async () => {
      const oldFu = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Historical test",
        recommended_date: new Date().toISOString().split("T")[0],
      });

      // Complete it directly without outcome
      await encounterFollowUpService.cancelFollowUp(oldFu.follow_up_id, "Historical test");

      const outcome = await followUpOutcomeService.getOutcome(oldFu.follow_up_id);
      expect(outcome).toBeNull(); // No outcome for historical record
    });

    it("should not affect non-follow-up encounters", async () => {
      const freshAppt = await createTestAppointment(patientId, staffId);

      const continuity = await followUpContinuityService.getFollowUpContext(freshAppt.appointment_id);
      expect(continuity.is_follow_up).toBe(false);
    });
  });
});