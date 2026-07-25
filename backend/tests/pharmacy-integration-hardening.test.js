"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const prescriptionService = require("../services/prescriptionService");
const pharmacyService = require("../services/pharmacyService");
const pharmacyClinicalIntegrationService = require("../services/pharmacyClinicalIntegrationService");
const pharmacyClinicalResultService = require("../services/pharmacyClinicalResultService");
const pharmacyPrescriptionSyncService = require("../services/pharmacyPrescriptionSyncService");
const { pharmacyWorkflowStateMachine } = require("../services/pharmacy/pharmacyWorkflowStateMachine");

jest.setTimeout(30000);

describe("Phase 2.8.1-H — Pharmacy Clinical Integration Hardening & Completion", () => {
  let patientId;
  let doctorId;
  let pharmacistId;
  let appointmentId;
  let prescriptionId;
  let pharmacyId;
  let clinicalOrderId;
  let pharmacyPrescriptionId;

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
      appointment_type: "Pharmacy Hardening Encounter",
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
      notes: "Encounter for Hardened Pharmacy Workflow",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    await db.ClinicalOrderStatusHistory.sync({ alter: true });
    if (db.Prescription) await db.Prescription.sync({ alter: true });
    if (db.PrescriptionItem) await db.PrescriptionItem.sync({ alter: true });
    if (db.Pharmacy) await db.Pharmacy.sync({ alter: true });
    if (db.PharmacyPrescription) await db.PharmacyPrescription.sync({ alter: true });
    if (db.PharmacyPrescriptionItem) await db.PharmacyPrescriptionItem.sync({ alter: true });
    if (db.PrescriptionPharmacyForward) await db.PrescriptionPharmacyForward.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Pharmacy Hardened Patient",
      email: `pharm_hard_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Hardened Physician Doc",
      email: `pharm_hard_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const pharmacist = await db.User.create({
      user_id: uuidv4(),
      full_name: "Hardened Pharmacist Staff",
      email: `pharm_hard_staff_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    pharmacistId = pharmacist.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const pharmacy = await pharmacyService.createPharmacy(
      {
        pharmacy_name: `Hardened Pharmacy ${uuidv4().slice(0, 4)}`,
        pharmacy_code: `PHARM-HARD-${uuidv4().slice(0, 4).toUpperCase()}`,
        phone: "+1-555-0299",
      },
      doctorId
    );
    pharmacyId = pharmacy.pharmacy_id;

    await db.PharmacyUserProfile.create({
      pharmacy_user_profile_id: uuidv4(),
      user_id: pharmacistId,
      pharmacy_id: pharmacyId,
      portal_role: "admin",
      is_active: true,
    });

    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Hardened Clinical Prescription",
        signature_type: "template",
        notes: "Take oral medications as prescribed",
        items: [
          {
            item_name: "Ciprofloxacin 500mg Tablet",
            strength: "500mg",
            route: "oral",
            dosage: "1 tablet",
            frequency: "Twice daily",
            duration: "5 days",
            quantity: "10 Tablets",
          },
        ],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;

    const order = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescriptionId, doctorId);
    clinicalOrderId = order.order_id;

    const forwardRes = await pharmacyClinicalIntegrationService.forwardToPharmacy(clinicalOrderId, pharmacyId, doctorId);
    pharmacyPrescriptionId = forwardRes.forward.pharmacy_prescription_id;
  });

  describe("1. Pharmacy Workflow State Machine Enforcement", () => {
    it("should allow valid state transitions in order", () => {
      expect(pharmacyWorkflowStateMachine.canTransition("FORWARDED", "RECEIVED")).toBe(true);
      expect(pharmacyWorkflowStateMachine.canTransition("RECEIVED", "REVIEWING")).toBe(true);
      expect(pharmacyWorkflowStateMachine.canTransition("REVIEWING", "PREPARING")).toBe(true);
      expect(pharmacyWorkflowStateMachine.canTransition("PREPARING", "COMPLETED")).toBe(true);
    });

    it("should block invalid state transitions (e.g. COMPLETED -> PREPARING)", () => {
      expect(pharmacyWorkflowStateMachine.canTransition("COMPLETED", "PREPARING")).toBe(false);
      expect(() => {
        pharmacyWorkflowStateMachine.validateTransition("COMPLETED", "PREPARING");
      }).toThrow("Invalid pharmacy workflow status transition");
    });
  });

  describe("2. Pharmacy Clinical Order Result Adapter Generation", () => {
    it("should generate ClinicalOrderResult (result_type = PHARMACY_DISPENSING) when dispensing completes", async () => {
      await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "RECEIVED", pharmacistId);
      await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "PREPARING", pharmacistId);
      await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "COMPLETED", pharmacistId);

      const result = await pharmacyClinicalResultService.getPharmacyResult(clinicalOrderId);

      expect(result).toBeDefined();
      expect(result.order_id).toBe(clinicalOrderId);
      expect(result.verification_status).toBe("FINAL");
      expect(result.result_summary).toContain("Medication Dispensing Completed");
      expect(result.result_data.result_type).toBe("PHARMACY_DISPENSING");
      expect(result.result_data.medications_dispensed.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("3. Prescription Version Change Detection & Sync", () => {
    it("should detect prescription changes after forwarding and notify pharmacy", async () => {
      const syncResult = await pharmacyPrescriptionSyncService.detectPrescriptionChanges(prescriptionId, doctorId);

      expect(syncResult).toBeDefined();
      expect(syncResult.changed).toBe(true);
      expect(syncResult.prescription_id).toBe(prescriptionId);
    });

    it("should retrieve complete version history for a prescription", async () => {
      const versionHistory = await pharmacyPrescriptionSyncService.getPrescriptionVersionHistory(prescriptionId);

      expect(versionHistory).toBeDefined();
      expect(versionHistory.prescription.prescription_id).toBe(prescriptionId);
      expect(versionHistory.forwards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Doctor Approval Workflow Foundation", () => {
    it("should process doctor approval request for substitution", async () => {
      // Create another fresh order for approval test
      const appt2 = await createTestEncounter(patientId, doctorId);
      const rx2 = await prescriptionService.createPrescription(
        {
          appointment_id: appt2.appointment_id,
          patient_id: patientId,
          header_title: "Substitution Test Rx",
          signature_type: "template",
          items: [{ item_name: "Brand Drug A", quantity: "10" }],
        },
        doctorId
      );
      const order2 = await pharmacyClinicalIntegrationService.createPharmacyOrder(rx2.prescription_id, doctorId);
      await pharmacyClinicalIntegrationService.forwardToPharmacy(order2.order_id, pharmacyId, doctorId);

      const approvalOrder = await pharmacyClinicalIntegrationService.requestDoctorApproval(
        order2.order_id,
        "Brand Drug A out of stock. Proposing Generic Drug B 500mg.",
        pharmacistId
      );

      expect(approvalOrder.pharmacy_status).toBe("WAITING_DOCTOR_APPROVAL");
    });
  });
});
