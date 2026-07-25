"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalPatientContextService = require("../services/clinicalIntelligence/clinicalPatientContextService");
const clinicalDecisionSupportEngine = require("../services/clinicalIntelligence/clinicalDecisionSupportEngine");
const patientRiskAssessmentService = require("../services/clinicalIntelligence/patientRiskAssessmentService");
const clinicalAlertService = require("../services/clinicalIntelligence/clinicalAlertService");
const clinicalProblemService = require("../services/clinicalIntelligence/clinicalProblemService");

jest.setTimeout(30000);

describe("Phase 2.9.3 — Clinical Intelligence, Decision Support & Patient Context Engine", () => {
  let patientId;
  let doctorId;
  let reviewerId;

  beforeAll(async () => {
    await db.ClinicalProblem.sync({ alter: true });
    await db.ClinicalAlert.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Intelligence Test Patient",
      email: `intel_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Intelligence Lead",
      email: `intel_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const reviewer = await db.User.create({
      user_id: uuidv4(),
      full_name: "Intelligence Supervisor",
      email: `intel_super_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    reviewerId = reviewer.user_id;

    // Seed patient profile
    await db.PatientProfile.create({
      patient_profile_id: uuidv4(),
      user_id: patientId,
      patient_code: `INP-${uuidv4().slice(0, 8).toUpperCase()}`,
      date_of_birth: "1985-06-15",
      gender: "MALE",
      blood_group: "B+",
      patient_status: "active",
      registered_by: doctorId,
    });

    // Seed allergy
    await db.PatientAllergy.create({
      allergy_id: uuidv4(),
      patient_id: patientId,
      allergen: "Penicillin",
      severity: "HIGH",
      reaction: "Anaphylaxis",
      created_by: doctorId,
    });
  });

  describe("1. Patient Context Engine", () => {
    it("should generate unified patient intelligence snapshot", async () => {
      const snapshot = await clinicalPatientContextService.getPatientSnapshot(patientId);
      expect(snapshot).toBeDefined();
      expect(snapshot.patient_id).toBe(patientId);
      expect(snapshot.demographics).toBeDefined();
      expect(Array.isArray(snapshot.allergies)).toBe(true);
      expect(Array.isArray(snapshot.active_medications)).toBe(true);
      expect(Array.isArray(snapshot.recent_lab_results)).toBe(true);
      expect(Array.isArray(snapshot.recent_radiology_reports)).toBe(true);
      expect(Array.isArray(snapshot.active_problems)).toBe(true);
      expect(Array.isArray(snapshot.open_alerts)).toBe(true);
    });

    it("should include allergy in patient snapshot", async () => {
      const snapshot = await clinicalPatientContextService.getPatientSnapshot(patientId);
      expect(snapshot.allergies.length).toBeGreaterThanOrEqual(1);
      expect(snapshot.allergies[0].allergen).toBe("Penicillin");
    });
  });

  describe("2. Clinical Problem List", () => {
    let problemId;

    it("should add a clinical problem to patient problem list", async () => {
      const problem = await clinicalProblemService.addProblem(
        {
          patient_id: patientId,
          problem_name: "Type 2 Diabetes Mellitus",
          severity: "HIGH",
          status: "ACTIVE",
          onset_date: "2020-01-01",
        },
        doctorId
      );
      expect(problem).toBeDefined();
      expect(problem.status).toBe("ACTIVE");
      expect(problem.severity).toBe("HIGH");
      problemId = problem.problem_id;
    });

    it("should list active problems for patient", async () => {
      const problems = await clinicalProblemService.listProblems(patientId, "ACTIVE");
      expect(problems.length).toBeGreaterThanOrEqual(1);
    });

    it("should resolve a clinical problem", async () => {
      const resolved = await clinicalProblemService.resolveProblem(problemId, doctorId);
      expect(resolved.status).toBe("RESOLVED");
    });
  });

  describe("3. Clinical Alert Lifecycle", () => {
    let alertId;

    it("should create an OPEN clinical alert", async () => {
      const alert = await clinicalAlertService.createAlert({
        patient_id: patientId,
        alert_type: "DRUG_ALLERGY",
        domain: "PHARMACY",
        severity: "CRITICAL",
        message: "Patient is allergic to Penicillin. Active prescription contains Amoxicillin.",
        recommendation: "Substitute with Azithromycin or another non-penicillin antibiotic.",
        created_by: doctorId,
      });
      expect(alert).toBeDefined();
      expect(alert.status).toBe("OPEN");
      alertId = alert.alert_id;
    });

    it("should acknowledge clinical alert", async () => {
      const ack = await clinicalAlertService.acknowledgeAlert(alertId, doctorId);
      expect(ack.status).toBe("ACKNOWLEDGED");
      expect(ack.acknowledged_by).toBe(doctorId);
    });

    it("should mark clinical alert as ACTION_TAKEN", async () => {
      const actionTaken = await clinicalAlertService.markActionTaken(alertId, reviewerId);
      expect(actionTaken.status).toBe("ACTION_TAKEN");
    });

    it("should dismiss a clinical alert", async () => {
      const newAlert = await clinicalAlertService.createAlert({
        patient_id: patientId,
        alert_type: "FOLLOW_UP",
        domain: "GENERAL",
        severity: "WARNING",
        message: "High severity problem requires follow-up lab investigation.",
        created_by: doctorId,
      });
      const dismissed = await clinicalAlertService.dismissAlert(newAlert.alert_id, reviewerId);
      expect(dismissed.status).toBe("DISMISSED");
    });
  });

  describe("4. Patient Risk Assessment", () => {
    it("should compute patient risk score across all domains", async () => {
      const risk = await patientRiskAssessmentService.computeRiskScore(patientId);
      expect(risk).toBeDefined();
      expect(risk.medication_risk).toBeGreaterThanOrEqual(0);
      expect(risk.disease_risk).toBeGreaterThanOrEqual(0);
      expect(risk.followup_risk).toBeGreaterThanOrEqual(0);
      expect(risk.overall_risk_score).toBeGreaterThanOrEqual(0);
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(risk.risk_level);
    });

    it("should include patient with allergy in risk factor count", async () => {
      const risk = await patientRiskAssessmentService.computeRiskScore(patientId);
      expect(risk.factors.allergy_count).toBeGreaterThanOrEqual(1);
      expect(risk.medication_risk).toBeGreaterThan(0);
    });
  });

  describe("5. Clinical Decision Support Engine", () => {
    it("should evaluate patient clinical context and generate alerts", async () => {
      const result = await clinicalDecisionSupportEngine.evaluatePatientContext(patientId, doctorId);
      expect(result).toBeDefined();
      expect(result.patient_id).toBe(patientId);
      expect(typeof result.alerts_generated).toBe("number");
      expect(Array.isArray(result.alert_details)).toBe(true);
    });
  });

  describe("6. Cross-Domain Alert Retrieval", () => {
    it("should retrieve all alerts for a patient with status filter", async () => {
      const openAlerts = await clinicalAlertService.getAlertsForPatient(patientId, { status: "OPEN" });
      expect(Array.isArray(openAlerts)).toBe(true);
    });

    it("should retrieve all alerts regardless of status", async () => {
      const allAlerts = await clinicalAlertService.getAlertsForPatient(patientId);
      expect(allAlerts.length).toBeGreaterThanOrEqual(1);
    });
  });
});
