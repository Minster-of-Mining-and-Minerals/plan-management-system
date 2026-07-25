"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const radiologyService = require("../services/radiologyService");
const radiologyImageService = require("../services/radiologyImageService");
const radiologyReviewService = require("../services/radiologyReviewService");
const radiologyBillingService = require("../services/radiologyBillingService");
const radiologyAnalyticsService = require("../services/radiologyAnalyticsService");

describe("Phase 2.7.2 — Radiology Clinical Completion Layer", () => {
  let patientId;
  let doctorId;
  let radiologistId;
  let appointmentId;
  let orderId;
  let catalogId;
  let studyId;
  let reportId;
  let imageId;
  let reviewId;

  async function createTestEncounter(pId, dId) {
    const schedId = uuidv4();
    const todayStr = new Date().toISOString().split("T")[0];

    await db.PatientSchedule.create({
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      schedule_date: todayStr,
      start_time: "08:00",
      end_time: "17:00",
      status: "admitted",
      appointment_type: "Radiology Encounter",
      created_by: dId,
      updated_by: dId,
    });

    return await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: schedId,
      patient_id: pId,
      assigned_staff_id: dId,
      admitted_by: dId,
      admitted_at: new Date(),
      status: "admitted",
      notes: "Encounter for CT Abdomen/Pelvis",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.RadiologyProcedureCatalog) await db.RadiologyProcedureCatalog.sync({ alter: true });
    if (db.RadiologyStudy) await db.RadiologyStudy.sync({ alter: true });
    if (db.RadiologyReport) await db.RadiologyReport.sync({ alter: true });
    if (db.RadiologyImage) await db.RadiologyImage.sync({ alter: true });
    if (db.RadiologyStudySeries) await db.RadiologyStudySeries.sync({ alter: true });
    if (db.RadiologyClinicalReview) await db.RadiologyClinicalReview.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Completion Patient",
      email: `comp_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Ordering Physician",
      email: `ordering_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const rad = await db.User.create({
      user_id: uuidv4(),
      full_name: "Staff Radiologist",
      email: `staff_rad_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    radiologistId = rad.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const catalog = await radiologyService.createProcedureCatalog(
      {
        code: `CT-ABD-${uuidv4().slice(0, 4).toUpperCase()}`,
        name: "CT Abdomen/Pelvis with Contrast",
        modality: "CT",
        body_region: "ABDOMEN",
        contrast_required: true,
        estimated_duration_minutes: 30,
      },
      doctorId
    );
    catalogId = catalog.procedure_catalog_id;

    const order = await clinicalOrderService.createOrder(
      {
        appointment_id: appointmentId,
        patient_id: patientId,
        order_type: "RADIOLOGY",
        priority: "STAT",
        title: "CT Abdomen/Pelvis with IV Contrast",
      },
      doctorId
    );
    orderId = order.order_id;

    const study = await radiologyService.createStudy(
      orderId,
      {
        procedure_catalog_id: catalogId,
        modality: "CT",
        notes: "Rule out acute appendicitis",
      },
      doctorId
    );
    studyId = study.study_id;
  });

  describe("1. PACS & DICOM Image Integration Foundation", () => {
    it("should register DICOM series metadata for radiology study", async () => {
      const series = await radiologyImageService.registerSeries(
        {
          study_id: studyId,
          series_uid: "1.2.840.113619.2.55.3.2831151000",
          description: "Axial 5mm Soft Tissue",
          modality: "CT",
          body_part: "ABDOMEN",
          instance_count: 120,
        },
        doctorId
      );

      expect(series).toBeDefined();
      expect(series.series_uid).toBe("1.2.840.113619.2.55.3.2831151000");
      expect(series.instance_count).toBe(120);
    });

    it("should register PACS DICOM image metadata for study", async () => {
      const image = await radiologyImageService.registerImage(
        {
          study_id: studyId,
          patient_id: patientId,
          study_instance_uid: "1.2.840.113619.2.55.3.1000000",
          series_instance_uid: "1.2.840.113619.2.55.3.2831151000",
          sop_instance_uid: "1.2.840.113619.2.55.3.2831151001",
          modality: "CT",
          image_count: 120,
          storage_type: "PACS",
          storage_location: "/pacs/archive/2026/07/25/study_1000000",
          viewer_url: "http://pacs.novacure.local/viewer?studyUid=1.2.840.113619.2.55.3.1000000",
        },
        doctorId
      );

      expect(image).toBeDefined();
      expect(image.study_instance_uid).toBe("1.2.840.113619.2.55.3.1000000");
      expect(image.storage_type).toBe("PACS");
      imageId = image.id;
    });

    it("should retrieve registered images for radiology study", async () => {
      const images = await radiologyImageService.getStudyImages(studyId);
      expect(images.length).toBeGreaterThanOrEqual(1);
      expect(images.some((i) => i.id === imageId)).toBe(true);
    });

    it("should generate provider-independent DICOM web viewer link", async () => {
      const link = await radiologyImageService.generateViewerLink(imageId, doctorId);
      expect(link).toBeDefined();
      expect(link.viewer_url).toContain("http://pacs.novacure.local/viewer");
    });
  });

  describe("2. Physician Clinical Review Workflow", () => {
    it("should draft and verify radiology diagnostic report", async () => {
      const report = await radiologyService.submitReport(
        studyId,
        {
          findings: "Dilated appendix with wall thickening and periappendiceal fat stranding.",
          impression: "Acute uncomplicated appendicitis.",
          recommendations: "Urgent surgical consultation.",
        },
        radiologistId
      );

      reportId = report.report_id;
      const verified = await radiologyService.verifyReport(reportId, radiologistId);
      expect(verified.verification_status).toBe("FINAL");
    });

    it("should assign physician clinical review to ordering doctor", async () => {
      const review = await radiologyReviewService.assignReview(studyId, doctorId, doctorId);
      expect(review).toBeDefined();
      expect(review.review_status).toBe("PENDING");
      expect(review.doctor_id).toBe(doctorId);
      reviewId = review.id;
    });

    it("should complete physician review and record clinical decision", async () => {
      const completed = await radiologyReviewService.completeReview(
        reviewId,
        {
          review_notes: "Reviewed CT report and images. Patient admitted for laparoscopic appendectomy.",
          clinical_decision: "PROCEED_WITH_SURGERY",
        },
        doctorId
      );

      expect(completed.review_status).toBe("REVIEWED");
      expect(completed.clinical_decision).toBe("PROCEED_WITH_SURGERY");

      const decision = await radiologyReviewService.recordDecision(
        reviewId,
        { clinical_decision: "SURGICAL_INTERVENTION_SCHEDULED" },
        doctorId
      );
      expect(decision.review_status).toBe("ACKNOWLEDGED");
      expect(decision.clinical_decision).toBe("SURGICAL_INTERVENTION_SCHEDULED");
    });
  });

  describe("3. Patient Portal Result Release Controls", () => {
    it("should withhold radiology report from patient portal by default", async () => {
      const study = await radiologyService.getStudyWithReport(studyId);
      expect(study.report.patient_release_status).toBe("NOT_RELEASED");
    });

    it("should withhold report with documented reason", async () => {
      const withheld = await radiologyService.withholdReportFromPatient(reportId, "Awaiting surgical consent discussion", doctorId);
      expect(withheld.patient_release_status).toBe("WITHHELD");
    });

    it("should release report to patient portal upon clinician authorization", async () => {
      const released = await radiologyService.releaseReportToPatient(reportId, doctorId);
      expect(released.patient_release_status).toBe("RELEASED");
    });
  });

  describe("4. Radiology Billing Charge Integration", () => {
    it("should create billable finance charge entry for completed study", async () => {
      const charge = await radiologyBillingService.createRadiologyCharge(studyId, doctorId);
      expect(charge).toBeDefined();
      expect(charge.success).toBe(true);
    });

    it("should verify billable charge status for study", async () => {
      const verification = await radiologyBillingService.verifyCharge(studyId);
      expect(verification).toBeDefined();
      expect(verification.study_id).toBe(studyId);
    });
  });

  describe("5. Radiology Analytics & Performance", () => {
    it("should calculate operational overview metrics", async () => {
      const overview = await radiologyAnalyticsService.getOverviewMetrics();
      expect(overview).toBeDefined();
      expect(overview.total_studies).toBeGreaterThanOrEqual(1);
      expect(overview.completed_studies).toBeGreaterThanOrEqual(1);
    });

    it("should calculate modality distribution breakdown", async () => {
      const modalities = await radiologyAnalyticsService.getModalityStats();
      expect(modalities).toBeDefined();
      expect(modalities.CT).toBeGreaterThanOrEqual(1);
    });

    it("should calculate radiologist performance statistics", async () => {
      const performance = await radiologyAnalyticsService.getPerformanceMetrics();
      expect(performance).toBeDefined();
      expect(Array.isArray(performance)).toBe(true);
      expect(performance.some((r) => r.user_id === radiologistId)).toBe(true);
    });
  });
});
