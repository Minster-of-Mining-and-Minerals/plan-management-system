"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const clinicalOrderService = require("../services/clinicalOrderService");
const radiologyService = require("../services/radiologyService");
const radiologyImageService = require("../services/radiologyImageService");
const radiologyReportingTemplateService = require("../services/radiologyReportingTemplateService");
const radiologyCriticalAlertService = require("../services/radiologyCriticalAlertService");
const radiologySchedulingService = require("../services/radiologySchedulingService");
const externalRadiologyStudyService = require("../services/externalRadiologyStudyService");

describe("Phase 2.7.3 — Radiology Advanced Clinical Hardening & Production Completion", () => {
  let patientId;
  let doctorId;
  let radiologistId;
  let appointmentId;
  let orderId;
  let catalogId;
  let studyId;
  let imageId;
  let reportId;
  let templateId;
  let alertId;
  let resourceId;
  let reservationId;
  let externalStudyId;

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
      appointment_type: "Advanced Radiology Encounter",
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
      notes: "Encounter for Brain MRI & External Import",
      workflow_status: "active",
    });
  }

  beforeAll(async () => {
    if (db.RadiologyReportTemplate) await db.RadiologyReportTemplate.sync({ alter: true });
    if (db.RadiologyReportTemplateSection) await db.RadiologyReportTemplateSection.sync({ alter: true });
    await db.ClinicalOrder.sync({ alter: true });
    await db.ClinicalOrderResult.sync({ alter: true });
    if (db.RadiologyProcedureCatalog) await db.RadiologyProcedureCatalog.sync({ alter: true });
    if (db.RadiologyStudy) await db.RadiologyStudy.sync({ alter: true });
    if (db.RadiologyReport) await db.RadiologyReport.sync({ alter: true });
    if (db.RadiologyImage) await db.RadiologyImage.sync({ alter: true });
    if (db.RadiologyCriticalAlert) await db.RadiologyCriticalAlert.sync({ alter: true });
    if (db.RadiologyResource) await db.RadiologyResource.sync({ alter: true });
    if (db.RadiologyResourceAvailability) await db.RadiologyResourceAvailability.sync({ alter: true });
    if (db.RadiologyExternalStudy) await db.RadiologyExternalStudy.sync({ alter: true });

    const patient = await db.User.create({
      user_id: uuidv4(),
      full_name: "Advanced Radiology Patient",
      email: `adv_patient_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "PATIENT",
      is_active: true,
    });
    patientId = patient.user_id;

    const doctor = await db.User.create({
      user_id: uuidv4(),
      full_name: "Ordering Physician Doc",
      email: `adv_doc_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    doctorId = doctor.user_id;

    const rad = await db.User.create({
      user_id: uuidv4(),
      full_name: "Expert Radiologist",
      email: `adv_rad_${uuidv4()}@novacure.com`,
      password: "password_123",
      account_type: "INTERNAL",
      is_active: true,
    });
    radiologistId = rad.user_id;

    const appt = await createTestEncounter(patientId, doctorId);
    appointmentId = appt.appointment_id;

    const catalog = await radiologyService.createProcedureCatalog(
      {
        code: `MRI-BRAIN-${uuidv4().slice(0, 4).toUpperCase()}`,
        name: "Brain MRI with/without Contrast",
        modality: "MRI",
        body_region: "HEAD",
        contrast_required: true,
        estimated_duration_minutes: 45,
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
        title: "MRI Brain Rule Out Intracranial Hemorrhage",
      },
      doctorId
    );
    orderId = order.order_id;

    const study = await radiologyService.createStudy(
      orderId,
      {
        procedure_catalog_id: catalogId,
        modality: "MRI",
        notes: "Sudden onset severe headache",
      },
      doctorId
    );
    studyId = study.study_id;

    const image = await radiologyImageService.registerImage(
      {
        study_id: studyId,
        patient_id: patientId,
        study_instance_uid: "1.3.12.2.1107.5.2.32.35123.100000",
        storage_type: "PACS",
        storage_location: "/pacs/archive/2026/mri_brain_100000",
        viewer_url: "http://pacs.novacure.local/ohif/viewer?studyUid=1.3.12.2.1107.5.2.32.35123.100000",
      },
      doctorId
    );
    imageId = image.id;
  });

  describe("1. DICOM Web Viewer Session Integration Engine", () => {
    it("should generate authenticated DICOM Web Viewer session configuration", async () => {
      const session = await radiologyImageService.generateViewerSession(imageId, doctorId);
      expect(session).toBeDefined();
      expect(session.session_id).toBeDefined();
      expect(session.viewer_type).toBe("OHIF");
      expect(session.viewer_configuration).toBeDefined();
    });

    it("should validate access permissions before launching DICOM viewer session", async () => {
      const image = await radiologyImageService.validateViewerAccess(imageId, doctorId);
      expect(image).toBeDefined();
      expect(image.id).toBe(imageId);
    });

    it("should retrieve DICOM viewer objects and series for a study", async () => {
      const viewerData = await radiologyImageService.getStudyViewer(studyId);
      expect(viewerData).toBeDefined();
      expect(viewerData.images.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("2. Structured Radiology Report Templates", () => {
    it("should create structured report template with default sections", async () => {
      const template = await radiologyReportingTemplateService.createTemplate(
        {
          name: "Standard Brain MRI Template",
          procedure_type: "MRI Brain",
          modality: "MRI",
        },
        radiologistId
      );

      expect(template).toBeDefined();
      expect(template.name).toBe("Standard Brain MRI Template");
      expect(template.sections.length).toBeGreaterThanOrEqual(4);
      templateId = template.id;
    });

    it("should retrieve matching report template for procedure", async () => {
      const template = await radiologyReportingTemplateService.getTemplateForProcedure("MRI Brain", "MRI");
      expect(template).toBeDefined();
      expect(template.id).toBe(templateId);
    });

    it("should apply structured template sections to a diagnostic report", async () => {
      const report = await radiologyService.submitReport(
        studyId,
        {
          findings: "Pre-template findings draft.",
          impression: "Pre-template impression draft.",
        },
        radiologistId
      );
      reportId = report.report_id;

      const updatedReport = await radiologyReportingTemplateService.applyTemplateToReport(
        reportId,
        templateId,
        {
          "Clinical History": "Sudden onset thunderclap headache.",
          "Findings": "Acute subarachnoid hemorrhage in the basal cisterns.",
          "Impression": "Acute subarachnoid hemorrhage. Immediate neurosurgical consultation advised.",
        },
        radiologistId
      );

      expect(updatedReport.template_id).toBe(templateId);
      expect(updatedReport.structured_sections).toBeDefined();
      expect(updatedReport.findings).toContain("Acute subarachnoid hemorrhage");
    });
  });

  describe("3. Critical Result Communication & Safety Workflow", () => {
    it("should create critical alert for life-threatening finding and notify physician", async () => {
      const alert = await radiologyCriticalAlertService.createAlert(
        {
          study_id: studyId,
          severity: "CRITICAL",
          finding: "Acute subarachnoid hemorrhage in basal cisterns requiring urgent neurosurgical evaluation.",
          recipient_doctor_id: doctorId,
        },
        radiologistId
      );

      expect(alert).toBeDefined();
      expect(alert.severity).toBe("CRITICAL");
      expect(alert.status).toBe("OPEN");
      alertId = alert.id;
    });

    it("should acknowledge critical result alert by ordering physician", async () => {
      const ack = await radiologyCriticalAlertService.acknowledgeAlert(alertId, doctorId);
      expect(ack.status).toBe("ACKNOWLEDGED");
      expect(ack.acknowledged_by).toBe(doctorId);
      expect(ack.acknowledged_at).toBeDefined();
    });

    it("should close critical alert after clinical intervention is recorded", async () => {
      const closed = await radiologyCriticalAlertService.closeAlert(alertId, doctorId);
      expect(closed.status).toBe("CLOSED");
    });
  });

  describe("4. Radiology Equipment & Room Resource Scheduling", () => {
    it("should register radiology equipment resource", async () => {
      const resource = await radiologySchedulingService.createResource(
        {
          name: "Siemens 3T MAGNETOM Skyra MRI",
          resource_type: "MRI_MACHINE",
          location: "Radiology Suite 2 - Ground Floor",
        },
        doctorId
      );

      expect(resource).toBeDefined();
      expect(resource.resource_type).toBe("MRI_MACHINE");
      resourceId = resource.id;
    });

    it("should reserve resource slot for imaging study", async () => {
      const from = new Date(Date.now() + 3600000).toISOString();
      const to = new Date(Date.now() + 7200000).toISOString();

      const reservation = await radiologySchedulingService.reserveResource(
        resourceId,
        studyId,
        from,
        to,
        doctorId
      );

      expect(reservation).toBeDefined();
      expect(reservation.resource_id).toBe(resourceId);
      reservationId = reservation.id;
    });

    it("should find available slots for resource", async () => {
      const slots = await radiologySchedulingService.findAvailableSlots(resourceId, "2026-07-25");
      expect(slots).toBeDefined();
      expect(slots.availabilities.length).toBeGreaterThanOrEqual(1);
    });

    it("should release resource reservation slot", async () => {
      const res = await radiologySchedulingService.releaseResource(reservationId, doctorId);
      expect(res.success).toBe(true);
    });
  });

  describe("5. External Imaging Study Import", () => {
    it("should import outside hospital imaging study into patient record", async () => {
      const externalStudy = await externalRadiologyStudyService.importStudy(
        {
          patient_id: patientId,
          source_facility: "St. Jude Metropolitan Hospital",
          study_date: "2026-07-20",
          modality: "CT",
          description: "Prior Non-Contrast Head CT for baseline comparison",
          report_attachment: "http://docs.novacure.local/ext/st_jude_head_ct_report.pdf",
          image_reference: "DICOM-CD-20260720-001",
        },
        doctorId
      );

      expect(externalStudy).toBeDefined();
      expect(externalStudy.source_facility).toBe("St. Jude Metropolitan Hospital");
      externalStudyId = externalStudy.id;
    });

    it("should link external study to patient chronological timeline", async () => {
      const res = await externalRadiologyStudyService.linkToPatientTimeline(externalStudyId, doctorId);
      expect(res.success).toBe(true);
    });

    it("should query imported external studies for patient", async () => {
      const studies = await externalRadiologyStudyService.listPatientExternalStudies(patientId);
      expect(studies.length).toBeGreaterThanOrEqual(1);
      expect(studies.some((s) => s.id === externalStudyId)).toBe(true);
    });
  });
});
