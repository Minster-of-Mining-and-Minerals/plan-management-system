"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const organizationTenantService = require("../services/organization/organizationTenantService");
const facilityHierarchyService = require("../services/organization/facilityHierarchyService");
const userFacilityAssignmentService = require("../services/organization/userFacilityAssignmentService");
const tenantBrandingService = require("../services/organization/tenantBrandingService");
const patientEnterpriseIdentityService = require("../services/patient/patientEnterpriseIdentityService");
const tenantIsolationGuard = require("../services/organization/tenantIsolationGuard");

jest.setTimeout(30000);

describe("Phase 2.12.0 — Enterprise Multi-Tenant Healthcare Network Platform", () => {
  let tenantA;
  let tenantB;
  let facilityA1;
  let facilityA2;
  let facilityB1;
  let staffUser;
  let patientUser;

  beforeAll(async () => {
    try {
      await db.OrganizationTenant.sync({ force: true });
      await db.Facility.sync({ force: true });
      await db.Unit.sync({ force: true });
      await db.Department.sync({ alter: true });
      await db.UserFacilityAssignment.sync({ force: true });
      await db.PatientFacilityRecord.sync({ force: true });
      await db.ClinicalResource.sync({ force: true });
      await db.ClinicalOrderDefinition.sync({ alter: true });
      await db.ClinicalOrder.sync({ alter: true });
    } catch (err) {
      process.stdout.write(`\n=== BEFOREALL ERROR ===\n${err.original?.message || err.stack || err.message}\n===============\n`);
      throw err;
    }

    // Seed Staff User
    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Multi Facility Lead",
      email: `multi_staff_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffUser = staff.get({ plain: true });

    // Seed Global Patient User
    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Global Network Patient",
      email: `global_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientUser = patient.get({ plain: true });
    await db.PatientProfile.create({
      patient_profile_id: uuidv4(),
      user_id: patientUser.user_id,
      patient_code: `PAT-${uuidv4().slice(0, 6)}`,
      patient_status: "active",
    });
  });

  describe("1. Organization Tenant & Facility Hierarchy Engine", () => {
    it("should create organization tenants and hierarchy tree (Tenant -> Facility -> Department -> Unit)", async () => {
      // Create Tenant A (Metro Hospital Group)
      tenantA = await organizationTenantService.createTenant({
        name: `Metro Hospital Group ${uuidv4().slice(0, 4)}`,
        type: "HOSPITAL_GROUP",
        country: "US",
        currency: "USD",
        timezone: "America/New_York",
      });
      expect(tenantA.tenant_id).toBeDefined();

      // Create Tenant B (Apex Clinic Network)
      tenantB = await organizationTenantService.createTenant({
        name: `Apex Clinic Network ${uuidv4().slice(0, 4)}`,
        type: "CLINIC",
        country: "UK",
        currency: "GBP",
        timezone: "Europe/London",
      });
      expect(tenantB.tenant_id).toBeDefined();

      // Create Facilities for Tenant A
      facilityA1 = await facilityHierarchyService.createFacility({
        tenant_id: tenantA.tenant_id,
        name: "Metro Central Hospital",
        code: "MCH-01",
        type: "MAIN_HOSPITAL",
      });

      facilityA2 = await facilityHierarchyService.createFacility({
        tenant_id: tenantA.tenant_id,
        name: "Metro West Outpatient Clinic",
        code: "MWC-02",
        type: "BRANCH_CLINIC",
      });

      // Create Facility for Tenant B
      facilityB1 = await facilityHierarchyService.createFacility({
        tenant_id: tenantB.tenant_id,
        name: "Apex Downtown Clinic",
        code: "ADC-01",
        type: "CLINIC",
      });

      // Create Department & Unit under Metro Central Hospital
      const dept = await db.Department.create({
        department_id: uuidv4(),
        facility_id: facilityA1.facility_id,
        tenant_id: tenantA.tenant_id,
        name: `Cardiology Dept ${uuidv4().slice(0, 4)}`,
        code: `CARD_${uuidv4().slice(0, 4)}`,
        slug: `cardiology-${uuidv4().slice(0, 4)}`,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      });

      const unit = await facilityHierarchyService.createUnit({
        department_id: dept.department_id,
        facility_id: facilityA1.facility_id,
        tenant_id: tenantA.tenant_id,
        name: "Cardiac ICU Unit 1",
        code: `CICU-${uuidv4().slice(0, 4)}`,
      });

      const hierarchy = await organizationTenantService.getTenantHierarchyTree(tenantA.tenant_id);
      expect(hierarchy).toBeDefined();
      expect(hierarchy.facilities.length).toBeGreaterThanOrEqual(2);
      const mainHospital = hierarchy.facilities.find((f) => f.facility_id === facilityA1.facility_id);
      expect(mainHospital.departments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Tenant Isolation Layer & Configuration Separation", () => {
    it("should separate clinical order definitions and resources between Tenant A and Tenant B", async () => {
      const codeA = `ECG_PANEL_A_${uuidv4().slice(0, 4)}`;
      const codeB = `ECG_PANEL_B_${uuidv4().slice(0, 4)}`;

      // Tenant A Order Definition
      const orderDefA = await db.ClinicalOrderDefinition.create({
        definition_id: uuidv4(),
        tenant_id: tenantA.tenant_id,
        facility_id: facilityA1.facility_id,
        code: codeA,
        name: "Metro 12-Lead ECG Panel",
        category: "DIAGNOSTIC",
        department_id: "CARDIOLOGY",
        is_billable: true,
        billing_configuration: { is_billable: true, default_fee: 150.0 },
        status: "PUBLISHED",
      });

      // Tenant B Order Definition
      const orderDefB = await db.ClinicalOrderDefinition.create({
        definition_id: uuidv4(),
        tenant_id: tenantB.tenant_id,
        facility_id: facilityB1.facility_id,
        code: codeB,
        name: "Apex Express ECG Panel",
        category: "DIAGNOSTIC",
        department_id: "CARDIOLOGY",
        is_billable: true,
        billing_configuration: { is_billable: true, default_fee: 90.0 },
        status: "PUBLISHED",
      });

      const tenantAOrders = await db.ClinicalOrderDefinition.findAll({
        where: { tenant_id: tenantA.tenant_id, code: codeA },
      });
      const tenantBOrders = await db.ClinicalOrderDefinition.findAll({
        where: { tenant_id: tenantB.tenant_id, code: codeB },
      });

      expect(tenantAOrders).toHaveLength(1);
      expect(tenantBOrders).toHaveLength(1);
      expect(tenantAOrders[0].name).toBe("Metro 12-Lead ECG Panel");
      expect(tenantBOrders[0].name).toBe("Apex Express ECG Panel");
    });
  });

  describe("3. Enterprise User Assignment", () => {
    it("should support assigning one user to multiple facilities with different roles", async () => {
      // Assign staff user to Metro Central Hospital as Lead Doctor
      const assignA1 = await userFacilityAssignmentService.assignUserToFacility({
        user_id: staffUser.user_id,
        tenant_id: tenantA.tenant_id,
        facility_id: facilityA1.facility_id,
        role_name: "Lead Doctor",
        is_default: true,
      });

      // Assign same staff user to Metro West Clinic as Consulting Specialist
      const assignA2 = await userFacilityAssignmentService.assignUserToFacility({
        user_id: staffUser.user_id,
        tenant_id: tenantA.tenant_id,
        facility_id: facilityA2.facility_id,
        role_name: "Consulting Specialist",
        is_default: false,
      });

      const userAssignments = await userFacilityAssignmentService.getUserAssignments(staffUser.user_id);
      expect(userAssignments.length).toBeGreaterThanOrEqual(2);

      const roleA1 = await userFacilityAssignmentService.getUserRoleForFacility(staffUser.user_id, facilityA1.facility_id);
      const roleA2 = await userFacilityAssignmentService.getUserRoleForFacility(staffUser.user_id, facilityA2.facility_id);

      expect(roleA1.role_name).toBe("Lead Doctor");
      expect(roleA2.role_name).toBe("Consulting Specialist");
    });
  });

  describe("4. Patient Enterprise Identity", () => {
    it("should maintain global patient identity across multiple facility records with local MRNs", async () => {
      const mrnA = `MCH-MRN-${uuidv4().slice(0, 6)}`;
      const mrnB = `ADC-MRN-${uuidv4().slice(0, 6)}`;

      // Register global patient at Metro Central Hospital
      const recordA = await patientEnterpriseIdentityService.registerPatientAtFacility({
        patient_id: patientUser.user_id,
        tenant_id: tenantA.tenant_id,
        facility_id: facilityA1.facility_id,
        facility_mrn: mrnA,
      });

      // Register same global patient at Apex Downtown Clinic
      const recordB = await patientEnterpriseIdentityService.registerPatientAtFacility({
        patient_id: patientUser.user_id,
        tenant_id: tenantB.tenant_id,
        facility_id: facilityB1.facility_id,
        facility_mrn: mrnB,
      });

      const globalIdentity = await patientEnterpriseIdentityService.getGlobalPatientIdentity(patientUser.user_id);
      expect(globalIdentity).toBeDefined();
      expect(globalIdentity.patientFacilityRecords.length).toBeGreaterThanOrEqual(2);

      const mrns = globalIdentity.patientFacilityRecords.map((r) => r.facility_mrn);
      expect(mrns).toContain(mrnA);
      expect(mrns).toContain(mrnB);
    });
  });

  describe("5. Tenant Branding Engine", () => {
    it("should provide tenant-specific branding configuration (logo, colors, app name, favicon)", async () => {
      // Update branding for Tenant A
      await tenantBrandingService.updateBranding(tenantA.tenant_id, {
        application_name: "Metro Care Operating System",
        logo_url: "/metro-logo.png",
        favicon_url: "/metro-favicon.ico",
        colors: {
          primary: "#1e3a8a",
          secondary: "#3b82f6",
          accent: "#10b981",
        },
      });

      // Update branding for Tenant B
      await tenantBrandingService.updateBranding(tenantB.tenant_id, {
        application_name: "Apex Express Clinic Portal",
        logo_url: "/apex-logo.png",
        favicon_url: "/apex-favicon.ico",
        colors: {
          primary: "#7c3aed",
          secondary: "#a855f7",
          accent: "#f59e0b",
        },
      });

      const brandingA = await tenantBrandingService.getBranding(tenantA.tenant_id);
      const brandingB = await tenantBrandingService.getBranding(tenantB.tenant_id);

      expect(brandingA.application_name).toBe("Metro Care Operating System");
      expect(brandingA.colors.primary).toBe("#1e3a8a");

      expect(brandingB.application_name).toBe("Apex Express Clinic Portal");
      expect(brandingB.colors.primary).toBe("#7c3aed");
    });
  });

  describe("6. Runtime Enforcement & Data Access Protection", () => {
    it("should enforce tenant boundary and block cross-tenant runtime object access", async () => {
      const schedId = uuidv4();
      await db.PatientSchedule.create({
        schedule_id: schedId,
        patient_id: patientUser.user_id,
        assigned_staff_id: staffUser.user_id,
        schedule_date: "2026-07-26",
        start_time: "08:00",
        end_time: "17:00",
        status: "admitted",
        appointment_type: "Tenant Test Encounter",
        created_by: staffUser.user_id,
        updated_by: staffUser.user_id,
      });

      const appointment = await db.StaffAppointment.create({
        appointment_id: uuidv4(),
        schedule_id: schedId,
        patient_id: patientUser.user_id,
        assigned_staff_id: staffUser.user_id,
        admitted_by: staffUser.user_id,
        admitted_at: new Date(),
        status: "admitted",
        notes: "Encounter for Tenant Isolation Testing",
        workflow_status: "active",
      });

      // Clinical Order created in Tenant A
      const runtimeOrderA = await db.ClinicalOrder.create({
        order_id: uuidv4(),
        appointment_id: appointment.appointment_id,
        ordered_by: staffUser.user_id,
        title: "Complete Blood Count Test",
        tenant_id: tenantA.tenant_id,
        facility_id: facilityA1.facility_id,
        patient_id: patientUser.user_id,
        ordering_provider_id: staffUser.user_id,
        order_type: "LABORATORY",
        order_code: "CBC_TEST",
        order_name: "Complete Blood Count",
        status: "ACTIVE",
      });

      // Verification: same tenant access allowed
      expect(() => {
        tenantIsolationGuard.validateRuntimeAccess(runtimeOrderA, tenantA.tenant_id, facilityA1.facility_id);
      }).not.toThrow();

      // Verification: cross-tenant access attempt blocked with 403
      expect(() => {
        tenantIsolationGuard.validateRuntimeAccess(runtimeOrderA, tenantB.tenant_id, facilityB1.facility_id);
      }).toThrow(/Cross-tenant access blocked/);
    });
  });
});
