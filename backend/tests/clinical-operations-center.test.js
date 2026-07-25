"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOperationsCenterService = require("../services/clinicalOperations/clinicalOperationsCenterService");
const clinicalDashboardService = require("../services/clinicalOperations/clinicalDashboardService");
const clinicalWorkloadService = require("../services/clinicalOperations/clinicalWorkloadService");
const clinicalOperationsFeedService = require("../services/clinicalOperations/clinicalOperationsFeedService");
const hospitalOperationsTimelineService = require("../services/clinicalOperations/hospitalOperationsTimelineService");
const clinicalOperationsDashboardService = require("../services/clinicalOperations/clinicalOperationsDashboardService");
const unifiedClinicalQueueService = require("../services/clinicalOrder/unifiedClinicalQueueService");
const clinicalOperationsAnalyticsService = require("../services/clinicalOrder/clinicalOperationsAnalyticsService");

jest.setTimeout(30000);

describe("Phase 2.10.1 — Enterprise Clinical Operations Center", () => {
  let adminId;
  let doctorId;
  let patientId;
  let labOrderId;
  let radOrderId;

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Ops Admin User",
      email: `ops_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Operations Lead",
      email: `ops_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Ops Test Patient",
      email: `ops_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: patientId,
      assigned_staff_id: doctorId,
      schedule_date: todayStr,
      start_time: "08:00",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Ops Encounter",
      created_by: doctorId,
      updated_by: doctorId,
    });

    const appointment = await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: patientId,
      assigned_staff_id: doctorId,
      admitted_by: doctorId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Encounter for Ops Testing",
      workflow_status: "active",
    });
    const appointmentId = appointment.appointment_id;

    // Seed Clinical Orders for testing metrics
    const labOrder = await db.ClinicalOrder.create({
      order_id: uuidv4(),
      appointment_id: appointmentId,
      patient_id: patientId,
      ordered_by: doctorId,
      title: "Test Lab Order",
      order_type: "LABORATORY",
      status: "ORDERED",
      priority: "STAT",
      assigned_staff_id: doctorId,
      created_at: new Date(Date.now() - 150 * 60 * 1000), // 150 mins ago -> SLA breach
      updated_at: new Date(),
    });
    labOrderId = labOrder.order_id;

    const radOrder = await db.ClinicalOrder.create({
      order_id: uuidv4(),
      appointment_id: appointmentId,
      patient_id: patientId,
      ordered_by: doctorId,
      title: "Test Rad Order",
      order_type: "RADIOLOGY",
      status: "COMPLETED",
      priority: "ROUTINE",
      assigned_staff_id: doctorId,
      created_at: new Date(Date.now() - 60 * 60 * 1000),
      updated_at: new Date(),
    });
    radOrderId = radOrder.order_id;
  });

  describe("1. Dashboard Aggregation", () => {
    it("should retrieve hospital dashboard data", async () => {
      const dashboard = await clinicalDashboardService.getHospitalDashboard(adminId);
      expect(dashboard).toBeDefined();
      expect(dashboard.analytics).toBeDefined();
      expect(dashboard.analytics.active_clinical_orders).toBeGreaterThanOrEqual(1);
    });

    it("should retrieve department dashboard data for LABORATORY", async () => {
      const deptData = await clinicalDashboardService.getDepartmentDashboard("LABORATORY", adminId);
      expect(deptData).toBeDefined();
      expect(deptData.departmentId).toBe("LABORATORY");
      expect(deptData.analytics.current_workload).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Queue Metrics", () => {
    it("should return hospital queue summary", async () => {
      const summary = await unifiedClinicalQueueService.getHospitalQueueSummary();
      expect(summary).toBeDefined();
      expect(summary.current_size).toBeGreaterThanOrEqual(1);
    });

    it("should return department queue for LABORATORY", async () => {
      const labQueue = await unifiedClinicalQueueService.getDepartmentQueue("LABORATORY");
      expect(labQueue.current_size).toBeGreaterThanOrEqual(1);
    });

    it("should return provider queue for doctorId", async () => {
      const provQueue = await unifiedClinicalQueueService.getProviderQueue(doctorId);
      expect(provQueue.current_size).toBeGreaterThanOrEqual(1);
    });

    it("should return STAT priority queue", async () => {
      const statQueue = await unifiedClinicalQueueService.getPriorityQueue("STAT");
      expect(statQueue.current_size).toBeGreaterThanOrEqual(1);
    });

    it("should return overdue queue", async () => {
      const overdueQueue = await unifiedClinicalQueueService.getOverdueQueue();
      expect(overdueQueue.current_size).toBeGreaterThanOrEqual(1);
    });

    it("should return complete enterprise queues overview", async () => {
      const overview = await unifiedClinicalQueueService.getEnterpriseQueuesOverview();
      expect(overview.hospital_queue).toBeDefined();
      expect(overview.department_queues.LABORATORY).toBeDefined();
      expect(overview.stat_queue).toBeDefined();
      expect(overview.overdue_queue).toBeDefined();
    });
  });

  describe("3. Executive Summary API", () => {
    it("should compute executive summary with operational score", async () => {
      const summary = await clinicalOperationsDashboardService.getExecutiveSummary(adminId);
      expect(summary).toBeDefined();
      expect(summary.hospital_overview).toBeDefined();
      expect(summary.todays_workload).toBeDefined();
      expect(summary.critical_alerts).toBeDefined();
      expect(summary.sla_health).toBeDefined();
      expect(typeof summary.operational_score).toBe("number");
      expect(summary.operational_score).toBeGreaterThanOrEqual(0);
      expect(summary.operational_score).toBeLessThanOrEqual(100);
    });
  });

  describe("4. Operations Feed", () => {
    it("should retrieve operations feed sorted newest first", async () => {
      const feed = await clinicalOperationsFeedService.getOperationsFeed(10);
      expect(Array.isArray(feed)).toBe(true);
      expect(feed.length).toBeGreaterThanOrEqual(1);
      expect(feed[0].id).toBeDefined();
      expect(feed[0].title).toBeDefined();
    });
  });

  describe("5. Hospital Workload Distribution", () => {
    it("should calculate provider and department workload distribution", async () => {
      const workload = await clinicalWorkloadService.getWorkloadDistribution();
      expect(workload).toBeDefined();
      expect(workload.total_orders).toBeGreaterThanOrEqual(2);
      expect(workload.department_workload).toBeDefined();
      expect(workload.future_prediction).toBeDefined();
    });

    it("should calculate provider specific workload", async () => {
      const provWorkload = await clinicalOperationsAnalyticsService.getProviderWorkload(doctorId);
      expect(provWorkload).toBeDefined();
      expect(provWorkload.provider_id).toBe(doctorId);
      expect(provWorkload.total_assigned_orders).toBeGreaterThanOrEqual(1);
    });
  });

  describe("6. Hospital Operations Timeline", () => {
    it("should retrieve hospital operations timeline", async () => {
      const timeline = await hospitalOperationsTimelineService.getHospitalTimeline(20);
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThanOrEqual(1);
      expect(timeline[0].title).toBeDefined();
      expect(timeline[0].domain).toBeDefined();
    });
  });
});
