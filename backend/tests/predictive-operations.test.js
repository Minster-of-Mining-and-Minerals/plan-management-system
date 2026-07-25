"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const predictiveOperationsEngine = require("../services/predictive/predictiveOperationsEngine");
const clinicalOperationalRiskService = require("../services/predictive/clinicalOperationalRiskService");
const clinicalRecommendationService = require("../services/capacity/clinicalRecommendationService");
const hospitalAutomationEngine = require("../services/orchestration/hospitalAutomationEngine");
const predictionModelRegistryService = require("../services/predictive/predictionModelRegistryService");
const clinicalPredictionService = require("../services/predictive/clinicalPredictionService");
const predictiveAnalyticsService = require("../services/predictive/predictiveAnalyticsService");
const predictiveDashboardService = require("../services/predictive/predictiveDashboardService");

jest.setTimeout(30000);

describe("Phase 2.10.4 — Predictive Clinical Operations Intelligence & AI Decision Support Engine", () => {
  let adminId;
  let doctorId;
  let patientId;

  beforeAll(async () => {
    await db.ClinicalPrediction.sync({ alter: true });
    await db.PredictionModelRegistry.sync({ alter: true });
    await db.OperationalRiskScore.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Predictive Admin",
      email: `pred_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Predictive Lead",
      email: `pred_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Predictive Patient",
      email: `pred_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;
  });

  describe("1. Predictive Operations Engine", () => {
    it("should generate operational predictions for queues, SLA breaches, and congestion risks", async () => {
      const predictions = await predictiveOperationsEngine.generatePredictions();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThanOrEqual(1);
      expect(predictions[0].probability).toBeGreaterThan(0);
      expect(Array.isArray(predictions[0].reason)).toBe(true);
    });
  });

  describe("2. Clinical Operational Risk Service", () => {
    it("should calculate real-time operational risk scores across departments", async () => {
      const riskScores = await clinicalOperationalRiskService.getOperationalRiskScores();
      expect(Array.isArray(riskScores)).toBe(true);
      expect(riskScores.length).toBeGreaterThanOrEqual(1);
      expect(riskScores[0].risk_score).toBeGreaterThan(0);
      expect(riskScores[0].risk_level).toBeDefined();
    });
  });

  describe("3. AI Decision Support Recommendations", () => {
    it("should generate AI decision recommendations based on predictive risk", async () => {
      const recs = await clinicalRecommendationService.getPredictiveRecommendations();
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThanOrEqual(1);

      const aiRec = recs.find((r) => r.id.startsWith("ai-rec"));
      expect(aiRec).toBeDefined();
      expect(aiRec.confidence_score).toBeGreaterThan(0);
    });
  });

  describe("4. Preventive Automation", () => {
    it("should execute preventive automated action and emit timeline event", async () => {
      const prevRes = await hospitalAutomationEngine.executePreventiveAction(
        { action_type: "PREVENTIVE_STAFF_REALLOCATION", department: "RADIOLOGY" },
        adminId
      );

      expect(prevRes).toBeDefined();
      expect(prevRes.status).toBe("PREVENTED");
    });
  });

  describe("5. Prediction Model Registry (ML-Ready)", () => {
    it("should retrieve machine learning model metadata registry", async () => {
      const models = await predictionModelRegistryService.getModelRegistry();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThanOrEqual(1);
      expect(models[0].accuracy_score).toBeGreaterThan(90);
    });
  });

  describe("6. Prediction History & Efficacy", () => {
    it("should retrieve prediction history and accuracy scores", async () => {
      const history = await clinicalPredictionService.getPredictionHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("7. Predictive Analytics Service", () => {
    it("should calculate prediction accuracy, false positives, and risk reduction rates", async () => {
      const analytics = await predictiveAnalyticsService.getPredictiveAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.prediction_accuracy_pct).toBeGreaterThan(90);
      expect(analytics.false_positive_rate_pct).toBeLessThan(10);
      expect(analytics.prevented_incidents_count).toBeGreaterThan(0);
    });
  });

  describe("8. Executive & Department Predictive Intelligence Dashboards", () => {
    it("should aggregate executive predictive health dashboard", async () => {
      const dashboard = await predictiveDashboardService.getPredictiveDashboard(adminId);
      expect(dashboard).toBeDefined();
      expect(typeof dashboard.hospital_future_risk_score).toBe("number");
      expect(Array.isArray(dashboard.next_24h_predictions)).toBe(true);
    });

    it("should filter predictions by department in department prediction panel", async () => {
      const deptPred = await predictiveDashboardService.getDepartmentPredictions("RADIOLOGY");
      expect(deptPred).toBeDefined();
      expect(deptPred.department).toBe("RADIOLOGY");
      expect(deptPred.current_status).toBeDefined();
    });
  });
});
