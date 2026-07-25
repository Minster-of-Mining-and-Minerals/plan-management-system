"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalActivityDefinitionService = require("../services/workflow/clinicalActivityDefinitionService");
const clinicalWorkflowEngine = require("../services/workflow/clinicalWorkflowEngine");
const dynamicOrderExecutionService = require("../services/workflow/dynamicOrderExecutionService");

jest.setTimeout(30000);

describe("Phase 2.11.0 — Dynamic Clinical Workflow & ClinicalOrder Harmonization Engine", () => {
  let adminId;
  let doctorId;
  let patientId;
  let appointmentId;
  let createdOrderId;

  beforeAll(async () => {
    await db.ClinicalActivityDefinition.sync({ alter: true });
    await db.ClinicalWorkflowDefinition.sync({ alter: true });
    await db.ClinicalOrder.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Workflow Admin",
      email: `wf_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Dynamic Workflow Lead",
      email: `wf_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dynamic Workflow Patient",
      email: `wf_patient_${uuidv4()}@novacure.com`,
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
      appointment_type: "Dynamic Workflow Encounter",
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
      notes: "Encounter for Dynamic Workflow Harmonization",
      workflow_status: "active",
    });
    appointmentId = appointment.appointment_id;
  });

  describe("1. Clinical Activity Definition Layer", () => {
    it("should retrieve default pre-configured clinical activity definitions", async () => {
      const activities = await clinicalActivityDefinitionService.getActivityDefinitions();
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThanOrEqual(1);
    });

    it("should register a new clinical activity definition", async () => {
      const newActivity = await clinicalActivityDefinitionService.createActivityDefinition(
        {
          name: "Oncology Biopsy Marker Assessment",
          code: "ONCOLOGY_BIOPSY",
          category: "DIAGNOSTIC",
          department_id: "ONCOLOGY",
          creates_clinical_order: true,
          order_type: "ONCOLOGY",
          default_priority: "STAT",
          sla_configuration: { target_minutes: 30, warning_threshold_minutes: 20 },
        },
        adminId
      );

      expect(newActivity).toBeDefined();
      expect(newActivity.code).toBe("ONCOLOGY_BIOPSY");
    });
  });

  describe("2. Dynamic Form Submission to Clinical Intent & ClinicalOrder", () => {
    it("should process dynamic form submission into Clinical Intent and generate ClinicalOrder", async () => {
      const res = await clinicalWorkflowEngine.submitClinicalIntent(
        {
          activity_code: "CBC_TEST",
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
          clinical_data: { reason: "Routine Health Screening", fast_required: true },
          priority: "ROUTINE",
        },
        doctorId
      );

      expect(res.success).toBe(true);
      expect(res.order_id).toBeDefined();
      expect(res.order.order_type).toBe("LABORATORY");
      expect(res.intent.activity_code).toBe("CBC_TEST");
      expect(res.order.activity_definition_id).toBeDefined();
      createdOrderId = res.order_id;
    });

    it("should retrieve created order with activity metadata", async () => {
      const order = await db.ClinicalOrder.findByPk(createdOrderId);
      expect(order).toBeDefined();
      expect(order.status).toBe("ORDERED");
      expect(order.clinical_intent_json).toBeDefined();
      expect(order.clinical_intent_json.activity_code).toBe("CBC_TEST");
    });
  });

  describe("3. Department Execution Model", () => {
    it("should execute department dynamic order steps (IN_PROGRESS -> FULFILLED)", async () => {
      const step1 = await dynamicOrderExecutionService.executeOrderStep(
        { order_id: createdOrderId, step_status: "IN_PROGRESS", result_notes: "Specimen collected and processing" },
        adminId
      );
      expect(step1.status).toBe("IN_PROGRESS");

      const step2 = await dynamicOrderExecutionService.executeOrderStep(
        { order_id: createdOrderId, step_status: "FULFILLED", result_data: { wbc: 6.5, rbc: 4.8, hemoglobin: 14.2 } },
        adminId
      );
      expect(step2.status).toBe("FULFILLED");
    });
  });

  describe("4. Zero-Code Specialty Onboarding Test (Physiotherapy Module)", () => {
    it("should onboard a new PHYSIOTHERAPY specialty purely via configuration without core code changes", async () => {
      // 1. Admin configures Physiotherapy Activity Definition
      const physioActivity = await clinicalActivityDefinitionService.createActivityDefinition(
        {
          name: "Physiotherapy Rehabilitation Session",
          code: "PHYSIO_REHAB_SESSION",
          category: "THERAPEUTIC",
          department_id: "PHYSIOTHERAPY",
          creates_clinical_order: true,
          order_type: "PHYSIOTHERAPY",
          default_priority: "ROUTINE",
          sla_configuration: { target_minutes: 120, warning_threshold_minutes: 90 },
          billing_configuration: { is_billable: true, default_fee: 100.0 },
        },
        adminId
      );

      // 2. Doctor fills out Physiotherapy Dynamic Form
      const physioIntent = await clinicalWorkflowEngine.submitClinicalIntent(
        {
          activity_code: "PHYSIO_REHAB_SESSION",
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
          clinical_data: { target_joint: "Left Knee", range_of_motion: "45 degrees", pain_scale: 6 },
        },
        doctorId
      );

      expect(physioIntent.success).toBe(true);
      expect(physioIntent.order.order_type).toBe("PHYSIOTHERAPY");

      // 3. Physiotherapist executes session
      const execution = await dynamicOrderExecutionService.executeOrderStep(
        { order_id: physioIntent.order_id, step_status: "COMPLETED", result_notes: "ROM improved to 65 degrees" },
        adminId
      );
      expect(execution.status).toBe("COMPLETED");
    });
  });

  describe("5. Dynamic Workflow Definitions", () => {
    it("should retrieve active dynamic workflow definitions", async () => {
      const workflows = await clinicalWorkflowEngine.getWorkflowDefinitions();
      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThanOrEqual(1);
    });
  });
});
