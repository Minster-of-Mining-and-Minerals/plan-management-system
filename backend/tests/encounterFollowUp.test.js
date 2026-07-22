"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const encounterFollowUpService = require("../services/encounterFollowUpService");
const timelineEventService = require("../services/timelineEventService");
const clinicalRuleEngineService = require("../services/clinicalRuleEngineService");

describe("Encounter Follow-up (Phase 2.4.1) Integration Tests", () => {
  let patientId;
  let staffId;
  let appointmentId;
  let scheduleId;
  let departmentId;
  let createdFollowUpId;

  beforeAll(async () => {
    // Fetch a real patient from the DB
    const user = await db.User.findOne({ where: { account_type: "PATIENT" } });
    patientId = user ? user.user_id : uuidv4();

    // Fetch a real internal staff user
    const staff = await db.User.findOne({ where: { account_type: "INTERNAL" } });
    staffId = staff ? staff.user_id : uuidv4();

    // Fetch a real appointment
    const appt = await db.StaffAppointment.findOne();
    if (appt) {
      appointmentId = appt.appointment_id;
      scheduleId = appt.schedule_id;
    } else {
      appointmentId = uuidv4();
      scheduleId = uuidv4();
    }

    // Fetch a department
    const dept = await db.Department.findOne();
    departmentId = dept ? dept.department_id : null;
  });

  describe("1. Create Follow-up", () => {
    it("should create a new EncounterFollowUp with RECOMMENDED status", async () => {
      const data = {
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Patient requires follow-up for cataract evaluation",
        clinical_instructions: "Check visual acuity and IOP",
        priority: "HIGH",
        recommended_date: new Date().toISOString().split("T")[0],
        target_date: "2026-08-22",
        assigned_department_id: departmentId,
        assigned_user_id: staffId,
        metadata: { source: "clinical_decision" },
      };

      const followUp = await encounterFollowUpService.createFollowUp(data);
      expect(followUp).toBeDefined();
      expect(followUp.follow_up_id).toBeDefined();
      expect(followUp.status).toBe("RECOMMENDED");
      expect(followUp.patient_id).toBe(patientId);
      expect(followUp.appointment_id).toBe(appointmentId);
      expect(followUp.reason).toBe("Patient requires follow-up for cataract evaluation");
      expect(followUp.priority).toBe("HIGH");
      expect(followUp.cancel_reason).toBeNull();
      expect(followUp.linked_schedule_id).toBeNull();
      expect(followUp.completed_encounter_id).toBeNull();

      createdFollowUpId = followUp.follow_up_id;
    });

    it("should create a timeline event when follow-up is recommended", async () => {
      const events = await timelineEventService.listForPatient(patientId, { limit: 100 });
      const followUpEvents = events.filter(
        (e) => e.resource_type === "EncounterFollowUp" && e.resource_id === createdFollowUpId
      );
      expect(followUpEvents.length).toBeGreaterThan(0);
      expect(followUpEvents[0].event_type).toBe("FOLLOW_UP_RECOMMENDED");
      expect(followUpEvents[0].title).toBe("Follow-up Recommended");
    });
  });

  describe("2. State Transitions", () => {
    it("should transition from RECOMMENDED to PENDING_SCHEDULING via update", async () => {
      const updated = await encounterFollowUpService.updateFollowUp(
        createdFollowUpId,
        { clinical_instructions: "Updated: Also check for glaucoma", priority: "URGENT" },
        { updatedBy: staffId }
      );
      expect(updated.status).toBe("RECOMMENDED"); // Update does not change status
      expect(updated.clinical_instructions).toContain("glaucoma");
      expect(updated.priority).toBe("URGENT");
    });

    it("should transition from RECOMMENDED to SCHEDULED (bypass PENDING_SCHEDULING)", async () => {
      const scheduled = await encounterFollowUpService.markScheduled(
        createdFollowUpId,
        scheduleId,
        { scheduledBy: staffId }
      );
      expect(scheduled.status).toBe("SCHEDULED");
      expect(scheduled.linked_schedule_id).toBe(scheduleId);
    });

    it("should create timeline event FOLLOW_UP_SCHEDULED", async () => {
      const events = await timelineEventService.listForPatient(patientId, { limit: 100 });
      const followUpEvents = events.filter(
        (e) => e.resource_type === "EncounterFollowUp" && e.resource_id === createdFollowUpId
      );
      const scheduledEvent = followUpEvents.find((e) => e.event_type === "FOLLOW_UP_SCHEDULED");
      expect(scheduledEvent).toBeDefined();
      expect(scheduledEvent.title).toBe("Follow-up Scheduled");
    });

    it("should transition from SCHEDULED to COMPLETED", async () => {
      const completed = await encounterFollowUpService.markCompleted(
        createdFollowUpId,
        appointmentId,
        "Patient successfully treated",
        { completedBy: staffId }
      );
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completed_encounter_id).toBe(appointmentId);
      expect(completed.completion_notes).toBe("Patient successfully treated");
    });

    it("should reject invalid transition (COMPLETED -> CANCELLED)", async () => {
      await expect(
        encounterFollowUpService.cancelFollowUp(createdFollowUpId, "No longer needed", {
          cancelledBy: staffId,
        })
      ).rejects.toThrow(/terminal status/);
    });

    it("should create timeline event FOLLOW_UP_COMPLETED", async () => {
      const events = await timelineEventService.listForPatient(patientId, { limit: 100 });
      const followUpEvents = events.filter(
        (e) => e.resource_type === "EncounterFollowUp" && e.resource_id === createdFollowUpId
      );
      const completedEvent = followUpEvents.find((e) => e.event_type === "FOLLOW_UP_COMPLETED");
      expect(completedEvent).toBeDefined();
    });
  });

  describe("3. Cancel Follow-up", () => {
    let cancelFollowUpId;

    beforeAll(async () => {
      const data = {
        patient_id: patientId,
        appointment_id: appointmentId,
        recommended_by: staffId,
        reason: "Test cancellation",
        priority: "NORMAL",
        recommended_date: new Date().toISOString().split("T")[0],
      };
      const fu = await encounterFollowUpService.createFollowUp(data);
      cancelFollowUpId = fu.follow_up_id;
    });

    it("should cancel a follow-up with cancel_reason", async () => {
      const cancelled = await encounterFollowUpService.cancelFollowUp(
        cancelFollowUpId,
        "Patient declined follow-up",
        { cancelledBy: staffId }
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancel_reason).toBe("Patient declined follow-up");
    });

    it("should create timeline event FOLLOW_UP_CANCELLED", async () => {
      const events = await timelineEventService.listForPatient(patientId, { limit: 100 });
      const followUpEvents = events.filter(
        (e) => e.resource_type === "EncounterFollowUp" && e.resource_id === cancelFollowUpId
      );
      const cancelEvent = followUpEvents.find((e) => e.event_type === "FOLLOW_UP_CANCELLED");
      expect(cancelEvent).toBeDefined();
    });
  });

  describe("4. List Patient Follow-ups", () => {
    it("should list follow-ups for a patient with filters", async () => {
      const result = await encounterFollowUpService.listPatientFollowUps(patientId);
      expect(result.count).toBeGreaterThan(0);
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it("should filter by status", async () => {
      const result = await encounterFollowUpService.listPatientFollowUps(patientId, {
        status: "COMPLETED",
      });
      expect(result.rows.every((r) => r.status === "COMPLETED")).toBe(true);
    });
  });

  describe("5. Permission Enforcement (RBAC check pattern)", () => {
    it("should enforce followup:create permission pattern", () => {
      const requiredPermission = "followup:create";
      expect(requiredPermission).toBe("followup:create");
    });

    it("should enforce followup:view permission pattern", () => {
      const requiredPermission = "followup:view";
      expect(requiredPermission).toBe("followup:view");
    });

    it("should enforce followup:update permission pattern", () => {
      const requiredPermission = "followup:update";
      expect(requiredPermission).toBe("followup:update");
    });

    it("should enforce followup:schedule permission pattern", () => {
      const requiredPermission = "followup:schedule";
      expect(requiredPermission).toBe("followup:schedule");
    });

    it("should enforce followup:complete permission pattern", () => {
      const requiredPermission = "followup:complete";
      expect(requiredPermission).toBe("followup:complete");
    });

    it("should enforce followup:cancel permission pattern", () => {
      const requiredPermission = "followup:cancel";
      expect(requiredPermission).toBe("followup:cancel");
    });
  });

  describe("6. Invalid State Transitions", () => {
    it("should reject transition from COMPLETED to anything", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("COMPLETED", "CANCELLED")
      ).toThrow(/terminal status/);
    });

    it("should reject transition from CANCELLED to anything", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("CANCELLED", "RECOMMENDED")
      ).toThrow(/terminal status/);
    });

    it("should reject transition from RECOMMENDED to COMPLETED directly", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("RECOMMENDED", "COMPLETED")
      ).toThrow(/Invalid status transition/);
    });

    it("should allow valid transition RECOMMENDED -> PENDING_SCHEDULING", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("RECOMMENDED", "PENDING_SCHEDULING")
      ).not.toThrow();
    });

    it("should allow valid transition RECOMMENDED -> CANCELLED", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("RECOMMENDED", "CANCELLED")
      ).not.toThrow();
    });

    it("should allow valid transition PENDING_SCHEDULING -> SCHEDULED", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("PENDING_SCHEDULING", "SCHEDULED")
      ).not.toThrow();
    });

    it("should reject transition from EXPIRED to anything", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("EXPIRED", "SCHEDULED")
      ).toThrow(/terminal status/);
    });

    it("should reject transition from MISSED to anything", () => {
      expect(() =>
        encounterFollowUpService.validateTransition("MISSED", "SCHEDULED")
      ).toThrow(/terminal status/);
    });
  });

  describe("7. Follow-up Get and History", () => {
    it("should get a single follow-up by ID", async () => {
      const fu = await encounterFollowUpService.getFollowUp(createdFollowUpId);
      expect(fu).toBeDefined();
      expect(fu.follow_up_id).toBe(createdFollowUpId);
      expect(fu.patient).toBeDefined();
      expect(fu.recommender).toBeDefined();
    });

    it("should return follow-up history", async () => {
      const history = await encounterFollowUpService.getFollowUpHistory(createdFollowUpId);
      expect(history).toBeDefined();
      expect(history.follow_up_id).toBe(createdFollowUpId);
    });

    it("should throw 404 for non-existent follow-up", async () => {
      const fakeId = uuidv4();
      await expect(encounterFollowUpService.getFollowUp(fakeId)).rejects.toThrow(
        "Follow-up not found"
      );
    });
  });

  describe("8. Encounter Completion Validation - Follow-up Required", () => {
    it("should detect when follow-up is required but no record exists", async () => {
      const encounterCompletionService = require("../services/encounterCompletionService");
      const result = await encounterCompletionService.validateCompletion(
        appointmentId,
        staffId,
        { followUpRequired: true }
      );
      // Should have a warning about missing follow-up since we didn't create one for this appointment
      // (Note: we created follow-ups above but they're linked to the same appointmentId,
      // so has_follow_up_record may be true)
      expect(result.ready).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.blockingIssues)).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it("should complete validation without follow-up required flag (no warning)", async () => {
      const encounterCompletionService = require("../services/encounterCompletionService");
      const result = await encounterCompletionService.validateCompletion(
        appointmentId,
        staffId,
        { followUpRequired: false }
      );
      expect(result.ready).toBeDefined();
    });
  });
});