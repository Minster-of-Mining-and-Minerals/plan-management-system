"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const laboratoryService = require("../services/laboratoryService");
const timelineEventService = require("../services/timelineEventService");

describe("Phase 2.6.1 & 2.6.2 — Laboratory Domain & Specimen Lifecycle Engine", () => {
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
      notes: "Test encounter for lab module",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    // Ensure all lab & order tables are synced for test DB
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.LaboratoryTestCatalog) await db.LaboratoryTestCatalog.sync({ alter: true });
    if (db.LaboratoryOrderItem) await db.LaboratoryOrderItem.sync({ alter: true });
    if (db.LaboratorySpecimen) await db.LaboratorySpecimen.sync({ alter: true });
    if (db.LaboratorySpecimenStatusHistory) await db.LaboratorySpecimenStatusHistory.sync({ alter: true });
    if (db.LaboratorySpecimenCollection) await db.LaboratorySpecimenCollection.sync({ alter: true });

    // Create patient user
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lab Patient",
      email: `lab_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    // Create staff user (lab tech / doctor)
    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Lab Technician Staff",
      email: `lab_tech_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    // Fetch or create laboratory department
    const [dept] = await db.Department.findOrCreate({
      where: { code: "MAIN_LAB" },
      defaults: {
        department_id: uuidv4(),
        name: "Main Laboratory",
        code: "MAIN_LAB",
        slug: "main-laboratory",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    departmentId = dept.department_id;

    // Create appointment
    const appt = await createTestAppointment(patientId, staffId);
    appointmentId = appt.appointment_id;
  });

  describe("1. Laboratory Test Catalog", () => {
    let createdTestId;

    it("should create a new laboratory test catalog entry", async () => {
      const testCode = `CBC_${uuidv4().substring(0, 6).toUpperCase()}`;
      const test = await laboratoryService.createTestCatalog(
        {
          code: testCode,
          name: "Complete Blood Count",
          description: "Full panel of blood cellular components",
          category: "HEMATOLOGY",
          sample_type: "BLOOD",
          unit: "10^3/uL",
        },
        staffId
      );

      expect(test).toBeDefined();
      expect(test.test_catalog_id).toBeDefined();
      expect(test.code).toBe(testCode);
      expect(test.category).toBe("HEMATOLOGY");
      createdTestId = test.test_catalog_id;
    });

    it("should list available laboratory test catalog entries", async () => {
      const tests = await laboratoryService.listTestCatalog("HEMATOLOGY");
      expect(tests).toBeDefined();
      expect(tests.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Laboratory Order & Specimen Workflow", () => {
    let labOrderId;
    let specimenId;

    it("should create a laboratory clinical order", async () => {
      const order = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "LABORATORY",
          priority: "STAT",
          title: "Urgent CBC & Electrolytes",
          clinical_reason: "Acute weakness evaluation",
          assigned_department_id: departmentId,
        },
        staffId
      );

      expect(order).toBeDefined();
      expect(order.order_type).toBe("LABORATORY");
      expect(order.laboratory_status).toBe("WAITING_FOR_COLLECTION");
      labOrderId = order.order_id;
    });

    it("should add test items to the laboratory order", async () => {
      const items = await laboratoryService.addTestItems(
        labOrderId,
        [
          { test_name: "WBC Count" },
          { test_name: "RBC Count" },
          { test_name: "Serum Potassium" },
        ],
        staffId
      );

      expect(items).toBeDefined();
      expect(items.length).toBe(3);
      expect(items[0].status).toBe("PENDING");
    });

    it("should create a specimen entry for the laboratory order", async () => {
      const specimen = await laboratoryService.createSpecimen(
        labOrderId,
        {
          specimen_type: "BLOOD",
          notes: "Venous blood sample requested",
        },
        staffId
      );

      expect(specimen).toBeDefined();
      expect(specimen.collection_status).toBe("PENDING_COLLECTION");
      specimenId = specimen.specimen_id;
    });

    it("should collect the specimen and update lab status to SPECIMEN_COLLECTED", async () => {
      const collected = await laboratoryService.collectSpecimen(
        specimenId,
        staffId,
        "Sample drawn into EDTA tube"
      );

      expect(collected.collection_status).toBe("COLLECTED");
      expect(collected.collected_by).toBe(staffId);

      const order = await clinicalOrderService.getOrder(labOrderId);
      expect(order.laboratory_status).toBe("SPECIMEN_COLLECTED");
    });

    it("should update laboratory status to PROCESSING", async () => {
      const updated = await laboratoryService.updateLaboratoryStatus(
        labOrderId,
        "PROCESSING",
        staffId,
        "Specimen placed in centrifuge"
      );

      expect(updated.laboratory_status).toBe("PROCESSING");
    });

    it("should submit laboratory result and complete order", async () => {
      const completed = await laboratoryService.submitLaboratoryResult(
        labOrderId,
        {
          result_summary: "WBC 7.2 | RBC 4.5 | Potassium 4.1 mEq/L (Normal)",
          result_data: { wbc: "7.2", rbc: "4.5", potassium: "4.1" },
          verification_status: "FINAL",
        },
        staffId
      );

      expect(completed.status).toBe("COMPLETED");
      expect(completed.laboratory_status).toBe("COMPLETED");
      expect(completed.result).toBeDefined();
      expect(completed.result.result_summary).toContain("WBC 7.2");
    });
  });

  describe("3. Specimen Lifecycle Enhancement (Phase 2.6.2)", () => {
    let orderId;
    let rejectedSpecimenId;
    let newSpecimenId;

    beforeAll(async () => {
      const order = await clinicalOrderService.createOrder(
        {
          appointment_id: appointmentId,
          patient_id: patientId,
          order_type: "LABORATORY",
          priority: "ROUTINE",
          title: "Urinalysis Panel",
          clinical_reason: "Routine checkup",
        },
        staffId
      );
      orderId = order.order_id;
    });

    it("should process specimen from PENDING -> COLLECTED -> RECEIVED -> ACCEPTED", async () => {
      const specimen = await laboratoryService.createSpecimen(
        orderId,
        { specimen_type: "URINE" },
        staffId
      );
      expect(specimen.collection_status).toBe("PENDING_COLLECTION");

      const collected = await laboratoryService.collectSpecimen(specimen.specimen_id, staffId, "Midstream urine");
      expect(collected.collection_status).toBe("COLLECTED");

      const received = await laboratoryService.receiveSpecimen(specimen.specimen_id, staffId);
      expect(received.collection_status).toBe("RECEIVED");

      const accepted = await laboratoryService.acceptSpecimen(specimen.specimen_id, staffId);
      expect(accepted.collection_status).toBe("ACCEPTED");
    });

    it("should reject a specimen with mandatory rejection reason", async () => {
      const specimen = await laboratoryService.createSpecimen(
        orderId,
        { specimen_type: "BLOOD" },
        staffId
      );
      await laboratoryService.collectSpecimen(specimen.specimen_id, staffId);
      await laboratoryService.receiveSpecimen(specimen.specimen_id, staffId);

      await expect(
        laboratoryService.rejectSpecimen(specimen.specimen_id, "", staffId)
      ).rejects.toThrow("Rejection reason is required");

      const rejected = await laboratoryService.rejectSpecimen(
        specimen.specimen_id,
        "Hemolyzed blood sample",
        staffId
      );
      expect(rejected.collection_status).toBe("REJECTED");
      rejectedSpecimenId = specimen.specimen_id;
    });

    it("should create a recollection request linking replacement specimen to parent", async () => {
      const replacement = await laboratoryService.createRecollectionRequest(
        rejectedSpecimenId,
        staffId,
        "Draw new blood sample without hemolysis"
      );

      expect(replacement).toBeDefined();
      expect(replacement.parent_specimen_id).toBe(rejectedSpecimenId);
      expect(replacement.collection_status).toBe("PENDING_COLLECTION");
      newSpecimenId = replacement.specimen_id;

      const parentSpecimen = await laboratoryService.getSpecimenHistory(rejectedSpecimenId);
      expect(parentSpecimen.collection_status).toBe("RECOLLECTION_REQUIRED");
      expect(parentSpecimen.statusHistory).toBeDefined();
    });

    it("should fetch complete specimen history with collections and status history", async () => {
      const history = await laboratoryService.getSpecimenHistory(newSpecimenId);
      expect(history).toBeDefined();
      expect(history.specimen_id).toBe(newSpecimenId);
      expect(history.parent_specimen_id).toBe(rejectedSpecimenId);
    });
  });

  describe("4. Timeline Integration", () => {
    it("should synthesize LAB_ORDER_CREATED timeline event", async () => {
      const timeline = await timelineEventService.listForPatient(patientId);
      expect(timeline).toBeDefined();
      const labEvents = timeline.filter(
        (e) => e.event_type === "LAB_ORDER_CREATED" || e.event_type === "CLINICAL_ORDER"
      );
      expect(labEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
