"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");
const radiologyQueueService = require("./radiologyQueueService");

class RadiologyService {
  /**
   * Helper to log audit events into NovaCure audit system.
   */
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "Radiology",
        resourceId,
        details,
      });
    }
  }

  /**
   * Helper to emit timeline events safely.
   */
  async emitTimelineEvent(eventData, transaction = null) {
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(eventData, transaction);
      } catch (err) {
        console.error("Failed to emit radiology timeline event:", err.message);
      }
    }
  }

  /**
   * Generate a unique radiology accession number (e.g., RAD-20260725-XXXX).
   */
  generateAccessionNumber() {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `RAD-${today}-${randomSuffix}`;
  }

  /**
   * Create or update a radiology procedure catalog entry.
   */
  async createProcedureCatalog(payload, staffId) {
    const { code, name, description, modality = "XRAY", body_region = "CHEST", contrast_required = false, estimated_duration_minutes = 30, billing_service_id, is_active = true } = payload;

    if (!code || !name) {
      const err = new Error("Procedure catalog code and name are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const catalog = await db.RadiologyProcedureCatalog.create(
        {
          procedure_catalog_id: uuidv4(),
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description ? description.trim() : null,
          modality: modality.trim().toUpperCase(),
          body_region: body_region.trim().toUpperCase(),
          contrast_required: Boolean(contrast_required),
          estimated_duration_minutes: Number(estimated_duration_minutes) || 30,
          billing_service_id: billing_service_id || null,
          is_active: Boolean(is_active),
        },
        { transaction: t }
      );

      await this.logAudit("RADIOLOGY_CATALOG_CREATED", catalog.procedure_catalog_id, staffId, { code, name }, t);
      await t.commit();
      return catalog.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * List procedure catalog items filtered by modality.
   */
  async listProcedureCatalog(modality = null) {
    const where = { is_active: true };
    if (modality) {
      where.modality = modality.trim().toUpperCase();
    }

    const items = await db.RadiologyProcedureCatalog.findAll({
      where,
      include: db.BillingService
        ? [{ model: db.BillingService, as: "billingService", attributes: ["service_id", "name", "total_amount", "code"] }]
        : [],
      order: [["name", "ASC"]],
    });

    return items.map((i) => i.get({ plain: true }));
  }

  /**
   * Create a radiology study for a clinical order.
   */
  async createStudy(orderId, payload, staffId) {
    const { procedure_catalog_id, modality = "XRAY", notes, scheduled_at } = payload || {};

    const t = await db.sequelize.transaction();
    try {
      const order = await db.ClinicalOrder.findByPk(orderId, { transaction: t });
      if (!order) {
        const err = new Error("Clinical order not found");
        err.status = 404;
        throw err;
      }

      let catalogModality = modality;
      if (procedure_catalog_id) {
        const catalog = await db.RadiologyProcedureCatalog.findByPk(procedure_catalog_id, { transaction: t });
        if (catalog) catalogModality = catalog.modality;
      }

      const accessionNumber = this.generateAccessionNumber();

      const study = await db.RadiologyStudy.create(
        {
          study_id: uuidv4(),
          order_id: orderId,
          appointment_id: order.appointment_id || null,
          patient_id: order.patient_id,
          procedure_catalog_id: procedure_catalog_id || null,
          accession_number: accessionNumber,
          modality: catalogModality,
          workflow_status: scheduled_at ? "SCHEDULED" : "ORDERED",
          scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
          notes: notes || null,
        },
        { transaction: t }
      );

      await order.update(
        { radiology_status: scheduled_at ? "SCHEDULED" : "WAITING_FOR_SCHEDULE" },
        { transaction: t }
      );

      // Create queue item (SCHEDULING or WAITING)
      await radiologyQueueService.createQueueItem(
        {
          order_id: orderId,
          study_id: study.study_id,
          queue_type: scheduled_at ? "WAITING" : "SCHEDULING",
          priority: order.priority,
          department_id: order.assigned_department_id,
        },
        staffId,
        t
      );

      await this.logAudit("RADIOLOGY_ORDER_CREATED", study.study_id, staffId, { order_id: orderId, accession_number: accessionNumber }, t);

      await this.emitTimelineEvent(
        {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          event_type: "RADIOLOGY_ORDERED",
          title: `Radiology Study Ordered: ${order.title}`,
          description: `Accession Number: ${accessionNumber} | Modality: ${catalogModality}`,
          actor_id: staffId,
          resource_type: "RadiologyStudy",
          resource_id: study.study_id,
        },
        t
      );

      await t.commit();
      return study.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Schedule a radiology study.
   */
  async scheduleStudy(studyId, scheduledAt, staffId) {
    if (!scheduledAt) {
      const err = new Error("scheduledAt date is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      await study.update(
        {
          workflow_status: "SCHEDULED",
          scheduled_at: new Date(scheduledAt),
        },
        { transaction: t }
      );

      const order = await db.ClinicalOrder.findByPk(study.order_id, { transaction: t });
      if (order) {
        await order.update({ radiology_status: "SCHEDULED" }, { transaction: t });
      }

      // Move work queue to WAITING stage
      await radiologyQueueService.transitionQueueStage(study.order_id, study.study_id, "WAITING", staffId, t);

      await this.logAudit("RADIOLOGY_STUDY_SCHEDULED", studyId, staffId, { scheduled_at: scheduledAt }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_SCHEDULED",
          title: `Radiology Study Scheduled`,
          description: `Accession: ${study.accession_number} scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          actor_id: staffId,
          resource_type: "RadiologyStudy",
          resource_id: studyId,
        },
        t
      );

      await t.commit();
      return study.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Start radiology image acquisition procedure.
   */
  async startStudy(studyId, radiographerId) {
    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      await study.update(
        {
          workflow_status: "IN_PROGRESS",
          assigned_radiographer_id: radiographerId,
          performed_at: new Date(),
        },
        { transaction: t }
      );

      const order = await db.ClinicalOrder.findByPk(study.order_id, { transaction: t });
      if (order) {
        await order.update({ radiology_status: "IN_PROGRESS" }, { transaction: t });
      }

      // Move work queue to IMAGING stage
      await radiologyQueueService.transitionQueueStage(study.order_id, study.study_id, "IMAGING", radiographerId, t);

      await this.logAudit("RADIOLOGY_STARTED", studyId, radiographerId, { accession_number: study.accession_number }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_STARTED",
          title: `Radiology Imaging Procedure Started`,
          description: `Accession: ${study.accession_number} | Modality: ${study.modality}`,
          actor_id: radiographerId,
          resource_type: "RadiologyStudy",
          resource_id: studyId,
        },
        t
      );

      await t.commit();
      return study.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Complete image acquisition for a study.
   */
  async completeAcquisition(studyId, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      await study.update(
        { workflow_status: "IMAGE_ACQUIRED" },
        { transaction: t }
      );

      const order = await db.ClinicalOrder.findByPk(study.order_id, { transaction: t });
      if (order) {
        await order.update({ radiology_status: "IMAGE_ACQUIRED" }, { transaction: t });
      }

      // Move work queue to REPORTING stage
      await radiologyQueueService.transitionQueueStage(study.order_id, study.study_id, "REPORTING", staffId, t);

      await this.logAudit("RADIOLOGY_COMPLETED", studyId, staffId, { accession_number: study.accession_number }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_COMPLETED",
          title: `Radiology Image Acquisition Completed`,
          description: `Images acquired for ${study.accession_number}. Awaiting radiologist report.`,
          actor_id: staffId,
          resource_type: "RadiologyStudy",
          resource_id: studyId,
        },
        t
      );

      await t.commit();
      return study.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Submit radiologist diagnostic report (Findings & Impression).
   */
  async submitReport(studyId, payload, radiologistId) {
    const { findings, impression, recommendations } = payload || {};

    if (!findings?.trim() || !impression?.trim()) {
      const err = new Error("Findings and Impression are required for radiology diagnostic reports");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      // Ensure clinical order result exists
      let orderResult = await db.ClinicalOrderResult.findOne({
        where: { order_id: study.order_id },
        transaction: t,
      });

      if (!orderResult) {
        orderResult = await db.ClinicalOrderResult.create(
          {
            result_id: uuidv4(),
            order_id: study.order_id,
            recorded_by: radiologistId,
            verification_status: "PRELIMINARY",
            result_summary: `Impression: ${impression.trim()}`,
            result_data: { findings: findings.trim(), impression: impression.trim(), recommendations: recommendations?.trim() || null },
          },
          { transaction: t }
        );
      } else {
        await orderResult.update(
          {
            result_summary: `Impression: ${impression.trim()}`,
            result_data: { findings: findings.trim(), impression: impression.trim(), recommendations: recommendations?.trim() || null },
          },
          { transaction: t }
        );
      }

      const report = await db.RadiologyReport.create(
        {
          report_id: uuidv4(),
          study_id: studyId,
          order_id: study.order_id,
          result_id: orderResult.result_id,
          findings: findings.trim(),
          impression: impression.trim(),
          recommendations: recommendations ? recommendations.trim() : null,
          verification_status: "PRELIMINARY",
          reported_by: radiologistId,
        },
        { transaction: t }
      );

      await study.update(
        {
          workflow_status: "REPORT_PENDING",
          assigned_radiologist_id: radiologistId,
        },
        { transaction: t }
      );

      const order = await db.ClinicalOrder.findByPk(study.order_id, { transaction: t });
      if (order) {
        await order.update({ radiology_status: "REPORT_PENDING" }, { transaction: t });
      }

      // Move queue to VERIFICATION stage
      await radiologyQueueService.transitionQueueStage(study.order_id, studyId, "VERIFICATION", radiologistId, t);

      await this.logAudit("RADIOLOGY_REPORT_CREATED", report.report_id, radiologistId, { study_id: studyId, accession_number: study.accession_number }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_REPORT_AVAILABLE",
          title: `Radiology Report Available (Preliminary)`,
          description: `Impression: ${impression.trim().slice(0, 150)}`,
          actor_id: radiologistId,
          resource_type: "RadiologyReport",
          resource_id: report.report_id,
        },
        t
      );

      await t.commit();
      return report.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Verify and sign off a radiology diagnostic report.
   */
  async verifyReport(reportId, supervisorId) {
    const t = await db.sequelize.transaction();
    try {
      const report = await db.RadiologyReport.findByPk(reportId, { transaction: t });
      if (!report) {
        const err = new Error("Radiology report not found");
        err.status = 404;
        throw err;
      }

      if (report.verification_status === "FINAL") {
        const err = new Error("Radiology report is already verified and finalized");
        err.status = 400;
        throw err;
      }

      await report.update(
        {
          verification_status: "FINAL",
          verified_by: supervisorId,
          signed_at: new Date(),
        },
        { transaction: t }
      );

      const study = await db.RadiologyStudy.findByPk(report.study_id, { transaction: t });
      if (study) {
        await study.update({ workflow_status: "COMPLETED" }, { transaction: t });
      }

      const order = await db.ClinicalOrder.findByPk(report.order_id, { transaction: t });
      if (order) {
        await order.update(
          {
            status: "COMPLETED",
            radiology_status: "COMPLETED",
          },
          { transaction: t }
        );
      }

      if (report.result_id) {
        const orderResult = await db.ClinicalOrderResult.findByPk(report.result_id, { transaction: t });
        if (orderResult) {
          await orderResult.update(
            {
              verification_status: "FINAL",
              verified_by: supervisorId,
              verified_at: new Date(),
            },
            { transaction: t }
          );
        }
      }

      // Close work queue items
      await radiologyQueueService.transitionQueueStage(report.order_id, report.study_id, null, supervisorId, t);

      await this.logAudit("RADIOLOGY_REPORT_VERIFIED", reportId, supervisorId, { study_id: report.study_id }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_REPORT_VERIFIED",
            title: `Radiology Report Verified & Finalized`,
            description: `Final Report signed off by supervisor`,
            actor_id: supervisorId,
            resource_type: "RadiologyReport",
            resource_id: reportId,
          },
          t
        );
      }

      await t.commit();
      return report.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Amend a verified radiology report with audit history.
   */
  async amendReport(reportId, payload, staffId) {
    const { findings, impression, recommendations, change_reason } = payload || {};

    if (!change_reason?.trim()) {
      const err = new Error("Amendment justification reason is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const report = await db.RadiologyReport.findByPk(reportId, { transaction: t });
      if (!report) {
        const err = new Error("Radiology report not found");
        err.status = 404;
        throw err;
      }

      // Preserve amendment history
      await db.RadiologyReportHistory.create(
        {
          id: uuidv4(),
          report_id: reportId,
          previous_findings: report.findings,
          previous_impression: report.impression,
          previous_recommendations: report.recommendations || null,
          previous_status: report.verification_status,
          changed_by: staffId,
          change_reason: change_reason.trim(),
        },
        { transaction: t }
      );

      const newFindings = findings?.trim() ? findings.trim() : report.findings;
      const newImpression = impression?.trim() ? impression.trim() : report.impression;
      const newRecommendations = recommendations !== undefined ? (recommendations ? recommendations.trim() : null) : report.recommendations;

      await report.update(
        {
          findings: newFindings,
          impression: newImpression,
          recommendations: newRecommendations,
          verification_status: "AMENDED",
        },
        { transaction: t }
      );

      if (report.result_id) {
        const orderResult = await db.ClinicalOrderResult.findByPk(report.result_id, { transaction: t });
        if (orderResult) {
          await orderResult.update(
            {
              result_summary: `[AMENDED] Impression: ${newImpression}`,
              result_data: { findings: newFindings, impression: newImpression, recommendations: newRecommendations },
              verification_status: "AMENDED",
            },
            { transaction: t }
          );
        }
      }

      await this.logAudit("RADIOLOGY_REPORT_AMENDED", reportId, staffId, { change_reason: change_reason.trim() }, t);

      await t.commit();
      return report.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get radiology study details with report and procedure catalog.
   */
  async getStudyWithReport(studyId) {
    const study = await db.RadiologyStudy.findByPk(studyId, {
      include: [
        { model: db.RadiologyProcedureCatalog, as: "procedureCatalog" },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "assignedRadiographer", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "assignedRadiologist", attributes: ["user_id", "full_name"] },
        {
          model: db.RadiologyReport,
          as: "report",
          include: [
            { model: db.User, as: "reportedByUser", attributes: ["user_id", "full_name"] },
            { model: db.User, as: "verifiedByUser", attributes: ["user_id", "full_name"] },
            {
              model: db.RadiologyReportHistory,
              as: "amendments",
              include: [{ model: db.User, as: "changedByUser", attributes: ["user_id", "full_name"] }],
            },
          ],
        },
      ],
    });

    if (!study) {
      const err = new Error("Radiology study not found");
      err.status = 404;
      throw err;
    }

    return study.get({ plain: true });
  }

  /**
   * Get all radiology studies for a patient or clinical order.
   */
  async listStudies({ order_id, patient_id, workflow_status } = {}) {
    const where = {};
    if (order_id) where.order_id = order_id;
    if (patient_id) where.patient_id = patient_id;
    if (workflow_status) where.workflow_status = workflow_status;

    const studies = await db.RadiologyStudy.findAll({
      where,
      include: [
        { model: db.RadiologyProcedureCatalog, as: "procedureCatalog" },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
        {
          model: db.RadiologyReport,
          as: "report",
          include: [
            { model: db.User, as: "reportedByUser", attributes: ["user_id", "full_name"] },
            { model: db.User, as: "verifiedByUser", attributes: ["user_id", "full_name"] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return studies.map((s) => s.get({ plain: true }));
  }

  /**
   * Release radiology diagnostic report to patient portal.
   */
  async releaseReportToPatient(reportId, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const report = await db.RadiologyReport.findByPk(reportId, { transaction: t });
      if (!report) {
        const err = new Error("Radiology report not found");
        err.status = 404;
        throw err;
      }

      await report.update({ patient_release_status: "RELEASED" }, { transaction: t });

      const study = await db.RadiologyStudy.findByPk(report.study_id, { transaction: t });

      await this.logAudit("RADIOLOGY_RESULT_RELEASED", reportId, staffId, { study_id: report.study_id }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_RESULT_RELEASED",
            title: `Radiology Report Released to Patient Portal`,
            description: `Report released by clinician for patient access`,
            actor_id: staffId,
            resource_type: "RadiologyReport",
            resource_id: reportId,
          },
          t
        );
      }

      await t.commit();
      return report.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Withhold radiology diagnostic report from patient portal access.
   */
  async withholdReportFromPatient(reportId, reason, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const report = await db.RadiologyReport.findByPk(reportId, { transaction: t });
      if (!report) {
        const err = new Error("Radiology report not found");
        err.status = 404;
        throw err;
      }

      await report.update({ patient_release_status: "WITHHELD" }, { transaction: t });

      await this.logAudit("RADIOLOGY_RESULT_WITHHELD", reportId, staffId, { reason: reason ? reason.trim() : null }, t);

      await t.commit();
      return report.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new RadiologyService();
