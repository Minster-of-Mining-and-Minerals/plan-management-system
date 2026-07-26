"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderDefinitionService = require("../services/orders/clinicalOrderDefinitionService");
const runtimeOrderGenerationService = require("../services/orders/runtimeOrderGenerationService");

describe("Phase 2.11.3 — Unified Dynamic Clinical Order Platform", () => {
  let tenantId = "DEFAULT_HOSPITAL";
  let staffId;
  let patientId;
  let appointmentId;
  let formTemplateId;

  beforeAll(async () => {
    try {
      await db.OrganizationTenant.sync({ force: true });
      await db.ClinicalOrderDefinition.sync({ alter: true });
      await db.ClinicalOrder.sync({ alter: true });
      await db.DiagnosisFormConfig.sync({ alter: true });
      if (db.ClinicalFormTemplate) {
        await db.ClinicalFormTemplate.sync({ alter: true });
      }
      await db.User.sync({ alter: true });
      await db.StaffAppointment.sync({ alter: true });

      // Create staff user & patient
      const staff = await db.User.create({
        user_id: uuidv4(),
        full_name: "Dr. Unified Architecture",
        email: `unified_dr_${uuidv4().slice(0, 6)}@novacure.com`,
        password: "password_123",
        account_type: "INTERNAL",
        is_active: true,
      });
      staffId = staff.user_id;

      const patient = await db.User.create({
        user_id: uuidv4(),
        full_name: "John Unified Patient",
        email: `unified_pt_${uuidv4().slice(0, 6)}@novacure.com`,
        password: "password_123",
        account_type: "PATIENT",
        is_active: true,
      });
      patientId = patient.user_id;

      // Create reusable form template
      const formConfig = await db.ClinicalFormTemplate.create({
        template_id: uuidv4(),
        title: "CBC Specimen Collection Form Template",
        is_active: true,
      });
      formTemplateId = formConfig.template_id;

      await db.PatientSchedule.sync({ alter: true });
      const schedule = await db.PatientSchedule.create({
        schedule_id: uuidv4(),
        patient_id: patientId,
        assigned_staff_id: staffId,
        schedule_date: "2026-07-26",
        start_time: "09:00",
        end_time: "09:30",
        appointment_type: "General Outpatient",
        status: "SCHEDULED",
        created_by: staffId,
      });

      // Create appointment
      const appointment = await db.StaffAppointment.create({
        appointment_id: uuidv4(),
        schedule_id: schedule.schedule_id,
        patient_id: patientId,
        assigned_staff_id: staffId,
        appointment_date: new Date(),
        admitted_at: new Date(),
        appointment_type: "General Outpatient",
        status: "CHECKED_IN",
        workflow_status: "IN_TRIAGE",
        queue_number: 101,
      });
      appointmentId = appointment.appointment_id;
    } catch (err) {
      process.stdout.write(`\n=== BEFOREALL SETUP ERROR ===\n${err.original?.message || err.stack || err.message}\n===============\n`);
      throw err;
    }
  });

  describe("1. Unified Clinical Order Definition Architecture", () => {
    it("should create a composite ClinicalOrderDefinition linking reusable form templates, SLAs, and billing rules", async () => {
      const code = `UNIFIED_CBC_${uuidv4().slice(0, 6)}`;
      const defData = {
        definition_id: uuidv4(),
        organization_id: "DEFAULT_ORG",
        tenant_id: tenantId,
        code,
        name: "Unified Complete Blood Count Investigation",
        description: "Composite order definition encapsulating form templates, queueing, SLA, and billing",
        category: "DIAGNOSTIC",
        department_id: "LABORATORY",
        activity_type: "ORDER",
        request_form_config_id: formTemplateId,
        result_form_config_id: formTemplateId,
        verification_form_config_id: formTemplateId,
        queue_config_json: { target_queue: "MAIN_LAB_QUEUE", station: "BENCH_1" },
        sla_config_json: { target_sla_minutes: 45, alert_threshold_minutes: 35 },
        billing_configuration: { is_billable: true, default_fee: 55.0, CPT_code: "85025" },
        automation_rules_json: { auto_forward_on_result: true },
        decision_support_rules_json: { critical_panic_wbc: 20.0 },
        version: "1.0.0",
        status: "PUBLISHED",
      };

      const def = await clinicalOrderDefinitionService.createOrderDefinition(defData, staffId);
      expect(def).toBeDefined();
      expect(def.code).toBe(code);
      expect(def.request_form_config_id).toBe(formTemplateId);
      expect(def.billing_configuration.default_fee).toBe(55.0);
    });
  });

  describe("2. ClinicalFormTemplate Model Alias", () => {
    it("should access diagnosis_form_configs through ClinicalFormTemplate model alias", async () => {
      if (db.ClinicalFormTemplate) {
        try {
          const template = await db.ClinicalFormTemplate.findByPk(formTemplateId);
          expect(template).toBeDefined();
          expect(template.title).toContain("CBC Specimen Collection");
        } catch (err) {
          process.stdout.write(`\n=== TEST 2 ERROR ===\n${err.original?.message || err.stack || err.message}\n===============\n`);
          throw err;
        }
      }
    });
  });

  describe("3. Runtime Order Instantiation & Configuration Snapshot Preservation", () => {
    it("should instantiate runtime order and preserve composite configuration snapshot", async () => {
      const code = `UNIFIED_TEST_${uuidv4().slice(0, 6)}`;
      const defData = {
        definition_id: uuidv4(),
        organization_id: "DEFAULT_ORG",
        tenant_id: tenantId,
        code,
        name: "Unified Lipid Panel Order",
        category: "DIAGNOSTIC",
        department_id: "LABORATORY",
        request_form_config_id: formTemplateId,
        sla_config_json: { target_sla_minutes: 60 },
        billing_configuration: { is_billable: true, default_fee: 75.0 },
        version: "1.0.0",
        status: "PUBLISHED",
      };
      const def = await clinicalOrderDefinitionService.createOrderDefinition(defData, staffId);

      const result = await runtimeOrderGenerationService.instantiateRuntimeOrder(
        {
          definition_code: def.code,
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: staffId,
          tenant_id: tenantId,
          intent_data: { reason: "Routine Lipid Screening" },
        },
        staffId
      );

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.definition_snapshot.code).toBe(code);
      expect(result.snapshot.billing_snapshot.default_fee).toBe(75.0);
      expect(result.snapshot.form_snapshot.request_form_config_id).toBe(formTemplateId);
    });
  });
});
