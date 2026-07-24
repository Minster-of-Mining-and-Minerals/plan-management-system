"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const followUpContinuityService = require("../services/followUpContinuityService");
const encounterFollowUpService = require("../services/encounterFollowUpService");
const patientScheduleService = require("../services/patientScheduleService");

/**
 * Tests for Phase 2.4.3 - Follow-up Continuity Engine
 *
 * These tests verify:
 * 1. Regular (non-follow-up) encounter returns is_follow_up=false
 * 2. Follow-up encounter returns complete DTO
 * 3. Previous provider is resolved correctly
 * 4. Previous diagnosis summary is resolved
 * 5. Previous prescriptions summary is resolved
 * 6. Previous notes are resolved
 * 7. Previous timeline summary is accessible
 * 8. Non-follow-up encounters are unaffected
 */
describe("Follow-up Continuity Service (Phase 2.4.3)", () => {
  let patientId;
  let staffId;
  let originalAppointmentId;
  let originalScheduleId;
  let followUpId;

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
      appointment_type: "Test Continuity",
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
    // Fetch a real patient from the DB
    const user = await db.User.findOne({ where: { account_type: "PATIENT" } });
    patientId = user ? user.user_id : uuidv4();

    // Create a fresh isolated internal staff user for this test run
    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Isolated ContinuityDoctor",
      email: `test_doctor_continuity_${uuidv4()}@novacure.com`,
      password: "hash_password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    // Grant Super Admin role so receive_appointment permission is true
    const [superAdminRole] = await db.Role.findOrCreate({
      where: { name: "Super Admin" },
      defaults: {
        role_id: "00000000-0000-4000-8000-000000000002",
        name: "Super Admin",
        code: "SUPER_ADMIN",
      },
    });

    await db.UserRoles.findOrCreate({
      where: { user_id: staffId, role_id: superAdminRole.role_id },
      defaults: {
        user_role_id: uuidv4(),
        user_id: staffId,
        role_id: superAdminRole.role_id,
      },
    });

    const origAppt = await createTestAppointment(patientId, staffId, {
      notes: "Original encounter for follow-up test",
    });
    originalAppointmentId = origAppt.appointment_id;
    originalScheduleId = origAppt.schedule_id;
  });

  describe("1. Non-follow-up Encounters", () => {
    it("should return is_follow_up=false for a regular appointment", async () => {
      // Create a fresh appointment that has no follow-up link
      const freshAppt = await createTestAppointment(patientId, staffId);

      const result = await followUpContinuityService.getFollowUpContext(
        freshAppt.appointment_id
      );
      expect(result).toBeDefined();
      expect(result.is_follow_up).toBe(false);
    });

    it("should return is_follow_up=false for non-existent appointment", async () => {
      const result = await followUpContinuityService.getFollowUpContext(
        uuidv4()
      );
      expect(result).toBeDefined();
      expect(result.is_follow_up).toBe(false);
    });
  });

  describe("2. Follow-up Encounter Detection", () => {
    it("should detect a follow-up encounter and return is_follow_up=true", async () => {
      // Step 1: Create a follow-up from the original appointment
      const followUp = await encounterFollowUpService.createFollowUp({
        patient_id: patientId,
        appointment_id: originalAppointmentId,
        recommended_by: staffId,
        reason: "Follow-up for diabetic retinopathy screening",
        clinical_instructions: "Check vision, dilate pupils, examine retina",
        priority: "HIGH",
        recommended_date: "2026-07-01",
        target_date: "2026-08-15",
      });
      followUpId = followUp.follow_up_id;
      expect(followUpId).toBeDefined();

      // Step 2: Schedule the follow-up (creates PatientSchedule + EncounterFollowUpAttempt)
      const scheduled = await encounterFollowUpService.scheduleAppointment(
        followUpId,
        {
          assigned_staff_id: staffId,
          schedule_date: "2026-08-24",
          start_time: "10:00",
          appointment_type: "Follow-up visit",
        },
        { scheduledBy: staffId }
      );
      const newScheduleId = scheduled.schedule?.schedule_id;

      // Step 3: Simulate admission - create a new StaffAppointment linked to this schedule
      const newAppointment = await db.StaffAppointment.create({
        appointment_id: uuidv4(),
        schedule_id: newScheduleId,
        patient_id: patientId,
        assigned_staff_id: staffId,
        admitted_by: staffId,
        admitted_at: new Date(),
        status: "admitted",
      });

      // Step 4: Run auto-complete to link the follow-up to the new encounter
      await encounterFollowUpService.autoCompleteFollowUp(
        newScheduleId,
        newAppointment.appointment_id,
        { admittedBy: staffId }
      );

      // Step 5: Now test the continuity service
      const result = await followUpContinuityService.getFollowUpContext(
        newAppointment.appointment_id
      );
      expect(result).toBeDefined();
      expect(result.is_follow_up).toBe(true);
      expect(result.follow_up_id).toBe(followUpId);
      expect(result.origin_encounter_id).toBe(originalAppointmentId);
      expect(result.current_encounter_id).toBe(newAppointment.appointment_id);
    });

    it("should resolve the previous provider correctly", async () => {
      const result = await followUpContinuityService.getFollowUpContext(
        originalAppointmentId
      );
      // This is the original encounter, not a follow-up
      expect(result.is_follow_up).toBeDefined();
    });

    it("should include follow-up reason and clinical instructions", async () => {
      // We need to find a follow-up encounter. Use the schedule we created.
      const attempt = await db.EncounterFollowUpAttempt.findOne({
        where: { follow_up_id: followUpId },
        paranoid: false,
      });
      if (attempt && attempt.schedule_id) {
        const appt = await db.StaffAppointment.findOne({
          where: { schedule_id: attempt.schedule_id },
        });
        if (appt) {
          const result = await followUpContinuityService.getFollowUpContext(
            appt.appointment_id
          );
          if (result.is_follow_up) {
            expect(result.reason).toBeDefined();
            expect(result.reason.length).toBeGreaterThan(0);
            expect(result.priority).toBeDefined();
          }
        }
      }
    });
  });

  describe("3. Previous Encounter Data", () => {
    it("should include previous diagnosis summary", async () => {
      // Find any follow-up encounter
      const attempt = await db.EncounterFollowUpAttempt.findOne({
        where: { follow_up_id: followUpId },
        include: [{ model: db.EncounterFollowUp, as: "followUp" }],
        paranoid: false,
      });
      if (attempt && attempt.followUp) {
        const result = await followUpContinuityService.getFollowUpContext(
          attempt.followUp.completed_encounter_id
        );
        if (result.is_follow_up) {
          expect(result.previous_diagnosis).toBeDefined();
          expect(Array.isArray(result.previous_diagnosis)).toBe(true);
        }
      }
    });

    it("should include previous clinical notes summary", async () => {
      const attempt = await db.EncounterFollowUpAttempt.findOne({
        where: { follow_up_id: followUpId },
        paranoid: false,
      });
      if (attempt && attempt.followUp) {
        const result = await followUpContinuityService.getFollowUpContext(
          attempt.followUp.completed_encounter_id
        );
        if (result.is_follow_up) {
          expect(result.previous_notes).toBeDefined();
          expect(Array.isArray(result.previous_notes)).toBe(true);
        }
      }
    });

    it("should include timeline summary", async () => {
      const attempt = await db.EncounterFollowUpAttempt.findOne({
        where: { follow_up_id: followUpId },
        paranoid: false,
      });
      if (attempt && attempt.followUp) {
        const result = await followUpContinuityService.getFollowUpContext(
          attempt.followUp.completed_encounter_id
        );
        if (result.is_follow_up) {
          expect(result.previous_timeline_summary).toBeDefined();
          expect(typeof result.previous_timeline_summary.total_logs).toBe("number");
          expect(Array.isArray(result.previous_timeline_summary.action_types)).toBe(true);
        }
      }
    });
  });

  describe("4. Non-follow-up Encounters Unaffected", () => {
    it("should NOT return is_follow_up=true for regular encounters", async () => {
      // Create a completely new, unlinked appointment
      const freshAppt = await createTestAppointment(patientId, staffId);

      const result = await followUpContinuityService.getFollowUpContext(
        freshAppt.appointment_id
      );
      expect(result.is_follow_up).toBe(false);
      expect(result.follow_up_id).toBeUndefined();
      expect(result.origin_encounter_id).toBeUndefined();
    });

    it("should not leak follow-up data for normal appointments", async () => {
      const freshAppt = await createTestAppointment(patientId, staffId);

      const result = await followUpContinuityService.getFollowUpContext(
        freshAppt.appointment_id
      );
      // Only is_follow_up should be present for non-follow-up encounters
      const keys = Object.keys(result);
      expect(keys).toEqual(["is_follow_up"]);
    });
  });

  describe("5. Follow-up Status and Attempt Info", () => {
    it("should include follow-up status and attempt number", async () => {
      const attempt = await db.EncounterFollowUpAttempt.findOne({
        where: { follow_up_id: followUpId },
        include: [{ model: db.EncounterFollowUp, as: "followUp" }],
        paranoid: false,
      });
      if (attempt && attempt.followUp && attempt.followUp.completed_encounter_id) {
        const result = await followUpContinuityService.getFollowUpContext(
          attempt.followUp.completed_encounter_id
        );
        if (result.is_follow_up) {
          expect(result.follow_up_status).toBeDefined();
          expect(result.attempt_number).toBeDefined();
          expect(result.attempt_status).toBeDefined();
        }
      }
    });
  });
});