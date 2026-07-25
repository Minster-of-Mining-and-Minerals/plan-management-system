"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const medicationCatalogService = require("../services/medication/medicationCatalogService");
const medicationAllergyChecker = require("../services/medication/medicationAllergyChecker");
const drugInteractionService = require("../services/medication/drugInteractionService");
const duplicateTherapyService = require("../services/medication/duplicateTherapyService");
const doseSafetyService = require("../services/medication/doseSafetyService");
const medicationSafetyService = require("../services/medication/medicationSafetyService");
const prescriptionService = require("../services/prescriptionService");

jest.setTimeout(30000);

describe("Phase 2.8.2 — Medication Intelligence & Clinical Safety Engine", () => {
  let patientId;
  let doctorId;
  let appointmentId;
  let prescriptionId;
  let catalogMedId;
  let alertIdToOverride;

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
      appointment_type: "Medication Safety Encounter",
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
      notes: "Encounter for Medication Safety Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.MedicationCatalog.sync({ alter: true });
    await db.PrescriptionItem.sync({ alter: true });
    await db.DrugInteraction.sync({ alter: true });
    await db.MedicationSafetyAlert.sync({ alter: true });
    await db.PatientAllergy.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Safety Patient John",
      email: `safety_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Safety Lead",
      email: `safety_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    // Create Patient Allergy: Penicillin (HIGH severity)
    await db.PatientAllergy.create({
      allergy_id: uuidv4(),
      patient_id: patientId,
      allergen: "Penicillin",
      severity: "HIGH",
      reaction: "Anaphylaxis and hives",
      created_by: doctorId,
    });

    // Create Prescription
    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Safety Evaluation Test Prescription",
        signature_type: "template",
        items: [
          { item_name: "Amoxicillin 500mg Capsule", dosage: "500mg", quantity: "21" },
        ],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;
  });

  describe("1. Master Medication Catalog Foundation", () => {
    it("should create medication catalog entry and search catalog", async () => {
      const med = await medicationCatalogService.createMedication({
        generic_name: "Amoxicillin",
        brand_name: "Amoxil",
        medication_code: `AMOX-${uuidv4().slice(0, 4)}`,
        dosage_form: "Capsule",
        strength: "500mg",
        route: "Oral",
      });

      expect(med).toBeDefined();
      expect(med.generic_name).toBe("Amoxicillin");
      catalogMedId = med.id;

      const searchResults = await medicationCatalogService.searchMedications("Amox");
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults.some((m) => m.id === catalogMedId)).toBe(true);
    });
  });

  describe("2. Drug Allergy Checking", () => {
    it("should detect Penicillin allergy when Amoxicillin is prescribed", async () => {
      const alerts = await medicationAllergyChecker.checkAllergies(patientId, [
        { item_name: "Amoxicillin 500mg Capsule" },
      ]);

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].type).toBe("ALLERGY");
      expect(alerts[0].severity).toBe("SEVERE");
      expect(alerts[0].allergen).toBe("Penicillin");
    });
  });

  describe("3. Drug-Drug Interaction Checking", () => {
    it("should flag severe interaction when Warfarin and Ibuprofen are co-prescribed", async () => {
      const alerts = await drugInteractionService.checkInteractions(patientId, [
        { item_name: "Warfarin 5mg Tablet" },
        { item_name: "Ibuprofen 400mg Tablet" },
      ]);

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].type).toBe("INTERACTION");
      expect(alerts[0].severity).toBe("SEVERE");
      expect(alerts[0].message).toContain("Ibuprofen");
    });
  });

  describe("4. Duplicate Therapy Detection", () => {
    it("should detect duplicate therapy when same medication is listed twice", async () => {
      const alerts = await duplicateTherapyService.checkDuplicateTherapy(patientId, [
        { item_name: "Metformin 500mg" },
        { item_name: "Metformin 500mg" },
      ]);

      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].type).toBe("DUPLICATE_THERAPY");
      expect(alerts[0].severity).toBe("WARNING");
    });
  });

  describe("5. Complete Medication Safety Evaluation & Clinical Override", () => {
    it("should evaluate overall prescription safety and persist alerts", async () => {
      const assessment = await medicationSafetyService.evaluatePrescriptionSafety(
        {
          patient_id: patientId,
          prescription_id: prescriptionId,
          items: [
            { item_name: "Amoxicillin 500mg Capsule", dosage: "500mg" },
            { item_name: "Warfarin 5mg Tablet", dosage: "5mg" },
            { item_name: "Ibuprofen 400mg Tablet", dosage: "400mg" },
          ],
        },
        doctorId
      );

      expect(assessment).toBeDefined();
      expect(assessment.has_warnings).toBe(true);
      expect(assessment.overall_severity).toBe("SEVERE");
      expect(assessment.persisted_alerts.length).toBeGreaterThanOrEqual(1);

      alertIdToOverride = assessment.persisted_alerts[0].alert_id;
    });

    it("should record doctor override with mandatory clinical reason", async () => {
      const overridden = await medicationSafetyService.overrideSafetyAlert(
        alertIdToOverride,
        "Patient previously tolerated medication combination under close clinical supervision",
        doctorId
      );

      expect(overridden).toBeDefined();
      expect(overridden.status).toBe("OVERRIDDEN");
      expect(overridden.resolved_by).toBe(doctorId);
      expect(overridden.resolution_reason).toContain("tolerated medication");
    });
  });
});
