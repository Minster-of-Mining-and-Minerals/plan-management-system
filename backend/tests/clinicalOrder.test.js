"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const timelineEventService = require("../services/timelineEventService");

describe("Phase 2.5 — Unified Clinical Order Engine", () => {
  let patientId;
  let staffId;
  let appointmentId;
  let departmentId;

  async function createTestAppointment(pId, sId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      schedule_date: todayStr,
      start_time: "07:30",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Test Clinical Order",
      created_by: sId,
      updated_by: sId,
    });

    return await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      admitted_by: sId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Test encounter",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    // Sync tables for test execution
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.ClinicalOrderStatusHistory) await db.ClinicalOrderStatusHistory.sync({ alter: true });
    if (db.ClinicalOrderResultHistory) await db.ClinicalOrderResultHistory.sync({ alter: true });

    // Create patient user
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Test Order Patient",
      email: `order_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    // Create staff user
    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Doctor Ordering Staff",
      email: `order_staff_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    // Fetch or create department
    const [dept] = await db.Department.findOrCreate({
      where: { code: "LAB_TEST" },
      defaults: {
        department_id: uuidv4(),
        name: "Test Laboratory",
        code: "LAB_TEST",
        slug: "test-laboratory",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    departmentId = dept.department_id;

    // Create appointment
    const appt = await createTestAppointment(patientId, staffId);
    appointmentId = appt.appointment_id;
  });

  describe("1. Clinical Order Creation & Lookup", () => {
    let createdOrderId;

    it("should create a new laboratory clinical order and record status history", async () => {
      const order = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "LABORATORY",
          priority: "STAT",
          title: "Complete Blood Count (CBC)",
          clinical_reason: "Fever and fatigue evaluation",
          order_items: [{ name: "WBC" }, { name: "RBC" }, { name: "Hemoglobin" }],
          assigned_department_id: departmentId,
        },
        staffId
      );

      expect(order).toBeDefined();
      expect(order.order_id).toBeDefined();
      expect(order.title).toBe("Complete Blood Count (CBC)");
      expect(order.status).toBe("SUBMITTED");
      expect(order.priority).toBe("STAT");
      expect(order.ordered_by).toBe(staffId);
      createdOrderId = order.order_id;

      if (order.statusHistory) {
        expect(order.statusHistory.length).toBeGreaterThanOrEqual(1);
        expect(order.statusHistory[0].new_status).toBe("SUBMITTED");
      }
    });

    it("should fetch a clinical order by ID with associations", async () => {
      const order = await clinicalOrderService.getOrder(createdOrderId);
      expect(order).toBeDefined();
      expect(order.order_id).toBe(createdOrderId);
      expect(order.patient.user_id).toBe(patientId);
      expect(order.orderedByUser.user_id).toBe(staffId);
    });

    it("should list clinical orders for an encounter", async () => {
      const orders = await clinicalOrderService.listOrdersForEncounter(appointmentId);
      expect(orders).toBeDefined();
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Department Queue & Status Transition", () => {
    let orderId;

    beforeAll(async () => {
      const order = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "RADIOLOGY",
          priority: "ROUTINE",
          title: "Chest X-Ray PA/Lateral",
          clinical_reason: "Cough evaluation",
          assigned_department_id: departmentId,
        },
        staffId
      );
      orderId = order.order_id;
    });

    it("should list orders in the department queue", async () => {
      const queue = await clinicalOrderService.listDepartmentQueue(departmentId);
      expect(queue).toBeDefined();
      expect(queue.length).toBeGreaterThanOrEqual(1);
    });

    it("should accept an order for execution and record status history", async () => {
      const accepted = await clinicalOrderService.acceptOrder(orderId, staffId);
      expect(accepted.status).toBe("ACCEPTED");
      expect(accepted.assigned_staff_id).toBe(staffId);
      if (accepted.statusHistory) {
        const acceptedRecord = accepted.statusHistory.find((h) => h.new_status === "ACCEPTED");
        expect(acceptedRecord).toBeDefined();
      }
    });

    it("should record a result and set order status to COMPLETED", async () => {
      const completed = await clinicalOrderService.recordResult(
        orderId,
        {
          result_summary: "No acute cardiopulmonary disease identified.",
          result_data: { lungs: "Clear", heart: "Normal size" },
          verification_status: "FINAL",
        },
        staffId
      );

      expect(completed.status).toBe("COMPLETED");
      expect(completed.result).toBeDefined();
      expect(completed.result.result_summary).toContain("No acute cardiopulmonary");
    });
  });

  describe("3. Cancellation & Result Amendment Governance", () => {
    let orderIdToCancel;
    let orderIdToAmend;

    beforeAll(async () => {
      const order1 = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "PROCEDURE",
          priority: "ROUTINE",
          title: "Biopsy specimen analysis",
          clinical_reason: "Tissue evaluation",
        },
        staffId
      );
      orderIdToCancel = order1.order_id;

      const order2 = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "LABORATORY",
          priority: "URGENT",
          title: "Electrolytes Panel",
          clinical_reason: "Dehydration check",
        },
        staffId
      );
      orderIdToAmend = order2.order_id;

      await clinicalOrderService.recordResult(
        orderIdToAmend,
        {
          result_summary: "Potassium 3.8 mEq/L (Normal)",
          result_data: { potassium: "3.8" },
          verification_status: "FINAL",
        },
        staffId
      );
    });

    it("should reject order cancellation if cancellation_reason is missing", async () => {
      await expect(
        clinicalOrderService.cancelOrder(orderIdToCancel, "", staffId)
      ).rejects.toThrow("cancellation_reason is required");
    });

    it("should cancel an order with reason and record status history", async () => {
      const cancelled = await clinicalOrderService.cancelOrder(
        orderIdToCancel,
        "Patient refused procedure",
        staffId
      );
      expect(cancelled.status).toBe("CANCELLED");
      expect(cancelled.cancellation_reason).toBe("Patient refused procedure");

      if (cancelled.statusHistory) {
        const cancelRecord = cancelled.statusHistory.find((h) => h.new_status === "CANCELLED");
        expect(cancelRecord).toBeDefined();
        expect(cancelRecord.reason).toBe("Patient refused procedure");
      }
    });

    it("should reject amending a result if amendment reason is missing", async () => {
      await expect(
        clinicalOrderService.amendResult(
          orderIdToAmend,
          {
            result_summary: "Potassium 4.1 mEq/L (Corrected)",
            result_data: { potassium: "4.1" },
            reason: "",
          },
          staffId
        )
      ).rejects.toThrow("Amendment reason is required");
    });

    it("should amend an existing result and preserve amendment history", async () => {
      const amended = await clinicalOrderService.amendResult(
        orderIdToAmend,
        {
          result_summary: "Potassium 4.1 mEq/L (Corrected calibration)",
          result_data: { potassium: "4.1" },
          reason: "Lab analyzer recalibration correction",
          verification_status: "FINAL",
        },
        staffId
      );

      expect(amended.result).toBeDefined();
      expect(amended.result.result_summary).toContain("Potassium 4.1");

      if (amended.result.amendmentHistory) {
        expect(amended.result.amendmentHistory.length).toBeGreaterThanOrEqual(1);
        expect(amended.result.amendmentHistory[0].previous_summary).toContain("Potassium 3.8");
        expect(amended.result.amendmentHistory[0].reason).toBe("Lab analyzer recalibration correction");
      }
    });
  });

  describe("4. Timeline Integration", () => {
    it("should include clinical orders when listing patient timeline", async () => {
      const timeline = await timelineEventService.listForPatient(patientId);
      expect(timeline).toBeDefined();
      const orderEvents = timeline.filter((e) => e.event_type === "CLINICAL_ORDER");
      expect(orderEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
