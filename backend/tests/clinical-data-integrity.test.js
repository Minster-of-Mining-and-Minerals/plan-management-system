"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalAuditEngine = require("../services/clinicalIntegrity/clinicalAuditEngine");
const clinicalRecordVersionService = require("../services/clinicalIntegrity/clinicalRecordVersionService");
const clinicalAmendmentWorkflowService = require("../services/clinicalIntegrity/clinicalAmendmentWorkflowService");
const clinicalComplianceService = require("../services/clinicalIntegrity/clinicalComplianceService");

jest.setTimeout(30000);

describe("Phase 2.9.2 — Clinical Data Integrity, Audit Compliance & Patient Safety Layer", () => {
  let patientId;
  let doctorId;
  let supervisorId;
  let sampleEntityId;

  beforeAll(async () => {
    await db.ClinicalAuditEvent.sync({ alter: true });
    await db.ClinicalRecordVersion.sync({ alter: true });
    await db.ClinicalAmendment.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Integrity Patient",
      email: `integ_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Dr. Integrity Lead",
      email: `integ_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const supervisor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Supervisor Lead",
      email: `integ_super_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    supervisorId = supervisor.user_id;

    sampleEntityId = uuidv4();
  });

  describe("1. Unified Clinical Audit Event Engine", () => {
    it("should record standardized clinical audit event", async () => {
      const audit = await clinicalAuditEngine.recordAuditEvent({
        event_type: "PRESCRIBER_MODIFIED_RX",
        domain: "PHARMACY",
        entity_type: "Prescription",
        entity_id: sampleEntityId,
        patient_id: patientId,
        actor_id: doctorId,
        action: "UPDATE_DOSAGE",
        previous_value: { dose: "250mg" },
        new_value: { dose: "500mg" },
        reason: "Adjusted due to persistent fever",
      });

      expect(audit).toBeDefined();
      expect(audit.domain).toBe("PHARMACY");
      expect(audit.action).toBe("UPDATE_DOSAGE");
    });

    it("should retrieve filtered audit trail for a patient", async () => {
      const trail = await clinicalAuditEngine.getAuditTrail({ patient_id: patientId });
      expect(trail.length).toBeGreaterThanOrEqual(1);
      expect(trail[0].patient_id).toBe(patientId);
    });
  });

  describe("2. Clinical Record Versioning", () => {
    it("should create immutable version snapshot of clinical record", async () => {
      const v1 = await clinicalRecordVersionService.createRecordVersion({
        entity_type: "Prescription",
        entity_id: sampleEntityId,
        snapshot_data: { dose: "250mg", frequency: "BID" },
        changed_by: doctorId,
        change_reason: "Initial prescription creation",
      });

      expect(v1).toBeDefined();
      expect(v1.version_number).toBe(1);

      const v2 = await clinicalRecordVersionService.createRecordVersion({
        entity_type: "Prescription",
        entity_id: sampleEntityId,
        snapshot_data: { dose: "500mg", frequency: "TID" },
        changed_by: doctorId,
        change_reason: "Dose titration",
      });

      expect(v2.version_number).toBe(2);
    });

    it("should retrieve immutable version history for entity", async () => {
      const versions = await clinicalRecordVersionService.getRecordVersions("Prescription", sampleEntityId);
      expect(versions.length).toBe(2);
      expect(versions[0].version_number).toBe(2);
    });
  });

  describe("3. Clinical Amendment Workflow", () => {
    let amendmentId;

    it("should request clinical record amendment", async () => {
      const amendment = await clinicalAmendmentWorkflowService.requestAmendment(
        {
          entity_type: "LabResult",
          entity_id: sampleEntityId,
          patient_id: patientId,
          original_content: { hemoglobin: "10.2" },
          proposed_content: { hemoglobin: "11.5" },
          clinical_reason: "Transcription correction verified by lab supervisor",
        },
        doctorId
      );

      expect(amendment).toBeDefined();
      expect(amendment.status).toBe("REQUESTED");
      amendmentId = amendment.id;
    });

    it("should approve amendment and generate immutable record version snapshot", async () => {
      const reviewed = await clinicalAmendmentWorkflowService.reviewAmendment(
        amendmentId,
        "APPROVED",
        "Verified against raw analyzer output",
        supervisorId
      );

      expect(reviewed.status).toBe("APPROVED");
      expect(reviewed.reviewed_by).toBe(supervisorId);

      const versions = await clinicalRecordVersionService.getRecordVersions("LabResult", sampleEntityId);
      expect(versions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("4. Compliance Analytics", () => {
    it("should compute clinical compliance metrics report", async () => {
      const metrics = await clinicalComplianceService.getComplianceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.total_audit_events).toBeGreaterThanOrEqual(1);
      expect(metrics.total_record_versions).toBeGreaterThanOrEqual(1);
      expect(metrics.amendments_by_status.APPROVED).toBeGreaterThanOrEqual(1);
    });
  });
});
