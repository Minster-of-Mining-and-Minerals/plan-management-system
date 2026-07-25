"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");

class ExternalRadiologyStudyService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyExternalStudy",
        resourceId,
        details,
      });
    }
  }

  async emitTimelineEvent(eventData, transaction = null) {
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(eventData, transaction);
      } catch (err) {
        console.error("Failed to emit external radiology study timeline event:", err.message);
      }
    }
  }

  /**
   * Import outside facility radiology imaging study into patient record.
   */
  async importStudy(payload, staffId) {
    const {
      patient_id,
      source_facility,
      study_date,
      modality = "XRAY",
      description,
      report_attachment,
      image_reference,
    } = payload || {};

    if (!patient_id || !source_facility?.trim() || !study_date || !description?.trim()) {
      const err = new Error("patient_id, source_facility, study_date, and description are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const externalStudy = await db.RadiologyExternalStudy.create(
        {
          id: uuidv4(),
          patient_id,
          source_facility: source_facility.trim(),
          study_date: study_date.split("T")[0],
          modality: modality.trim().toUpperCase(),
          description: description.trim(),
          report_attachment: report_attachment ? report_attachment.trim() : null,
          image_reference: image_reference ? image_reference.trim() : null,
          uploaded_by: staffId,
        },
        { transaction: t }
      );

      await this.logAudit("EXTERNAL_RADIOLOGY_STUDY_IMPORTED", externalStudy.id, staffId, { source_facility, modality }, t);

      await this.emitTimelineEvent(
        {
          patient_id,
          event_type: "EXTERNAL_RADIOLOGY_STUDY_IMPORTED",
          title: `Outside Radiology Study Imported`,
          description: `Imported ${modality.toUpperCase()} from ${source_facility.trim()} (${study_date})`,
          actor_id: staffId,
          resource_type: "RadiologyExternalStudy",
          resource_id: externalStudy.id,
        },
        t
      );

      await t.commit();
      return externalStudy.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Attach scanned outside report to external study.
   */
  async attachExternalReport(externalStudyId, reportUrl, staffId) {
    const externalStudy = await db.RadiologyExternalStudy.findByPk(externalStudyId);
    if (!externalStudy) {
      const err = new Error("External radiology study not found");
      err.status = 404;
      throw err;
    }

    await externalStudy.update({ report_attachment: reportUrl });
    await this.logAudit("EXTERNAL_RADIOLOGY_REPORT_ATTACHED", externalStudyId, staffId);
    return externalStudy.get({ plain: true });
  }

  /**
   * Link external imaging study to patient timeline.
   */
  async linkToPatientTimeline(externalStudyId, staffId) {
    const externalStudy = await db.RadiologyExternalStudy.findByPk(externalStudyId);
    if (!externalStudy) {
      const err = new Error("External radiology study not found");
      err.status = 404;
      throw err;
    }

    await this.emitTimelineEvent({
      patient_id: externalStudy.patient_id,
      event_type: "EXTERNAL_RADIOLOGY_STUDY_IMPORTED",
      title: `External Imaging Study Linked to Patient History`,
      description: `Modality: ${externalStudy.modality} from ${externalStudy.source_facility}`,
      actor_id: staffId,
      resource_type: "RadiologyExternalStudy",
      resource_id: externalStudyId,
    });

    return { success: true, message: "External study linked to timeline" };
  }

  /**
   * List all imported external radiology studies for a patient.
   */
  async listPatientExternalStudies(patientId) {
    const studies = await db.RadiologyExternalStudy.findAll({
      where: { patient_id: patientId },
      include: [{ model: db.User, as: "uploader", attributes: ["user_id", "full_name"] }],
      order: [["study_date", "DESC"]],
    });

    return studies.map((s) => s.get({ plain: true }));
  }
}

module.exports = new ExternalRadiologyStudyService();
