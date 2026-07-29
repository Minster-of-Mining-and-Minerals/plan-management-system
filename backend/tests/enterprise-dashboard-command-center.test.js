"use strict";

const request = require("supertest");
const { v4: uuidv4 } = require("uuid");
const { app } = require("../app");
const db = require("../models");
const dashboardAnalyticsService = require("../services/analytics/dashboardAnalyticsService");

describe("Phase 2.5.4 — Enterprise Dashboard Intelligence & Command Center", () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    let superAdminRole = await db.Role.findOne({ where: { name: "Super Admin" } });
    if (!superAdminRole) {
      superAdminRole = await db.Role.findOne({ where: { code: "SUPER_ADMIN" } });
    }
    if (!superAdminRole) {
      superAdminRole = await db.Role.create({
        role_id: "00000000-0000-4000-8000-000000000002",
        name: "Super Admin",
        code: "SUPER_ADMIN",
      });
    }

    adminUser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Command Center Tester",
      email: `command_admin_${uuidv4().slice(0, 6)}@novacure.com`,
      password: "Password_123!",
      account_type: "INTERNAL",
      role_id: superAdminRole.role_id,
      is_active: true,
      is_first_logged_in: false,
    });

    if (db.UserRoles) {
      await db.UserRoles.create({
        user_role_id: uuidv4(),
        user_id: adminUser.user_id,
        role_id: superAdminRole.role_id,
      }).catch(() => {});
    }

    const jwt = require("jsonwebtoken");
    adminToken = jwt.sign(
      {
        user_id: adminUser.user_id,
        email: adminUser.email,
        account_type: adminUser.account_type,
        role_id: adminUser.role_id,
      },
      process.env.JWT_SECRET || "supersecretjwtkey",
      { expiresIn: "1h" }
    );
  });

  describe("1. Enterprise Intelligence Service Aggregations", () => {
    it("should compute Executive Overview KPIs with sparkline arrays and trend directions", async () => {
      const overview = await dashboardAnalyticsService.getExecutiveOverview({ period: "today" }, adminUser);
      expect(overview).toBeDefined();
      expect(overview.summary.kpi_metrics).toBeDefined();
      expect(overview.summary.kpi_metrics.patients.sparkline.length).toBe(7);
      expect(overview.summary.kpi_metrics.financial.direction).toBeDefined();
    });

    it("should calculate active encounter pipeline stages and bottleneck detection", async () => {
      const pipeline = await dashboardAnalyticsService.getEncounterPipeline({ period: "today" }, adminUser);
      expect(pipeline).toBeDefined();
      expect(Array.isArray(pipeline.pipeline)).toBe(true);
      expect(pipeline.pipeline.length).toBe(8);
      expect(pipeline.total_active_pipeline).toBeGreaterThanOrEqual(0);
    });

    it("should monitor enterprise execution queues with SLA status & utilization", async () => {
      const queues = await dashboardAnalyticsService.getQueueMonitoring({}, adminUser);
      expect(queues).toBeDefined();
      expect(queues.queues.laboratory).toBeDefined();
      expect(queues.queues.laboratory.utilization_pct).toBeGreaterThan(0);
      expect(queues.queues.pharmacy.domain).toContain("Pharmacy");
    });

    it("should aggregate doctor productivity scores and active queues", async () => {
      const docs = await dashboardAnalyticsService.getDoctorProductivity({}, adminUser);
      expect(docs).toBeDefined();
      expect(Array.isArray(docs.doctors)).toBe(true);
      expect(docs.summary.total_active_clinicians).toBeGreaterThan(0);
    });

    it("should return nurse triage & medication metrics", async () => {
      const nurse = await dashboardAnalyticsService.getNurseMetrics({}, adminUser);
      expect(nurse).toBeDefined();
      expect(nurse.vitals_completed).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(nurse.triage_breakdown)).toBe(true);
    });

    it("should compute domain-specific intelligence for Lab, Radiology, and Pharmacy", async () => {
      const lab = await dashboardAnalyticsService.getLaboratoryIntelligence({}, adminUser);
      const rad = await dashboardAnalyticsService.getRadiologyIntelligence({}, adminUser);
      const pharm = await dashboardAnalyticsService.getPharmacyIntelligence({}, adminUser);

      expect(lab.verified_results).toBeGreaterThanOrEqual(0);
      expect(rad.verified_reports).toBeGreaterThanOrEqual(0);
      expect(pharm.top_prescribed_medications.length).toBeGreaterThan(0);
    });

    it("should calculate financial executive revenue sources & tender methods", async () => {
      const fin = await dashboardAnalyticsService.getFinancialExecutive({}, adminUser);
      expect(fin).toBeDefined();
      expect(fin.revenue_timeframes.monthly).toBeGreaterThan(0);
      expect(fin.payment_tenders.length).toBeGreaterThan(0);
    });

    it("should compute diagnosis, clinical order, care continuity, timeline, and facility stats", async () => {
      const diag = await dashboardAnalyticsService.getDiagnosisIntelligence({}, adminUser);
      const orders = await dashboardAnalyticsService.getClinicalOrderIntelligence({}, adminUser);
      const care = await dashboardAnalyticsService.getCareContinuityAnalytics({}, adminUser);
      const timeline = await dashboardAnalyticsService.getTimelineIntelligence({}, adminUser);
      const facility = await dashboardAnalyticsService.getFacilityStatistics({}, adminUser);

      expect(diag.top_diagnoses.length).toBeGreaterThan(0);
      expect(orders.orders_by_type.length).toBeGreaterThan(0);
      expect(care.care_continuity_score).toBeGreaterThan(0);
      expect(timeline.events.length).toBeGreaterThan(0);
      expect(facility.facilities.length).toBeGreaterThan(0);
    });

    it("should fetch raw drill-down dataset records for audit drawers", async () => {
      const res = await dashboardAnalyticsService.getDrillDownRecords("patients", { period: "today" });
      expect(res.metric_key).toBe("patients");
      expect(Array.isArray(res.records)).toBe(true);
    });
  });

  describe("2. Command Center REST API Endpoints & RBAC Protection", () => {
    it("GET /api/dashboard/overview returns 200 with JWT", async () => {
      const res = await request(app)
        .get("/api/dashboard/overview?period=month")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("GET /api/dashboard/pipeline returns 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/pipeline")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.pipeline).toBeDefined();
    });

    it("GET /api/dashboard/queues returns 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/queues")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.queues).toBeDefined();
    });

    it("GET /api/dashboard/doctor-productivity returns 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/doctor-productivity")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.doctors)).toBe(true);
    });

    it("GET /api/dashboard/financial-executive returns 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/financial-executive")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.revenue_timeframes).toBeDefined();
    });

    it("GET /api/dashboard/drilldown/patients returns 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/drilldown/patients")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.records)).toBe(true);
    });

    it("GET /api/dashboard/overview without authentication token returns 401", async () => {
      const res = await request(app).get("/api/dashboard/overview");
      expect(res.status).toBe(401);
    });
  });
});
