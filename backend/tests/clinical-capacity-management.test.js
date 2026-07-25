"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalCapacityService = require("../services/capacity/clinicalCapacityService");
const clinicalResourceAllocationService = require("../services/capacity/clinicalResourceAllocationService");
const providerAvailabilityService = require("../services/capacity/providerAvailabilityService");
const clinicalForecastService = require("../services/capacity/clinicalForecastService");
const appointmentCapacityOptimizer = require("../services/capacity/appointmentCapacityOptimizer");
const clinicalThroughputService = require("../services/capacity/clinicalThroughputService");
const clinicalRecommendationService = require("../services/capacity/clinicalRecommendationService");
const clinicalCapacityDashboardService = require("../services/capacity/clinicalCapacityDashboardService");

jest.setTimeout(30000);

describe("Phase 2.10.2 — Enterprise Capacity, Resource & Throughput Management Platform", () => {
  let adminId;
  let doctorId;
  let patientId;
  let appointmentId;
  let roomId;
  let equipmentId;
  let assignmentId;

  beforeAll(async () => {
    await db.ClinicalRoom.sync({ alter: true });
    await db.ClinicalEquipment.sync({ alter: true });
    await db.ClinicalShift.sync({ alter: true });
    await db.ClinicalResourceAssignment.sync({ alter: true });
    await db.ClinicalCapacitySnapshot.sync({ alter: true });
    await db.ClinicalOrder.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Capacity Admin",
      email: `cap_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Capacity Lead",
      email: `cap_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Capacity Test Patient",
      email: `cap_patient_${uuidv4()}@novacure.com`,
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
      appointment_type: "Capacity Encounter",
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
      notes: "Encounter for Capacity Testing",
      workflow_status: "active",
    });
    appointmentId = appointment.appointment_id;

    // Create Room & Equipment
    const room = await db.ClinicalRoom.create({
      room_id: uuidv4(),
      room_number: "RM-101",
      name: "Consultation Suite 1",
      department_id: "CONSULTATION",
      status: "AVAILABLE",
      capacity: 1,
    });
    roomId = room.room_id;

    const equipment = await db.ClinicalEquipment.create({
      equipment_id: uuidv4(),
      equipment_code: "XRAY-01",
      name: "Digital X-Ray Scanner",
      department_id: "RADIOLOGY",
      status: "AVAILABLE",
    });
    equipmentId = equipment.equipment_id;
  });

  describe("1. Enterprise Capacity Calculations", () => {
    it("should calculate hospital capacity and utilization percentage", async () => {
      const cap = await clinicalCapacityService.getHospitalCapacity();
      expect(cap).toBeDefined();
      expect(cap.max_capacity).toBeGreaterThan(0);
      expect(typeof cap.utilization_percentage).toBe("number");
      expect(cap.capacity_trend).toBeDefined();
    });

    it("should calculate department capacity for LABORATORY", async () => {
      const labCap = await clinicalCapacityService.getDepartmentCapacity("LABORATORY");
      expect(labCap).toBeDefined();
      expect(labCap.department_id).toBe("LABORATORY");
      expect(labCap.status).toBeDefined();
    });

    it("should calculate provider capacity for doctorId", async () => {
      const provCap = await clinicalCapacityService.getProviderCapacity(doctorId);
      expect(provCap).toBeDefined();
      expect(provCap.provider_id).toBe(doctorId);
      expect(typeof provCap.utilization_percentage).toBe("number");
    });
  });

  describe("2. Resource Allocation & Emergency Override", () => {
    it("should allocate a room resource", async () => {
      const alloc = await clinicalResourceAllocationService.allocateResource(
        {
          resource_type: "ROOM",
          resource_id: roomId,
          assigned_to_type: "DEPARTMENT",
          assigned_to_id: "CONSULTATION",
          priority: "ROUTINE",
        },
        adminId
      );

      expect(alloc).toBeDefined();
      expect(alloc.status).toBe("ACTIVE");
      assignmentId = alloc.assignment_id;

      const room = await db.ClinicalRoom.findByPk(roomId);
      expect(room.status).toBe("OCCUPIED");
    });

    it("should reject double allocation without emergency override", async () => {
      await expect(
        clinicalResourceAllocationService.allocateResource(
          {
            resource_type: "ROOM",
            resource_id: roomId,
            assigned_to_type: "DEPARTMENT",
            assigned_to_id: "EMERGENCY",
            is_emergency: false,
          },
          adminId
        )
      ).rejects.toThrow();
    });

    it("should allow emergency override for active resource assignment", async () => {
      const emergencyAlloc = await clinicalResourceAllocationService.allocateResource(
        {
          resource_type: "ROOM",
          resource_id: roomId,
          assigned_to_type: "DEPARTMENT",
          assigned_to_id: "EMERGENCY",
          is_emergency: true,
        },
        adminId
      );

      expect(emergencyAlloc).toBeDefined();
      expect(emergencyAlloc.priority).toBe("STAT");

      const previous = await db.ClinicalResourceAssignment.findByPk(assignmentId);
      expect(previous.status).toBe("OVERRIDDEN");
      assignmentId = emergencyAlloc.assignment_id;
    });

    it("should release active resource assignment", async () => {
      const released = await clinicalResourceAllocationService.releaseAssignment(assignmentId, adminId);
      expect(released.status).toBe("RELEASED");

      const room = await db.ClinicalRoom.findByPk(roomId);
      expect(room.status).toBe("AVAILABLE");
    });

    it("should list active resource assignments", async () => {
      const activeList = await clinicalResourceAllocationService.getActiveAssignments();
      expect(Array.isArray(activeList)).toBe(true);
    });
  });

  describe("3. Provider Availability Engine", () => {
    it("should return provider real-time availability status", async () => {
      const avail = await providerAvailabilityService.getProviderAvailability(doctorId);
      expect(avail).toBeDefined();
      expect(avail.provider_id).toBe(doctorId);
      expect(avail.current_status).toBeDefined();
      expect(typeof avail.next_availability_in_minutes).toBe("number");
    });

    it("should return department availability board", async () => {
      const board = await providerAvailabilityService.getDepartmentAvailabilityBoard("CONSULTATION");
      expect(Array.isArray(board)).toBe(true);
      expect(board.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Capacity Demand Forecasting Engine", () => {
    it("should generate 7-day demand forecast and peak hours", async () => {
      const forecast = await clinicalForecastService.getCapacityForecast();
      expect(forecast).toBeDefined();
      expect(forecast.seven_day_forecast.length).toBe(7);
      expect(forecast.peak_hours.consultation_peak).toBeDefined();
      expect(forecast.risk_assessment).toBeDefined();
      expect(forecast.ml_readiness_score).toBeGreaterThan(0);
    });
  });

  describe("5. Appointment Capacity Optimizer", () => {
    it("should calculate remaining appointment slots and overbooking risk", async () => {
      const apptMetrics = await appointmentCapacityOptimizer.getAppointmentCapacityMetrics();
      expect(apptMetrics).toBeDefined();
      expect(apptMetrics.remaining_slots).toBeGreaterThanOrEqual(0);
      expect(typeof apptMetrics.overbooking_risk_percentage).toBe("number");
      expect(Array.isArray(apptMetrics.redistribution_recommendations)).toBe(true);
    });
  });

  describe("6. Clinical Throughput Engine", () => {
    it("should calculate patients/hour and orders/hour throughput", async () => {
      const tp = await clinicalThroughputService.getThroughputMetrics();
      expect(tp).toBeDefined();
      expect(typeof tp.patients_per_hour).toBe("number");
      expect(typeof tp.orders_per_hour).toBe("number");
      expect(tp.department_throughput).toBeDefined();
    });
  });

  describe("7. Operational Recommendation Engine", () => {
    let recId;

    it("should generate operational recommendations with confidence scores", async () => {
      const recs = await clinicalRecommendationService.getOperationalRecommendations();
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThanOrEqual(1);
      expect(recs[0].confidence_score).toBeGreaterThan(0);
      recId = recs[0].id;
    });

    it("should accept recommendation and emit timeline event", async () => {
      const res = await clinicalRecommendationService.acceptRecommendation(recId, adminId);
      expect(res.success).toBe(true);
      expect(res.status).toBe("ACCEPTED");
    });
  });

  describe("8. Executive Capacity Dashboard", () => {
    it("should aggregate executive capacity dashboard with health score", async () => {
      const exec = await clinicalCapacityDashboardService.getExecutiveCapacityDashboard(adminId);
      expect(exec).toBeDefined();
      expect(typeof exec.hospital_utilization_pct).toBe("number");
      expect(typeof exec.operational_health_score).toBe("number");
      expect(Array.isArray(exec.recommended_actions)).toBe(true);
    });
  });
});
