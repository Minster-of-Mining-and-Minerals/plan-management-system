"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const { UnifiedClinicalOrderStateMachine, UNIFIED_CLINICAL_ORDER_STAGES } = require("../services/clinicalOrder/unifiedClinicalOrderStateMachine");
const unifiedTimelineHarmonizer = require("../services/clinicalOrder/unifiedTimelineHarmonizer");
const unifiedClinicalQueueService = require("../services/clinicalOrder/unifiedClinicalQueueService");
const unifiedClinicalBillingIntegrityService = require("../services/clinicalOrder/unifiedClinicalBillingIntegrityService");
const unifiedClinicalSLAEngine = require("../services/clinicalOrder/unifiedClinicalSLAEngine");
const clinicalOperationsAnalyticsService = require("../services/clinicalOrder/clinicalOperationsAnalyticsService");

jest.setTimeout(30000);

describe("Phase 2.9.1 — Future Domain Compatibility & Extensibility Test", () => {
  let patientId;
  let doctorId;
  let appointmentId;
  let physioOrderId;

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
      appointment_type: "Extensibility Encounter",
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
      notes: "Encounter for Extensibility Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Extensibility Patient",
      email: `ext_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Extensibility Lead",
      email: `ext_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    // Register a brand-new domain: PHYSIOTHERAPY
    const physioOrder = await clinicalOrderService.createOrder(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        order_type: "PHYSIOTHERAPY",
        title: "Post-op Lumbar Rehabilitation Session",
        priority: "ROUTINE",
      },
      doctorId
    );
    physioOrderId = physioOrder.order_id;
  });

  it("should register new PHYSIOTHERAPY domain order in ClinicalOrder core", async () => {
    const order = await db.ClinicalOrder.findByPk(physioOrderId);
    expect(order).toBeDefined();
    expect(order.order_type).toBe("PHYSIOTHERAPY");
  });

  it("should map new domain order status into Unified State Machine stage", async () => {
    const stage = UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("PHYSIOTHERAPY", "ordered");
    expect(stage).toBe(UNIFIED_CLINICAL_ORDER_STAGES.ORDERED);
  });

  it("should emit timeline events for new PHYSIOTHERAPY domain", async () => {
    await expect(
      unifiedTimelineHarmonizer.emitOrderStateTransition({
        patientId,
        clinicalOrderId: physioOrderId,
        orderType: "PHYSIOTHERAPY",
        domainStatus: "ordered",
        actorId: doctorId,
      })
    ).resolves.not.toThrow();
  });

  it("should list new domain order in Unified Work Queue with SLA tracking", async () => {
    const queue = await unifiedClinicalQueueService.getUnifiedWorkQueue({ order_type: "PHYSIOTHERAPY" });
    expect(queue.length).toBeGreaterThanOrEqual(1);
    expect(queue[0].order_type).toBe("PHYSIOTHERAPY");
  });

  it("should evaluate SLA for new PHYSIOTHERAPY domain", () => {
    const sla = unifiedClinicalSLAEngine.evaluateSLA(new Date(), "ROUTINE", "PHYSIOTHERAPY");
    expect(sla.domain).toBe("PHYSIOTHERAPY");
    expect(sla.status).toBe("SLA_OK");
  });

  it("should process billing integrity for new PHYSIOTHERAPY domain", async () => {
    const billing = await unifiedClinicalBillingIntegrityService.processBillingIntegrity(physioOrderId, "ORDER_COMPLETED", doctorId);
    expect(billing.status).toBe("CHARGE_VERIFIED");
  });

  it("should include new PHYSIOTHERAPY domain in Clinical Operations Analytics", async () => {
    const analytics = await clinicalOperationsAnalyticsService.getClinicalOperationsAnalytics();
    expect(analytics.orders_by_domain.PHYSIOTHERAPY).toBeGreaterThanOrEqual(1);
  });
});
