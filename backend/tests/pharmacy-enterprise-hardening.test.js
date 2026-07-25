"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const pharmacyService = require("../services/pharmacyService");
const medicationCatalogService = require("../services/medication/medicationCatalogService");
const { PharmacyOrderStateMachine, PHARMACY_ORDER_STATES } = require("../services/pharmacy/pharmacyOrderStateMachine");
const pharmacyMARService = require("../services/pharmacy/pharmacyMARService");
const patientMedicationHistoryService = require("../services/pharmacy/patientMedicationHistoryService");
const pharmacyFormularyService = require("../services/pharmacy/pharmacyFormularyService");
const pharmacyReconciliationService = require("../services/pharmacy/pharmacyReconciliationService");
const pharmacyIntegrationAdapter = require("../services/pharmacy/pharmacyIntegrationAdapter");
const medicationSafetyService = require("../services/medication/medicationSafetyService");
const prescriptionService = require("../services/prescriptionService");
const pharmacyClinicalIntegrationService = require("../services/pharmacyClinicalIntegrationService");

jest.setTimeout(30000);

describe("Phase 2.8.5 — Pharmacy Enterprise Final Hardening, Interoperability & Optimization", () => {
  let patientId;
  let doctorId;
  let nurseId;
  let pharmacistId;
  let appointmentId;
  let pharmacyId;
  let medicationCatalogId;
  let prescriptionId;
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
      appointment_type: "Enterprise Hardening Encounter",
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
      notes: "Encounter for Enterprise Hardening Testing",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.MedicationAdministration.sync({ alter: true });
    await db.MedicationFormularyRule.sync({ alter: true });
    await db.MedicationReconciliation.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Enterprise Test Patient",
      email: `ent_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Enterprise Lead",
      email: `ent_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const nurse = await db.User.create({
      user_id: uuidv4(),
      full_name: "Nurse MAR Lead",
      email: `ent_nurse_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    nurseId = nurse.user_id;

    const pharmacist = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lead Enterprise Pharmacist",
      email: `ent_pharm_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PHARMACY",
      is_active: true,
    });
    pharmacistId = pharmacist.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const pharmacy = await pharmacyService.createPharmacy(
      { pharmacy_name: `Enterprise Pharmacy ${uuidv4().slice(0, 4)}`, pharmacy_code: `ENT-${uuidv4().slice(0, 4)}` },
      doctorId
    );
    pharmacyId = pharmacy.pharmacy_id;

    const med = await medicationCatalogService.createMedication({
      generic_name: `Ceftriaxone ${uuidv4().slice(0, 4)}`,
      brand_name: "Rocephin",
      dosage_form: "Injectable",
      strength: "1g",
    });
    medicationCatalogId = med.id;

    const rx = await prescriptionService.createPrescription(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        header_title: "Enterprise Hardening Prescription",
        signature_type: "template",
        items: [{ item_name: "Ceftriaxone 1g IV", quantity: "10" }],
      },
      doctorId
    );
    prescriptionId = rx.prescription_id;

    const order = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescriptionId, doctorId);
    clinicalOrderId = order.order_id;
  });

  describe("1. Complete Medication Order State Machine (11-Stage Transitions)", () => {
    it("should set initial status to DRAFT and transition to SUBMITTED", async () => {
      await db.ClinicalOrder.update({ status: PHARMACY_ORDER_STATES.DRAFT }, { where: { order_id: clinicalOrderId } });
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.SUBMITTED, doctorId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.SUBMITTED);
    });

    it("should transition order from SUBMITTED to SAFETY_CHECK_PENDING", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.SAFETY_CHECK_PENDING, doctorId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.SAFETY_CHECK_PENDING);
    });

    it("should transition order to SAFETY_APPROVED", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.SAFETY_APPROVED, doctorId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.SAFETY_APPROVED);
    });

    it("should transition order to SENT_TO_PHARMACY", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.SENT_TO_PHARMACY, doctorId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.SENT_TO_PHARMACY);
    });

    it("should transition order to PHARMACY_REVIEW", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.PHARMACY_REVIEW, pharmacistId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.PHARMACY_REVIEW);
    });

    it("should transition order to STOCK_RESERVED", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.STOCK_RESERVED, pharmacistId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.STOCK_RESERVED);
    });

    it("should transition order to DISPENSING", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.DISPENSING, pharmacistId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.DISPENSING);
    });

    it("should transition order to DISPENSED", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.DISPENSED, pharmacistId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.DISPENSED);
    });

    it("should transition order to COMPLETED", async () => {
      const order = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.COMPLETED, pharmacistId);
      expect(order.status || order.order_status).toBe(PHARMACY_ORDER_STATES.COMPLETED);
    });

    it("should reject invalid order state transition from COMPLETED", async () => {
      await expect(
        PharmacyOrderStateMachine.transitionState(clinicalOrderId, PHARMACY_ORDER_STATES.DRAFT, doctorId)
      ).rejects.toThrow("Invalid medication order status transition");
    });
  });

  describe("2. Medication Administration Record (MAR)", () => {
    it("should record GIVEN medication administration in MAR", async () => {
      const mar = await pharmacyMARService.recordAdministration(
        {
          patient_id: patientId,
          prescription_id: prescriptionId,
          medication_catalog_id: medicationCatalogId,
          dose: "1g IV",
          route: "Intravenous",
          status: "GIVEN",
        },
        nurseId
      );

      expect(mar).toBeDefined();
      expect(mar.status).toBe("GIVEN");
      expect(mar.administered_by).toBe(nurseId);
    });

    it("should record MISSED medication administration in MAR", async () => {
      const mar = await pharmacyMARService.recordAdministration(
        {
          patient_id: patientId,
          prescription_id: prescriptionId,
          dose: "1g IV",
          status: "MISSED",
          reason: "Patient sleeping during dose window",
        },
        nurseId
      );

      expect(mar.status).toBe("MISSED");
      expect(mar.reason).toBe("Patient sleeping during dose window");
    });

    it("should retrieve patient MAR administration records", async () => {
      const records = await pharmacyMARService.getPatientMAR(patientId);
      expect(records.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("3. Patient Longitudinal Medication Record", () => {
    it("should compile active and historical medication record for patient chart", async () => {
      const history = await patientMedicationHistoryService.getLongitudinalMedicationHistory(patientId);

      expect(history.patient_id).toBe(patientId);
      expect(history.active_medications.length).toBeGreaterThanOrEqual(1);
      expect(history.mar_administrations.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("4. Formulary & Hospital Policy Engine", () => {
    it("should set hospital formulary rule with department restrictions", async () => {
      const rule = await pharmacyFormularyService.setFormularyRule(
        {
          medication_catalog_id: medicationCatalogId,
          department_restriction: "Emergency Department, ICU",
          requires_approval: true,
        },
        pharmacistId
      );

      expect(rule).toBeDefined();
      expect(rule.requires_approval).toBe(true);
    });

    it("should restrict prescribing outside authorized departments", async () => {
      const validation = await pharmacyFormularyService.validateFormularyAccess(medicationCatalogId, "Outpatient Clinic");
      expect(validation.is_allowed).toBe(false);
      expect(validation.reason).toContain("restricted");
    });

    it("should allow prescribing within authorized department", async () => {
      const validation = await pharmacyFormularyService.validateFormularyAccess(medicationCatalogId, "Emergency Department");
      expect(validation.is_allowed).toBe(true);
    });
  });

  describe("5. Medication Reconciliation Engine", () => {
    it("should perform admission medication reconciliation and detect conflicts", async () => {
      const rec = await pharmacyReconciliationService.performReconciliation(
        {
          patient_id: patientId,
          reconciliation_type: "ADMISSION",
          home_medications: [{ name: "Ceftriaxone 1g" }, { name: "Aspirin 81mg" }],
          reconciled_medications: [{ name: "Ceftriaxone 1g" }],
        },
        doctorId
      );

      expect(rec).toBeDefined();
      expect(rec.reconciliation_type).toBe("ADMISSION");
      expect(rec.conflict_summary_json.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Advanced Decision Support (Pregnancy & Renal Safety)", () => {
    it("should flag CONTRAINDICATED alert for pregnancy-contraindicated medications", async () => {
      const result = await medicationSafetyService.evaluatePrescriptionSafety({
        patient_id: patientId,
        items: [
          {
            item_name: "Lisinopril 10mg",
            is_pregnant: true,
          },
        ],
      });

      expect(result.overall_severity).toBe("CONTRAINDICATED");
      const pregAlert = result.alerts.find((a) => a.type === "PREGNANCY_CONTRAINDICATION");
      expect(pregAlert).toBeDefined();
      expect(pregAlert.severity).toBe("CONTRAINDICATED");
    });

    it("should flag SEVERE alert for renal dose adjustment when eGFR is low", async () => {
      const result = await medicationSafetyService.evaluatePrescriptionSafety({
        patient_id: patientId,
        items: [
          {
            item_name: "Metformin 500mg",
            egfr: 20, // Low eGFR
          },
        ],
      });

      expect(result.overall_severity).toBe("SEVERE");
      const renalAlert = result.alerts.find((a) => a.type === "RENAL_DOSE_ADJUSTMENT");
      expect(renalAlert).toBeDefined();
      expect(renalAlert.severity).toBe("SEVERE");
    });
  });

  describe("7. External Interoperability Adapter (FHIR R4)", () => {
    it("should export prescription to FHIR R4 MedicationRequest JSON", async () => {
      const rx = await db.Prescription.findByPk(prescriptionId, {
        include: [{ model: db.PrescriptionItem, as: "items" }],
      });
      const fhirRequest = pharmacyIntegrationAdapter.exportToFHIRMedicationRequest(rx.get({ plain: true }));

      expect(fhirRequest).toBeDefined();
      expect(fhirRequest.resourceType).toBe("MedicationRequest");
      expect(fhirRequest.subject.reference).toBe(`Patient/${patientId}`);
    });

    it("should export fulfillment to FHIR R4 MedicationDispense JSON", async () => {
      const fhirDispense = pharmacyIntegrationAdapter.exportToFHIRMedicationDispense({
        id: uuidv4(),
        prescription_id: prescriptionId,
        fulfillment_status: "completed",
      });

      expect(fhirDispense).toBeDefined();
      expect(fhirDispense.resourceType).toBe("MedicationDispense");
    });
  });
});
