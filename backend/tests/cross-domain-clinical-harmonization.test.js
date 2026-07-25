"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { UnifiedClinicalOrderStateMachine, UNIFIED_CLINICAL_ORDER_STAGES } = require("../services/clinicalOrder/unifiedClinicalOrderStateMachine");
const unifiedTimelineHarmonizer = require("../services/clinicalOrder/unifiedTimelineHarmonizer");
const unifiedClinicalQueueService = require("../services/clinicalOrder/unifiedClinicalQueueService");
const unifiedClinicalBillingIntegrityService = require("../services/clinicalOrder/unifiedClinicalBillingIntegrityService");
const clinicalOrderService = require("../services/clinicalOrderService");

jest.setTimeout(30000);

describe("Phase 2.9 — Cross-Domain Clinical Consistency Audit & Platform Harmonization", () => {
  let patientId;
  let doctorId;
  let staffId;
  let labOrderId;
  let radiologyOrderId;
  let pharmacyOrderId;

  let appointmentId;

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
      appointment_type: "Harmonization Encounter",
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
      notes: "Encounter for Harmonization Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Harmonization Test Patient",
      email: `harm_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Harmonization Lead",
      email: `harm_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Clinical Staff Lead",
      email: `harm_staff_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    // Create Laboratory Order
    const labOrder = await clinicalOrderService.createOrder(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        order_type: "LABORATORY",
        title: "Complete Blood Count (CBC)",
      },
      doctorId
    );
    labOrderId = labOrder.order_id;

    // Create Radiology Order
    const radOrder = await clinicalOrderService.createOrder(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        order_type: "RADIOLOGY",
        title: "Chest X-Ray PA View",
      },
      doctorId
    );
    radiologyOrderId = radOrder.order_id;

    // Create Pharmacy Order
    const pharmOrder = await clinicalOrderService.createOrder(
      {
        patient_id: patientId,
        appointment_id: appointmentId,
        order_type: "PHARMACY",
        title: "Amoxicillin 500mg Oral",
      },
      doctorId
    );
    pharmacyOrderId = pharmOrder.order_id;
  });

  describe("1. Unified Clinical Order State Machine Mapping", () => {
    it("should map Laboratory domain statuses into unified platform stages", () => {
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "ordered")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.ORDERED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "specimen_collected")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.PREPARED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "in_progress")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "completed")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "verified")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("LABORATORY", "cancelled")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.CANCELLED);
    });

    it("should map Radiology domain statuses into unified platform stages", () => {
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("RADIOLOGY", "ordered")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.ORDERED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("RADIOLOGY", "scheduled")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.PREPARED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("RADIOLOGY", "in_progress")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("RADIOLOGY", "released")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.VERIFIED);
    });

    it("should map Pharmacy domain statuses into unified platform stages", () => {
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("PHARMACY", "DRAFT")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.ORDERED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("PHARMACY", "STOCK_RESERVED")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.IN_PROGRESS);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("PHARMACY", "DISPENSED")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.FULFILLED);
      expect(UnifiedClinicalOrderStateMachine.mapDomainStatusToUnifiedStage("PHARMACY", "COMPLETED")).toBe(UNIFIED_CLINICAL_ORDER_STAGES.COMPLETED);
    });

    it("should retrieve unified status from a ClinicalOrder record", async () => {
      const order = await db.ClinicalOrder.findByPk(labOrderId);
      const stage = UnifiedClinicalOrderStateMachine.getUnifiedStatus(order);
      expect(stage).toBe(UNIFIED_CLINICAL_ORDER_STAGES.ORDERED);
    });
  });

  describe("2. Timeline Consistency & Event Harmonization", () => {
    it("should emit harmonized CLINICAL_ORDER_STATE_CHANGED timeline event across all domains", async () => {
      await expect(
        unifiedTimelineHarmonizer.emitOrderStateTransition({
          patientId,
          clinicalOrderId: labOrderId,
          orderType: "LABORATORY",
          domainStatus: "specimen_collected",
          actorId: staffId,
        })
      ).resolves.not.toThrow();

      await expect(
        unifiedTimelineHarmonizer.emitOrderStateTransition({
          patientId,
          clinicalOrderId: radiologyOrderId,
          orderType: "RADIOLOGY",
          domainStatus: "released",
          actorId: staffId,
        })
      ).resolves.not.toThrow();

      await expect(
        unifiedTimelineHarmonizer.emitOrderStateTransition({
          patientId,
          clinicalOrderId: pharmacyOrderId,
          orderType: "PHARMACY",
          domainStatus: "DISPENSED",
          actorId: staffId,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("3. Unified Work Queue & SLA Management", () => {
    it("should list cross-domain work queue with SLA calculation", async () => {
      const queue = await unifiedClinicalQueueService.getUnifiedWorkQueue();
      expect(queue).toBeDefined();
      expect(queue.length).toBeGreaterThanOrEqual(3);

      const labItem = queue.find((q) => q.order_id === labOrderId);
      expect(labItem).toBeDefined();
      expect(labItem.sla_status).toBe("SLA_OK");
    });

    it("should claim order assignment in work queue", async () => {
      const claimed = await unifiedClinicalQueueService.claimOrder(labOrderId, staffId);
      expect(claimed.assigned_to).toBe(staffId);
    });

    it("should reassign order assignment to another staff member", async () => {
      const reassigned = await unifiedClinicalQueueService.reassignOrder(labOrderId, doctorId);
      expect(reassigned.assigned_to).toBe(doctorId);
    });
  });

  describe("4. Unified Billing Integrity & Cancellation Handling", () => {
    it("should verify billing charge completion for clinical order", async () => {
      const result = await unifiedClinicalBillingIntegrityService.processBillingIntegrity(labOrderId, "ORDER_COMPLETED", staffId);
      expect(result.status).toBe("CHARGE_VERIFIED");
    });

    it("should process void/refund on order cancellation", async () => {
      const result = await unifiedClinicalBillingIntegrityService.processBillingIntegrity(labOrderId, "ORDER_CANCELLED", staffId);
      expect(result.status).toBe("CHARGE_VOIDED");
    });
  });
});
