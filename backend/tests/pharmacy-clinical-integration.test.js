"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const prescriptionService = require("../services/prescriptionService");
const pharmacyService = require("../services/pharmacyService");
const pharmacyPrescriptionService = require("../services/pharmacyPrescriptionService");
const pharmacyClinicalIntegrationService = require("../services/pharmacyClinicalIntegrationService");

describe("Phase 2.8.1 — Pharmacy Clinical Integration Foundation", () => {
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
      appointment_type: "Pharmacy Clinical Encounter",
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
      notes: "Encounter for Amoxicillin & Ibuprofen Prescription",
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
      full_name: "Pharmacy Clinical Patient",
      email: `pharm_clin_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Prescribing Physician Doc",
      email: `pharm_clin_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const pharmacist = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lead Pharmacist Staff",
      email: `pharm_staff_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    pharmacistId = pharmacist.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    // Create Pharmacy Organization
    const pharmacy = await pharmacyService.createPharmacy(
      {
        pharmacy_name: `NovaCure Central Pharmacy ${uuidv4().slice(0, 4)}`,
        pharmacy_code: `PHARM-MAIN-${uuidv4().slice(0, 4).toUpperCase()}`,
        phone: "+1-555-0199",
      },
      doctorId
    );
    pharmacyId = pharmacy.pharmacy_id;

    // Link Pharmacist User to Pharmacy
    await db.PharmacyUserProfile.create({
      pharmacy_user_profile_id: uuidv4(),
      user_id: pharmacistId,
      pharmacy_id: pharmacyId,
      portal_role: "admin",
      is_active: true,
    });

    // Create EMR Prescription
    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Acute Bronchitis Treatment",
        signature_type: "template",
        notes: "Take oral medications after meals",
        items: [
          {
            item_name: "Amoxicillin 500mg Capsule",
            strength: "500mg",
            route: "oral",
            dosage: "1 capsule",
            frequency: "Three times daily",
            duration: "7 days",
            quantity: "21 Capsules",
          },
          {
            item_name: "Ibuprofen 400mg Tablet",
            strength: "400mg",
            route: "oral",
            dosage: "1 tablet",
            frequency: "As needed for pain",
            duration: "5 days",
            quantity: "15 Tablets",
          },
        ],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;
  });

  describe("1. Clinical Order Creation for Pharmacy Domain", () => {
    it("should create ClinicalOrder with order_type = PHARMACY for an issued prescription", async () => {
      const order = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescriptionId, doctorId);

      expect(order).toBeDefined();
      expect(order.order_type).toBe("PHARMACY");
      expect(order.prescription_id).toBe(prescriptionId);
      expect(order.status).toBe("SUBMITTED");
      expect(order.pharmacy_status).toBe("PENDING_FORWARD");
      expect(order.order_items.length).toBe(2);
      clinicalOrderId = order.order_id;
    });

    it("should retrieve existing pharmacy clinical order if already created", async () => {
      const existing = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescriptionId, doctorId);
      expect(existing.order_id).toBe(clinicalOrderId);
    });
  });

  describe("2. Prescription Forwarding & Order Transmission", () => {
    it("should forward clinical order to pharmacy and update EMR status to IN_PROGRESS", async () => {
      const result = await pharmacyClinicalIntegrationService.forwardToPharmacy(clinicalOrderId, pharmacyId, doctorId);

      expect(result).toBeDefined();
      expect(result.order.status).toBe("IN_PROGRESS");
      expect(result.order.pharmacy_status).toBe("FORWARDED");
      expect(result.forward).toBeDefined();

      pharmacyPrescriptionId = result.forward.pharmacy_prescription_id;
    });

    it("should query pharmacy clinical order status and history", async () => {
      const statusData = await pharmacyClinicalIntegrationService.getPharmacyOrderStatus(clinicalOrderId);
      expect(statusData).toBeDefined();
      expect(statusData.statusHistory.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Portal Dispensing Workflow Status Synchronization", () => {
    it("should sync RECEIVED status from pharmacy portal back to EMR ClinicalOrder", async () => {
      const updated = await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "RECEIVED", pharmacistId);
      expect(updated.status).toBe("IN_PROGRESS");
      expect(updated.pharmacy_status).toBe("RECEIVED");
    });

    it("should sync REVIEWING status from pharmacy portal", async () => {
      const updated = await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "REVIEWING", pharmacistId);
      expect(updated.pharmacy_status).toBe("REVIEWING");
    });

    it("should sync PREPARING status from pharmacy portal", async () => {
      const updated = await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "PREPARING", pharmacistId);
      expect(updated.pharmacy_status).toBe("PREPARING");
    });

    it("should sync PARTIALLY_DISPENSED status from pharmacy portal", async () => {
      const updated = await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "PARTIALLY_DISPENSED", pharmacistId);
      expect(updated.pharmacy_status).toBe("PARTIALLY_DISPENSED");
    });

    it("should sync DISPENSED and COMPLETED status and set EMR status to COMPLETED", async () => {
      const updated = await pharmacyClinicalIntegrationService.syncPharmacyStatus(pharmacyPrescriptionId, "COMPLETED", pharmacistId);
      expect(updated.status).toBe("COMPLETED");
      expect(updated.pharmacy_status).toBe("COMPLETED");
    });
  });

  describe("4. Patient Pharmacy History & Timeline Verification", () => {
    it("should query complete patient pharmacy clinical history", async () => {
      const history = await pharmacyClinicalIntegrationService.getPatientPharmacyHistory(patientId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history.some((o) => o.order_id === clinicalOrderId)).toBe(true);
    });
  });
});
