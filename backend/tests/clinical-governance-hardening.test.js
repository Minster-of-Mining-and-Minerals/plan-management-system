"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderTransitionGuard = require("../services/clinicalOrder/clinicalOrderTransitionGuard");
const clinicalOrderEventContract = require("../services/clinicalOrder/clinicalOrderEventContract");
const unifiedClinicalSLAEngine = require("../services/clinicalOrder/unifiedClinicalSLAEngine");
const clinicalOperationsAnalyticsService = require("../services/clinicalOrder/clinicalOperationsAnalyticsService");
const clinicalOrderService = require("../services/clinicalOrderService");

jest.setTimeout(30000);

describe("Phase 2.9.1 — Clinical Platform Governance Hardening", () => {
  let patientId;
  let doctorId;
  let appointmentId;
  let clinicalOrderId;

  async function createTestEncounter(pId, dId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      schedule_date: todayStr,
      start_time: "08:00",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Governance Encounter",
      created_by: dId,
      updated_by: dId,
    });

    return await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      admitted_by: dId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Encounter for Governance Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Governance Patient",
      email: `gov_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Governance Lead",
      email: `gov_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const order = await clinicalOrderService.createOrder(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        order_type: "LABORATORY",
        title: "Governance Test Order",
        priority: "STAT",
      },
      doctorId
    );
    clinicalOrderId = order.order_id;
  });

  describe("1. ClinicalOrderTransitionGuard", () => {
    it("should allow valid sequential lifecycle state transitions", () => {
      expect(clinicalOrderTransitionGuard.validateTransition("ORDERED", "PREPARED").valid).toBe(true);
      expect(clinicalOrderTransitionGuard.validateTransition("PREPARED", "IN_PROGRESS").valid).toBe(true);
      expect(clinicalOrderTransitionGuard.validateTransition("IN_PROGRESS", "FULFILLED").valid).toBe(true);
      expect(clinicalOrderTransitionGuard.validateTransition("FULFILLED", "VERIFIED").valid).toBe(true);
      expect(clinicalOrderTransitionGuard.validateTransition("VERIFIED", "COMPLETED").valid).toBe(true);
    });

    it("should reject illegal lifecycle jumps (e.g. ORDERED -> COMPLETED)", async () => {
      const check = clinicalOrderTransitionGuard.validateTransition("ORDERED", "COMPLETED");
      expect(check.valid).toBe(false);
      expect(check.reason).toContain("Illegal lifecycle transition");

      await expect(
        clinicalOrderTransitionGuard.enforceTransitionGuard({
          clinicalOrderId,
          fromStage: "ORDERED",
          toStage: "COMPLETED",
          actorId: doctorId,
        })
      ).rejects.toThrow("[ClinicalOrderTransitionGuard]");
    });
  });

  describe("2. ClinicalOrder Event Contract", () => {
    it("should format standardized clinical order event payload", () => {
      const payload = clinicalOrderEventContract.createEventPayload({
        event_type: "ORDER_STATUS_CHANGED",
        domain: "LABORATORY",
        clinical_order_id: clinicalOrderId,
        patient_id: patientId,
        previous_state: "ORDERED",
        new_state: "PREPARED",
        actor: doctorId,
      });

      expect(payload).toBeDefined();
      expect(payload.domain).toBe("LABORATORY");
      expect(payload.previous_state).toBe("ORDERED");
      expect(payload.new_state).toBe("PREPARED");
      expect(payload.timestamp).toBeDefined();
    });

    it("should dispatch standardized event across timeline and audit", async () => {
      const dispatched = await clinicalOrderEventContract.dispatchEvent({
        event_type: "LAB_SPECIMEN_COLLECTED",
        domain: "LABORATORY",
        clinical_order_id: clinicalOrderId,
        patient_id: patientId,
        previous_state: "ORDERED",
        new_state: "PREPARED",
        actor: doctorId,
      });

      expect(dispatched.event_type).toBe("LAB_SPECIMEN_COLLECTED");
    });
  });

  describe("3. Unified Clinical SLA Engine", () => {
    it("should evaluate STAT SLA targets (30 min duration)", () => {
      const now = new Date();
      const sla = unifiedClinicalSLAEngine.evaluateSLA(now, "STAT", "LABORATORY");

      expect(sla.priority).toBe("STAT");
      expect(sla.allowed_duration_minutes).toBe(30);
      expect(sla.status).toBe("SLA_OK");
    });

    it("should detect SLA breach for overdue orders and trigger escalation", async () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 60 mins ago (STAT limit is 30 mins)
      const slaInfo = unifiedClinicalSLAEngine.evaluateSLA(pastDate, "STAT", "LABORATORY");

      expect(slaInfo.status).toBe("SLA_BREACHED");
      expect(slaInfo.elapsed_minutes).toBeGreaterThanOrEqual(60);
    });
  });

  describe("4. Clinical Operations Analytics Foundation", () => {
    it("should compute operations analytics across domain orders", async () => {
      const analytics = await clinicalOperationsAnalyticsService.getClinicalOperationsAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.total_orders).toBeGreaterThanOrEqual(1);
      expect(analytics.orders_by_domain.LABORATORY).toBeGreaterThanOrEqual(1);
      expect(analytics.total_sla_breaches).toBeGreaterThanOrEqual(1);
    });
  });
});
