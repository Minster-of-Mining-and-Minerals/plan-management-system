"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalConfigurationGovernanceService = require("../services/workflow/clinicalConfigurationGovernanceService");
const clinicalOrderDefinitionService = require("../services/orders/clinicalOrderDefinitionService");
const runtimeOrderGenerationService = require("../services/orders/runtimeOrderGenerationService");

jest.setTimeout(30000);

describe("Phase 2.11.2 — Clinical Configuration Governance & Runtime Validation Engine", () => {
  let adminId;
  let doctorId;
  let patientId;
  let appointmentId;
  let draftOrderDefCode = `DEF_DRAFT_${uuidv4().slice(0, 6)}`;
  let publishedOrderDefCode = `DEF_PUB_${uuidv4().slice(0, 6)}`;

  beforeAll(async () => {
    await db.ClinicalConfigurationGovernanceLog.sync({ alter: true });
    await db.ClinicalOrderDefinition.sync({ alter: true });
    await db.ClinicalOrder.sync({ alter: true });

    const admin = await db.User.create({
      user_id: uuidv4(),
      full_name: "Governance Admin",
      email: `gov_admin_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    adminId = admin.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Governance Lead",
      email: `gov_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Governance Patient",
      email: `gov_patient_${uuidv4()}@novacure.com`,
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
      appointment_type: "Governance Encounter",
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
      notes: "Encounter for Governance Testing",
      workflow_status: "active",
    });
    appointmentId = appointment.appointment_id;
  });

  describe("1. Dynamic Laboratory Workflow Validation", () => {
    it("should validate dynamic laboratory workflow configuration successfully", () => {
      const validation = clinicalConfigurationGovernanceService.validateConfiguration("ORDER_DEFINITION", {
        code: "DEF_LAB_TEST",
        name: "Laboratory Test",
        department_id: "LABORATORY",
        category: "DIAGNOSTIC",
        billing_configuration: { is_billable: true, default_fee: 50.0 },
      });

      expect(validation.is_valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("2. Order Definition Validation & Billing Rule Protection", () => {
    it("should reject publishing an order definition without mandatory billing rule", async () => {
      // 1. Create a DRAFT definition missing billing configuration
      await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Unbilled Pharmacy Prescription",
          code: draftOrderDefCode,
          category: "PRESCRIPTION",
          department_id: "PHARMACY",
          status: "DRAFT",
          is_billable: true,
          billing_configuration: null,
        },
        adminId
      );

      // 2. Attempt to transition to PUBLISHED
      await expect(
        clinicalConfigurationGovernanceService.transitionLifecycleStatus(
          { entity_type: "ORDER_DEFINITION", entity_code: draftOrderDefCode, target_status: "PUBLISHED" },
          adminId
        )
      ).rejects.toThrow("Publishing rejected due to validation failure");
    });
  });

  describe("3. Zero-Code Specialty Onboarding (Physiotherapy)", () => {
    it("should onboard Physiotherapy specialty without code changes and pass governance publishing", async () => {
      await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Physiotherapy Rehabilitation Definition",
          code: publishedOrderDefCode,
          category: "THERAPEUTIC",
          department_id: "PHYSIOTHERAPY",
          status: "DRAFT",
          billing_configuration_id: "BILL_PHYSIO_01",
        },
        adminId
      );

      const pubRes = await clinicalConfigurationGovernanceService.transitionLifecycleStatus(
        { entity_type: "ORDER_DEFINITION", entity_code: publishedOrderDefCode, target_status: "PUBLISHED" },
        adminId
      );

      expect(pubRes.success).toBe(true);
      expect(pubRes.new_status).toBe("PUBLISHED");
    });
  });

  describe("4. Runtime Order Generation Protection", () => {
    it("should block order instantiation for DRAFT/UNPUBLISHED configurations", async () => {
      await expect(
        runtimeOrderGenerationService.instantiateRuntimeOrder(
          {
            definition_code: draftOrderDefCode,
            appointment_id: appointmentId,
            patient_id: patientId,
            ordered_by: doctorId,
          },
          doctorId
        )
      ).rejects.toThrow("Only 'PUBLISHED' configurations are active");
    });

    it("should allow order instantiation for PUBLISHED configurations", async () => {
      const orderRes = await runtimeOrderGenerationService.instantiateRuntimeOrder(
        {
          definition_code: publishedOrderDefCode,
          appointment_id: appointmentId,
          patient_id: patientId,
          ordered_by: doctorId,
        },
        doctorId
      );

      expect(orderRes.success).toBe(true);
      expect(orderRes.order.order_definition_id).toBeDefined();
    });
  });

  describe("5. Multi-Tenant Isolation (Hospital A vs Hospital B)", () => {
    it("should isolate order definitions between Hospital A and Hospital B", async () => {
      const hospACode = `DEF_CBC_HOSP_A_${uuidv4().slice(0, 4)}`;
      const hospBCode = `DEF_CBC_HOSP_B_${uuidv4().slice(0, 4)}`;

      const hospADef = await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Hospital A CBC Test",
          code: hospACode,
          tenant_id: "HOSPITAL_A",
          category: "DIAGNOSTIC",
          department_id: "LABORATORY",
          status: "PUBLISHED",
        },
        adminId
      );

      const hospBDef = await clinicalOrderDefinitionService.createOrderDefinition(
        {
          name: "Hospital B CBC Test",
          code: hospBCode,
          tenant_id: "HOSPITAL_B",
          category: "DIAGNOSTIC",
          department_id: "LABORATORY",
          status: "PUBLISHED",
        },
        adminId
      );

      expect(hospADef.tenant_id).toBe("HOSPITAL_A");
      expect(hospBDef.tenant_id).toBe("HOSPITAL_B");
      expect(hospADef.code).not.toBe(hospBDef.code);
    });
  });

  describe("6. Impact Analysis & Dependency Visualization", () => {
    it("should perform impact analysis and identify dependent patient orders", async () => {
      const impact = await clinicalConfigurationGovernanceService.performImpactAnalysis("ORDER_DEFINITION", publishedOrderDefCode);
      expect(impact).toBeDefined();
      expect(impact.dependent_historical_orders).toBeGreaterThanOrEqual(1);
    });

    it("should generate dependency hierarchy graph for configuration entity", async () => {
      const tree = await clinicalConfigurationGovernanceService.getDependencyTree(publishedOrderDefCode);
      expect(tree.hierarchy).toHaveLength(5);
    });
  });
});
