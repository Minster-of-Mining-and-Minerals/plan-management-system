"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderDefinitionService = require("../services/orders/clinicalOrderDefinitionService");
const runtimeOrderGenerationService = require("../services/orders/runtimeOrderGenerationService");
const orderDefinitionDesignerService = require("../services/orders/orderDefinitionDesignerService");
const dynamicOrderExecutionService = require("../services/workflow/dynamicOrderExecutionService");

jest.setTimeout(30000);

describe("Phase 2.11.1 — Dynamic Clinical Order Definition & Configuration-Driven Activity Engine", () => {
  let adminId;
  let doctorId;
  let patientId;
  let appointmentId;
  let createdOrderId;

  beforeAll(async () => {
    await db.ClinicalOrderDefinition.sync({ alter: true });
    await db.ClinicalOrder.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Order Definition Admin",
      email: `def_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Order Designer Lead",
      email: `def_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Order Definition Patient",
      email: `def_patient_${uuidv4()}@novacure.com`,
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
      appointment_type: "Configuration Order Encounter",
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
      notes: "Encounter for Configuration-Driven Order Engine",
      workflow_status: "active",
    });
    appointmentId = appointment.appointment_id;
  });

  describe("1. Clinical Order Designer & Definition Management", () => {
    it("should retrieve available designer configuration options", async () => {
      const designerOpts = await orderDefinitionDesignerService.getDesignerConfigOptions();
      expect(designerOpts.available_categories).toContain("DIAGNOSTIC");
      expect(designerOpts.available_departments).toContain("LABORATORY");
    });

    it("should register a published ClinicalOrderDefinition with versioning", async () => {
      const def = await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "MRI Spine Diagnostic Scan Definition",
          code: "DEF_MRI_SPINE_V1",
          category: "RADIOLOGY",
          department_id: "RADIOLOGY",
          version: "1.0.0",
          status: "PUBLISHED",
          priority_configuration: { default_priority: "ROUTINE", allowed_priorities: ["ROUTINE", "STAT"] },
        },
        adminId
      );

      expect(def).toBeDefined();
      expect(def.code).toBe("DEF_MRI_SPINE_V1");
      expect(def.version).toBe("1.0.0");
    });
  });

  describe("2. Runtime Order Generation & Version Snapshotting", () => {
    it("should instantiate generic ClinicalOrder with immutable configuration snapshot", async () => {
      const res = await runtimeOrderGenerationService.instantiateRuntimeOrder(
        {
          definition_code: "DEF_MRI_SPINE_V1",
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
          intent_data: { clinical_reason: "Suspected Lumbar Disc Herniation" },
        },
        doctorId
      );

      expect(res.success).toBe(true);
      expect(res.order_id).toBeDefined();
      expect(res.snapshot).toBeDefined();
      expect(res.snapshot.definition_version).toBe("1.0.0");

      createdOrderId = res.order_id;
    });

    it("should retrieve created ClinicalOrder containing generic payload JSON fields", async () => {
      const order = await db.ClinicalOrder.findByPk(createdOrderId);
      expect(order).toBeDefined();
      expect(order.status).toBe("ORDERED");
      expect(order.intent_payload_json).toBeDefined();
      expect(order.configuration_snapshot_json.definition_version).toBe("1.0.0");
    });
  });

  describe("3. Department Execution & Fulfillment", () => {
    it("should execute department dynamic order steps using generic ClinicalOrder instance", async () => {
      const exec = await dynamicOrderExecutionService.executeOrderStep(
        { order_id: createdOrderId, step_status: "COMPLETED", result_notes: "MRI Spine Scan verified clean" },
        adminId
      );
      expect(exec.status).toBe("COMPLETED");
    });
  });

  describe("4. Zero-Code Specialty Validation (Dialysis & Chemotherapy)", () => {
    it("should onboard DIALYSIS session through configuration only without core code changes", async () => {
      // 1. Admin creates Dialysis Order Definition
      const dialysisDef = await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Hemodialysis Session Order Definition",
          code: "DEF_DIALYSIS_V1",
          category: "THERAPEUTIC",
          department_id: "DIALYSIS",
          version: "1.0.0",
          status: "PUBLISHED",
        },
        adminId
      );

      // 2. Doctor instantiates Dialysis Session
      const dialysisOrderRes = await runtimeOrderGenerationService.instantiateRuntimeOrder(
        {
          definition_code: "DEF_DIALYSIS_V1",
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
          intent_data: { ultrafiltration_goal_ml: 2000, heparin_units: 1000 },
        },
        doctorId
      );

      expect(dialysisOrderRes.success).toBe(true);
      expect(dialysisOrderRes.order.order_type).toBe("DIALYSIS");

      // 3. Dialysis nurse executes therapy
      const fulfillment = await dynamicOrderExecutionService.executeOrderStep(
        { order_id: dialysisOrderRes.order_id, step_status: "FULFILLED", result_notes: "Completed 4h Dialysis session" },
        adminId
      );
      expect(fulfillment.status).toBe("FULFILLED");
    });

    it("should onboard CHEMOTHERAPY protocol cycle through configuration only", async () => {
      // 1. Admin creates Chemotherapy Order Definition
      const chemoDef = await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Chemotherapy Cycle Protocol Definition",
          code: "DEF_CHEMO_V1",
          category: "THERAPEUTIC",
          department_id: "ONCOLOGY",
          version: "1.0.0",
          status: "PUBLISHED",
        },
        adminId
      );

      // 2. Oncologist instantiates Chemotherapy Order
      const chemoOrderRes = await runtimeOrderGenerationService.instantiateRuntimeOrder(
        {
          definition_code: "DEF_CHEMO_V1",
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
          intent_data: { protocol: "FOLFOX", cycle_number: 3 },
        },
        doctorId
      );

      expect(chemoOrderRes.success).toBe(true);
      expect(chemoOrderRes.order.order_type).toBe("ONCOLOGY");
    });
  });
});
