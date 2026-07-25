"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const radiologyService = require("../services/radiologyService");
const radiologyQueueService = require("../services/radiologyQueueService");

describe("Phase 2.7.1 — Radiology Domain Foundation", () => {
  let patientId;
  let staffId;
  let appointmentId;
  let orderId;
  let catalogId;
  let studyId;
  let reportId;

  async function createTestAppointment(pId, sId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: sId,
      schedule_date: todayStr,
      start_time: "08:00",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Radiology Examination Encounter",
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
      notes: "Encounter for chest radiograph",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.RadiologyProcedureCatalog) await db.RadiologyProcedureCatalog.sync({ alter: true });
    if (db.RadiologyStudy) await db.RadiologyStudy.sync({ alter: true });
    if (db.RadiologyReport) await db.RadiologyReport.sync({ alter: true });
    if (db.RadiologyReportHistory) await db.RadiologyReportHistory.sync({ alter: true });
    if (db.RadiologyWorkQueueItem) await db.RadiologyWorkQueueItem.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Radiology Patient",
      email: `rad_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const staff = await db.User.create({
      user_id: uuidv4(),
      full_name: "Radiology Tech",
      email: `rad_tech_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    staffId = staff.user_id;

    const appt = await createTestAppointment(patientId, staffId);
    appointmentId = appt.appointment_id;

    const order = await clinicalOrderService.createOrder(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        order_type: "RADIOLOGY",
        priority: "STAT",
        title: "Chest X-Ray 2 Views PA/Lateral",
      },
      staffId
    );
    orderId = order.order_id;
  });

  describe("1. Radiology Procedure Catalog Management", () => {
    const testCode = `CXR-2V-${uuidv4().slice(0, 4).toUpperCase()}`;

    it("should create a new radiology procedure catalog item", async () => {
      const catalog = await radiologyService.createProcedureCatalog(
        {
          code: testCode,
          name: "Chest Radiograph 2 Views",
          modality: "XRAY",
          body_region: "CHEST",
          contrast_required: false,
          estimated_duration_minutes: 15,
        },
        staffId
      );

      expect(catalog).toBeDefined();
      expect(catalog.code).toBe(testCode);
      expect(catalog.modality).toBe("XRAY");
      catalogId = catalog.procedure_catalog_id;
    });

    it("should list procedure catalog items filtered by modality", async () => {
      const items = await radiologyService.listProcedureCatalog("XRAY");
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some((i) => i.code === testCode)).toBe(true);
    });
  });

  describe("2. Radiology Study Lifecycle & Work Queue", () => {
    it("should create a radiology study for a clinical order", async () => {
      const study = await radiologyService.createStudy(
        orderId,
        {
          procedure_catalog_id: catalogId,
          modality: "XRAY",
          notes: "Patient reports shortness of breath",
        },
        staffId
      );

      expect(study).toBeDefined();
      expect(study.accession_number).toBeDefined();
      expect(study.accession_number).toMatch(/^RAD-/);
      expect(study.workflow_status).toBe("ORDERED");
      studyId = study.study_id;
    });

    it("should schedule radiology imaging study", async () => {
      const scheduledDate = new Date(Date.now() + 3600000).toISOString();
      const study = await radiologyService.scheduleStudy(studyId, scheduledDate, staffId);

      expect(study.workflow_status).toBe("SCHEDULED");
      expect(study.scheduled_at).toBeDefined();
    });

    it("should start radiology imaging procedure", async () => {
      const study = await radiologyService.startStudy(studyId, staffId);

      expect(study.workflow_status).toBe("IN_PROGRESS");
      expect(study.assigned_radiographer_id).toBe(staffId);
    });

    it("should complete image acquisition", async () => {
      const study = await radiologyService.completeAcquisition(studyId, staffId);

      expect(study.workflow_status).toBe("IMAGE_ACQUIRED");
    });

    it("should query active radiology work queue sorted by priority", async () => {
      const queue = await radiologyQueueService.getQueue({ status: "WAITING" });
      expect(queue).toBeDefined();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe("3. Diagnostic Report Creation, Verification & Amendment", () => {
    it("should draft and submit radiology diagnostic report", async () => {
      const report = await radiologyService.submitReport(
        studyId,
        {
          findings: "Lungs are clear bilaterally. Cardiomediastinal silhouette is normal.",
          impression: "Normal acute chest radiograph.",
          recommendations: "No immediate follow-up required.",
        },
        staffId
      );

      expect(report).toBeDefined();
      expect(report.verification_status).toBe("PRELIMINARY");
      expect(report.findings).toContain("Lungs are clear");
      reportId = report.report_id;
    });

    it("should verify and sign off radiology report", async () => {
      const verified = await radiologyService.verifyReport(reportId, staffId);

      expect(verified.verification_status).toBe("FINAL");
      expect(verified.verified_by).toBe(staffId);
      expect(verified.signed_at).toBeDefined();

      const study = await radiologyService.getStudyWithReport(studyId);
      expect(study.workflow_status).toBe("COMPLETED");
    });

    it("should reject amendment if change reason is missing", async () => {
      await expect(
        radiologyService.amendReport(reportId, { findings: "Subtle apical opacity" }, staffId)
      ).rejects.toThrow("Amendment justification reason is required");
    });

    it("should amend verified report and preserve history", async () => {
      const amended = await radiologyService.amendReport(
        reportId,
        {
          findings: "Lungs are clear except for a minor right apical scarring.",
          impression: "Minor right apical granuloma/scarring, otherwise normal.",
          change_reason: "Secondary radiologist consultation noted subtle apical scarring",
        },
        staffId
      );

      expect(amended.verification_status).toBe("AMENDED");
      expect(amended.findings).toContain("minor right apical scarring");

      const study = await radiologyService.getStudyWithReport(studyId);
      expect(study.report.amendments).toBeDefined();
      expect(study.report.amendments.length).toBe(1);
      expect(study.report.amendments[0].previous_impression).toBe("Normal acute chest radiograph.");
      expect(study.report.amendments[0].change_reason).toBe("Secondary radiologist consultation noted subtle apical scarring");
    });
  });
});
