"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderDefinitionService = require("../services/orders/clinicalOrderDefinitionService");
const runtimeOrderGenerationService = require("../services/orders/runtimeOrderGenerationService");

describe("Dynamic & Configurable Clinical Order Engine Tests", () => {
  let requestFormConfig;
  let resultFormConfig;
  let adminUserId;
  let patientId;
  let appointmentId;

  beforeAll(async () => {
    try {
      await db.User.sync({ alter: true }).catch(() => {});
      await db.PatientSchedule.sync({ alter: true }).catch(() => {});
      await db.StaffAppointment.sync({ alter: true }).catch(() => {});
      await db.DiagnosisFormConfig.sync({ alter: true }).catch(() => {});
      await db.ClinicalOrderDefinition.sync({ alter: true }).catch(() => {});
      await db.ClinicalOrder.sync({ alter: true }).catch(() => {});
    } catch (e) {
      // Sync skipped if tables already exist
    }

    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dynamic Order Admin",
      email: `do_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminUserId = staff.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dynamic Order Patient",
      email: `do_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const schedule = await db.PatientSchedule.create({
      schedule_id: uuidv4(),
      patient_id: patientId,
      assigned_staff_id: adminUserId,
      schedule_date: "2026-07-26",
      start_time: "09:00",
      end_time: "09:30",
      appointment_type: "General Outpatient",
      status: "SCHEDULED",
      created_by: adminUserId,
    });
    const scheduleId = schedule.schedule_id;

    const appt = await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: scheduleId,
      patient_id: patientId,
      assigned_staff_id: adminUserId,
      appointment_date: new Date(),
      admitted_at: new Date(),
      appointment_type: "General Outpatient",
      status: "CHECKED_IN",
      workflow_status: "IN_TRIAGE",
      queue_number: 101,
    });
    appointmentId = appt.appointment_id;

    requestFormConfig = await db.DiagnosisFormConfig.create({
      config_id: uuidv4(),
      assigned_staff_id: adminUserId,
      title: "Dynamic Eye Exam Request Form",
      description: "Intake request form template for eye examination",
      is_active: true,
    });

    resultFormConfig = await db.DiagnosisFormConfig.create({
      config_id: uuidv4(),
      assigned_staff_id: adminUserId,
      title: "Dynamic Eye Exam Result Entry Form",
      description: "Result entry form template for eye examination findings",
      is_active: true,
    });
  });

  it("should create a composite ClinicalOrderDefinition linked to dynamic form templates", async () => {
    const defCode = `DEF_EYE_EXAM_${uuidv4().slice(0, 6)}`;
    const def = await clinicalOrderDefinitionService.createOrderDefinition(
      {
        code: defCode,
        name: "Ophthalmology Eye Examination Order Definition",
        description: "Dynamic composite order template for ophthalmology",
        category: "DIAGNOSTIC",
        department_id: "OPHTHALMOLOGY",
        request_form_config_id: requestFormConfig.config_id,
        result_form_config_id: resultFormConfig.config_id,
        sla_config_json: { target_minutes: 45 },
        billing_configuration: { is_billable: true, default_fee: 65.0 },
        status: "PUBLISHED",
        version: "1.0.0",
      },
      adminUserId
    );

    expect(def).toBeDefined();
    expect(def.code).toBe(defCode);
    expect(def.request_form_config_id).toBe(requestFormConfig.config_id);
    expect(def.result_form_config_id).toBe(resultFormConfig.config_id);
    expect(def.status).toBe("PUBLISHED");
  });

  it("should publish an order definition and retrieve it in active definitions", async () => {
    const defCode = `DEF_RENAL_PANEL_${uuidv4().slice(0, 6)}`;
    const def = await clinicalOrderDefinitionService.createOrderDefinition(
      {
        code: defCode,
        name: "Renal Function Panel Order",
        category: "LABORATORY",
        department_id: "LABORATORY",
        status: "DRAFT",
      },
      adminUserId
    );

    expect(def.status).toBe("DRAFT");

    const published = await clinicalOrderDefinitionService.publishOrderDefinition(def.definition_id, adminUserId);
    expect(published.status).toBe("PUBLISHED");

    const activeList = await clinicalOrderDefinitionService.getOrderDefinitions();
    const match = activeList.find((d) => d.code === defCode);
    expect(match).toBeDefined();
  });

  it("should instantiate a runtime ClinicalOrder capturing dynamic form snapshots", async () => {
    const defCode = `DEF_DIALYSIS_${uuidv4().slice(0, 6)}`;
    const def = await clinicalOrderDefinitionService.createOrderDefinition(
      {
        code: defCode,
        name: "Hemodialysis Session Order",
        category: "THERAPEUTIC",
        department_id: "DIALYSIS",
        request_form_config_id: requestFormConfig.config_id,
        result_form_config_id: resultFormConfig.config_id,
        status: "PUBLISHED",
      },
      adminUserId
    );

    const result = await runtimeOrderGenerationService.instantiateRuntimeOrder(
      {
        definition_code: def.code,
        appointment_id: appointmentId,
        patient_id: patientId,
        ordered_by: adminUserId,
        priority: "URGENT",
        notes: "Routine hemodialysis session required",
      },
      adminUserId
    );

    expect(result.success).toBe(true);
    expect(result.order).toBeDefined();
    expect(result.snapshot.form_snapshot.request_form_config_id).toBe(requestFormConfig.config_id);
    expect(result.snapshot.form_snapshot.result_form_config_id).toBe(resultFormConfig.config_id);
  });
});
