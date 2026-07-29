"use strict";

const request = require("supertest");
const { v4: uuidv4 } = require("uuid");
const { app } = require("../app");
const db = require("../models");
const dashboardAnalyticsService = require("../services/analytics/dashboardAnalyticsService");

describe("Phase 3.0 — Dynamic Enterprise Analytics Dashboard Transformation Engine", () => {
  let adminToken;
  let adminUser;
  let patientUser;
  let clinicianUser;

  beforeAll(async () => {
    // 1. Find or Create Super Admin Role
    let superAdminRole = await db.Role.findOne({ where: { name: "Super Admin" } });
    if (!superAdminRole) {
      superAdminRole = await db.Role.findOne({ where: { code: "SUPER_ADMIN" } });
    }
    if (!superAdminRole) {
      try {
        superAdminRole = await db.Role.create({
          role_id: "00000000-0000-4000-8000-000000000002",
          name: "Super Admin",
          code: "SUPER_ADMIN",
        });
      } catch (e) {
        superAdminRole = await db.Role.findOne({ where: { code: "SUPER_ADMIN" } });
      }
    }

    adminUser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Admin Analytics Tester",
      email: `analytics_admin_${uuidv4().slice(0, 6)}@novacure.com`,
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

    // 2. Create Sample Patient User
    patientUser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Patient Analytics Test",
      email: `analytics_patient_${uuidv4().slice(0, 6)}@novacure.com`,
      password: "Password_123!",
      account_type: "PATIENT",
      is_active: true,
      is_first_logged_in: false,
    });

    // 3. Create Sample Clinician User
    clinicianUser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Analytics Specialist",
      email: `analytics_dr_${uuidv4().slice(0, 6)}@novacure.com`,
      password: "Password_123!",
      account_type: "INTERNAL",
      is_active: true,
      is_first_logged_in: false,
    });
    clinicianUser.role = { name: "Doctor" };
  });

  describe("1. Dashboard Analytics Service Aggregations", () => {
    it("should compute Executive Healthcare Overview stats cleanly", async () => {
      const overview = await dashboardAnalyticsService.getExecutiveOverview({ period: "today" }, adminUser);
      expect(overview).toBeDefined();
      expect(overview.summary).toBeDefined();
      expect(typeof overview.summary.total_patients).toBe("number");
      expect(typeof overview.summary.appointments_today).toBe("number");
      expect(typeof overview.summary.payments_today_amount).toBe("number");
      expect(overview.summary.trends).toBeDefined();
      expect(typeof overview.summary.trends.encounters_pct).toBe("number");
    });

    it("should aggregate Real-Time Operational Dashboard & Queues", async () => {
      const op = await dashboardAnalyticsService.getOperationalDashboard({}, adminUser);
      expect(op).toBeDefined();
      expect(op.workflow).toBeDefined();
      expect(op.queues).toBeDefined();
      expect(op.queues.laboratory).toBeDefined();
      expect(op.queues.radiology).toBeDefined();
      expect(op.queues.pharmacy).toBeDefined();
      expect(Array.isArray(op.queues.laboratory.workflow_stages)).toBe(true);
    });

    it("should compute Clinical Analytics and Doctor Performance", async () => {
      const clinical = await dashboardAnalyticsService.getClinicalAnalytics({}, adminUser);
      expect(clinical).toBeDefined();
      expect(clinical.diagnoses).toBeDefined();
      expect(Array.isArray(clinical.diagnoses.top_diagnoses)).toBe(true);
      expect(clinical.orders_by_type).toBeDefined();
      expect(Array.isArray(clinical.doctor_performance)).toBe(true);
    });

    it("should calculate Financial Dashboard & Revenue Breakdown", async () => {
      const financial = await dashboardAnalyticsService.getFinancialAnalytics({}, adminUser);
      expect(financial).toBeDefined();
      expect(financial.revenue_overview).toBeDefined();
      expect(typeof financial.revenue_overview.today_revenue).toBe("number");
      expect(Array.isArray(financial.revenue_breakdown)).toBe(true);
    });

    it("should aggregate Department Performance metrics", async () => {
      const depts = await dashboardAnalyticsService.getDepartmentPerformance({}, adminUser);
      expect(depts).toBeDefined();
      expect(Array.isArray(depts.departments)).toBe(true);
      expect(depts.departments.length).toBeGreaterThan(0);
      expect(typeof depts.departments[0].load).toBe("number");
    });

    it("should return Role-Tailored views for clinicians", async () => {
      const roleView = await dashboardAnalyticsService.getRoleDashboard(clinicianUser);
      expect(roleView).toBeDefined();
      expect(roleView.role).toBe("DOCTOR");
      expect(roleView.title).toContain("Clinician Workstation Analytics");
    });
  });

  describe("2. Dashboard HTTP API Endpoints & Permission Protection", () => {
    it("GET /api/dashboard/overview should return 200 with JWT authentication", async () => {
      const res = await request(app)
        .get("/api/dashboard/overview?period=today")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
    });

    it("GET /api/dashboard/operational should return 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/operational")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.queues).toBeDefined();
    });

    it("GET /api/dashboard/clinical should return 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/clinical")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.diagnoses).toBeDefined();
    });

    it("GET /api/dashboard/financial should return 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/financial")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.revenue_overview).toBeDefined();
    });

    it("GET /api/dashboard/departments should return 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/departments")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.departments)).toBe(true);
    });

    it("GET /api/dashboard/role-view should return 200", async () => {
      const res = await request(app)
        .get("/api/dashboard/role-view")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBeDefined();
    });

    it("GET /api/dashboard/stats should maintain backward compatibility", async () => {
      const res = await request(app)
        .get("/api/dashboard/stats")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
    });

    it("GET /api/dashboard/overview without token should return 401 Unauthorized", async () => {
      const res = await request(app).get("/api/dashboard/overview");
      expect(res.status).toBe(401);
    });
  });
});
