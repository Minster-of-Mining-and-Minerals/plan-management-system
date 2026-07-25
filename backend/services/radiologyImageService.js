"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");

class RadiologyImageService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyImage",
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
        console.error("Failed to emit radiology image timeline event:", err.message);
      }
    }
  }

  /**
   * Register imaging series metadata for a radiology study.
   */
  async registerSeries(payload, staffId) {
    const { study_id, series_uid, description, modality = "XRAY", body_part, instance_count = 1 } = payload || {};

    if (!study_id || !series_uid) {
      const err = new Error("study_id and series_uid are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const series = await db.RadiologyStudySeries.create(
        {
          id: uuidv4(),
          study_id,
          series_uid: series_uid.trim(),
          description: description ? description.trim() : null,
          modality: modality.trim().toUpperCase(),
          body_part: body_part ? body_part.trim().toUpperCase() : null,
          instance_count: Number(instance_count) || 1,
        },
        { transaction: t }
      );

      await t.commit();
      return series.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Register a PACS DICOM image or web viewer reference for a study.
   */
  async registerImage(payload, staffId) {
    const {
      study_id,
      patient_id,
      study_instance_uid,
      series_instance_uid,
      sop_instance_uid,
      modality = "XRAY",
      image_count = 1,
      storage_type = "LOCAL",
      storage_location,
      viewer_url,
    } = payload || {};

    if (!study_id || !study_instance_uid || !storage_location) {
      const err = new Error("study_id, study_instance_uid, and storage_location are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(study_id, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      const resolvedPatientId = patient_id || study.patient_id;
      const generatedViewerUrl = viewer_url || `/dicom-viewer?studyUid=${encodeURIComponent(study_instance_uid)}`;

      const image = await db.RadiologyImage.create(
        {
          id: uuidv4(),
          study_id,
          patient_id: resolvedPatientId,
          study_instance_uid: study_instance_uid.trim(),
          series_instance_uid: series_instance_uid ? series_instance_uid.trim() : null,
          sop_instance_uid: sop_instance_uid ? sop_instance_uid.trim() : null,
          modality: modality ? modality.trim().toUpperCase() : study.modality,
          image_count: Number(image_count) || 1,
          storage_type: storage_type ? storage_type.trim().toUpperCase() : "LOCAL",
          storage_location: storage_location.trim(),
          viewer_url: generatedViewerUrl,
          uploaded_by: staffId || null,
        },
        { transaction: t }
      );

      await this.logAudit("RADIOLOGY_IMAGE_REGISTERED", image.id, staffId, { study_id, study_instance_uid }, t);

      await this.emitTimelineEvent(
        {
          patient_id: resolvedPatientId,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_IMAGES_AVAILABLE",
          title: `Radiology DICOM Images Available`,
          description: `PACS Study Instance UID: ${study_instance_uid} (${image_count} images)`,
          actor_id: staffId,
          resource_type: "RadiologyImage",
          resource_id: image.id,
        },
        t
      );

      await t.commit();
      return image.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Attach DICOM images to an existing study.
   */
  async attachImageToStudy(studyId, payload, staffId) {
    return await this.registerImage({ ...payload, study_id: studyId }, staffId);
  }

  /**
   * Get all registered PACS images for a study.
   */
  async getStudyImages(studyId) {
    const images = await db.RadiologyImage.findAll({
      where: { study_id: studyId },
      include: [{ model: db.User, as: "uploader", attributes: ["user_id", "full_name"] }],
      order: [["created_at", "ASC"]],
    });

    return images.map((img) => img.get({ plain: true }));
  }

  /**
   * Generate provider-independent DICOM Web Viewer URL.
   */
  async generateViewerLink(imageId, staffId) {
    const image = await db.RadiologyImage.findByPk(imageId);
    if (!image) {
      const err = new Error("Radiology image reference not found");
      err.status = 404;
      throw err;
    }

    if (staffId) {
      await this.logAudit("RADIOLOGY_IMAGE_VIEWED", imageId, staffId, { study_id: image.study_id });
      await this.emitTimelineEvent({
        patient_id: image.patient_id,
        event_type: "RADIOLOGY_IMAGE_VIEWED",
        title: `Radiology DICOM Image Viewed`,
        description: `Clinician launched DICOM web viewer for study ${image.study_instance_uid}`,
        actor_id: staffId,
        resource_type: "RadiologyImage",
        resource_id: imageId,
      });
    }

    return {
      image_id: image.id,
      study_instance_uid: image.study_instance_uid,
      viewer_url: image.viewer_url || `/dicom-viewer?studyUid=${encodeURIComponent(image.study_instance_uid)}`,
    };
  }

  /**
   * Validate user access permissions to open DICOM web viewer for study image.
   */
  async validateViewerAccess(imageId, staffId) {
    const image = await db.RadiologyImage.findByPk(imageId);
    if (!image) {
      const err = new Error("Radiology image reference not found");
      err.status = 404;
      throw err;
    }
    if (!staffId) {
      const err = new Error("Authentication required for DICOM viewer access");
      err.status = 401;
      throw err;
    }
    return image;
  }

  /**
   * Generate an authenticated DICOM Web Viewer session configuration object.
   */
  async generateViewerSession(imageId, staffId) {
    const image = await this.validateViewerAccess(imageId, staffId);
    const sessionToken = uuidv4();

    const t = await db.sequelize.transaction();
    try {
      await this.logAudit("RADIOLOGY_VIEWER_ACCESSED", imageId, staffId, { session_token: sessionToken }, t);

      await this.emitTimelineEvent(
        {
          patient_id: image.patient_id,
          event_type: "RADIOLOGY_VIEWER_SESSION_CREATED",
          title: `DICOM Viewer Session Token Created`,
          description: `Provider-independent viewer session launched for study ${image.study_instance_uid}`,
          actor_id: staffId,
          resource_type: "RadiologyImage",
          resource_id: imageId,
        },
        t
      );

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    return {
      session_id: sessionToken,
      image_id: image.id,
      study_instance_uid: image.study_instance_uid,
      series_instance_uid: image.series_instance_uid,
      viewer_type: image.viewer_type || "OHIF",
      external_viewer_url: image.external_viewer_url || image.viewer_url || `/dicom-viewer?studyUid=${encodeURIComponent(image.study_instance_uid)}`,
      viewer_configuration: image.viewer_configuration || {
        wadoRsRoot: "/dicom-web",
        qidoRsRoot: "/dicom-web",
        servers: [{ name: "NovaCure PACS", type: "dicomWeb" }],
      },
    };
  }

  /**
   * Get all DICOM viewer links and series for a study.
   */
  async getStudyViewer(studyId) {
    const images = await db.RadiologyImage.findAll({ where: { study_id: studyId } });
    const series = await db.RadiologyStudySeries.findAll({ where: { study_id: studyId } });

    return {
      study_id: studyId,
      images: images.map((i) => i.get({ plain: true })),
      series: series.map((s) => s.get({ plain: true })),
    };
  }
}

module.exports = new RadiologyImageService();
