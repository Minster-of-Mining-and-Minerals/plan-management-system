"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const laboratoryService = require("../services/laboratoryService");
const laboratoryQueueService = require("../services/laboratoryQueueService");

describe("Phase 2.6.3 — Laboratory Queue & Worklist Engine", () => {
  let patientId;
  let staffId1;
  let staffId2;
  let appointmentId;

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
      appointment_type: "Test Lab Encounter",
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
      notes: "Test encounter for queue module",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });
    await db.LaboratorySpecimen.sync({ alter: true });
    if (db.LaboratoryWorkQueueItem) await db.LaboratoryWorkQueueItem.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Queue Patient",
      email: `queue_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const staff1 = await db.User.create({
      user_id: uuidv4(),
      full_name: "Tech One",
      email: `tech_one_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId1 = staff1.user_id;

    const staff2 = await db.User.create({
      user_id: uuidv4(),
      full_name: "Tech Two",
      email: `tech_two_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId2 = staff2.user_id;

    const appt = await createTestAppointment(patientId, staffId1);
    appointmentId = appt.appointment_id;
  });

  describe("1. Queue Item Creation & Automatic Stage Transitions", () => {
    let orderId;
    let specimenId;

    it("should automatically create COLLECTION queue item on specimen creation", async () => {
      const order = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "LABORATORY",
          priority: "STAT",
          title: "STAT Blood Gas",
        },
        staffId1
      );
      orderId = order.order_id;

      const specimen = await laboratoryService.createSpecimen(
        orderId,
        { specimen_type: "BLOOD" },
        staffId1
      );
      specimenId = specimen.specimen_id;

      const queue = await laboratoryQueueService.getQueue({ queue_type: "COLLECTION" });
      const item = queue.find((q) => q.order_id === orderId);
      expect(item).toBeDefined();
      expect(item.queue_type).toBe("COLLECTION");
      expect(item.priority).toBe("STAT");
      expect(item.status).toBe("WAITING");
    });

    it("should transition to RECEPTION queue item when specimen is collected", async () => {
      await laboratoryService.collectSpecimen(specimenId, staffId1, "Sample drawn");

      const queue = await laboratoryQueueService.getQueue({ queue_type: "RECEPTION" });
      const item = queue.find((q) => q.order_id === orderId);
      expect(item).toBeDefined();
      expect(item.queue_type).toBe("RECEPTION");
      expect(item.status).toBe("WAITING");
    });
  });

  describe("2. Priority Sorting Engine", () => {
    it("should sort STAT queue items before URGENT and ROUTINE", async () => {
      const orderRoutine = await clinicalOrderService.createOrder(
        { appointment_id: appointmentId, patient_id: patientId, order_type: "LABORATORY", priority: "ROUTINE", title: "Routine Urinalysis" },
        staffId1
      );
      await laboratoryService.createSpecimen(orderRoutine.order_id, { specimen_type: "URINE" }, staffId1);

      const orderStat = await clinicalOrderService.createOrder(
        { appointment_id: appointmentId, patient_id: patientId, order_type: "LABORATORY", priority: "STAT", title: "STAT Troponin" },
        staffId1
      );
      await laboratoryService.createSpecimen(orderStat.order_id, { specimen_type: "BLOOD" }, staffId1);

      const queue = await laboratoryQueueService.getQueue({ queue_type: "COLLECTION" });
      expect(queue.length).toBeGreaterThanOrEqual(2);
      expect(queue[0].priority).toBe("STAT");
    });
  });

  describe("3. Worklist Claim, Start & Complete Lifecycle", () => {
    let queueItemId;

    it("should claim a waiting queue item", async () => {
      const queue = await laboratoryQueueService.getQueue({ status: "WAITING" });
      expect(queue.length).toBeGreaterThan(0);
      queueItemId = queue[0].id;

      const claimed = await laboratoryQueueService.claimQueueItem(queueItemId, staffId1);
      expect(claimed.status).toBe("CLAIMED");
      expect(claimed.assigned_staff_id).toBe(staffId1);
    });

    it("should block claiming an already claimed queue item", async () => {
      await expect(
        laboratoryQueueService.claimQueueItem(queueItemId, staffId2)
      ).rejects.toThrow();
    });

    it("should start processing a claimed queue item", async () => {
      const started = await laboratoryQueueService.startQueueItem(queueItemId, staffId1);
      expect(started.status).toBe("IN_PROGRESS");
    });

    it("should prevent unauthorized user from starting work claimed by another", async () => {
      // Create and claim a new item for staffId1
      const order = await clinicalOrderService.createOrder(
        { appointment_id: appointmentId, patient_id: patientId, order_type: "LABORATORY", priority: "URGENT", title: "Urgent CBC" },
        staffId1
      );
      const specimen = await laboratoryService.createSpecimen(order.order_id, { specimen_type: "BLOOD" }, staffId1);
      const queue = await laboratoryQueueService.getQueue({ queue_type: "COLLECTION" });
      const item = queue.find((q) => q.order_id === order.order_id);
      await laboratoryQueueService.claimQueueItem(item.id, staffId1);

      await expect(
        laboratoryQueueService.startQueueItem(item.id, staffId2)
      ).rejects.toThrow("Cannot start work item claimed by another staff member");
    });

    it("should complete work on an in-progress queue item", async () => {
      const completed = await laboratoryQueueService.completeQueueItem(queueItemId, staffId1);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completed_at).toBeDefined();
    });

    it("should retrieve staff specific active worklist", async () => {
      const worklist = await laboratoryQueueService.getStaffWorklist(staffId1);
      expect(worklist).toBeDefined();
      expect(Array.isArray(worklist)).toBe(true);
    });
  });
});
