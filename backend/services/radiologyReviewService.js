"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");

class RadiologyReviewService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyClinicalReview",
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
        console.error("Failed to emit radiology review timeline event:", err.message);
      }
    }
  }

  /**
   * Assign post-report clinical review task to ordering doctor.
   */
  async assignReview(studyId, doctorId, staffId = null) {
    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(studyId, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      const review = await db.RadiologyClinicalReview.create(
        {
          id: uuidv4(),
          study_id: studyId,
          doctor_id: doctorId,
          review_status: "PENDING",
        },
        { transaction: t }
      );

      const actorId = staffId || doctorId;

      await this.logAudit("RADIOLOGY_REVIEW_ASSIGNED", review.id, actorId, { study_id: studyId, doctor_id: doctorId }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_REVIEW_REQUIRED",
          title: `Radiology Clinical Review Required`,
          description: `Diagnostic report verified. Clinician review assigned to ordering physician.`,
          actor_id: actorId,
          resource_type: "RadiologyClinicalReview",
          resource_id: review.id,
        },
        t
      );

      await t.commit();
      return review.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Complete ordering physician review.
   */
  async completeReview(reviewId, payload, doctorId) {
    const { review_notes, clinical_decision } = payload || {};

    const t = await db.sequelize.transaction();
    try {
      const review = await db.RadiologyClinicalReview.findByPk(reviewId, { transaction: t });
      if (!review) {
        const err = new Error("Radiology clinical review not found");
        err.status = 404;
        throw err;
      }

      await review.update(
        {
          review_status: "REVIEWED",
          review_notes: review_notes ? review_notes.trim() : review.review_notes,
          clinical_decision: clinical_decision ? clinical_decision.trim() : review.clinical_decision,
          reviewed_at: new Date(),
        },
        { transaction: t }
      );

      const study = await db.RadiologyStudy.findByPk(review.study_id, { transaction: t });

      await this.logAudit("RADIOLOGY_REVIEW_COMPLETED", reviewId, doctorId, { study_id: review.study_id }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_REVIEW_COMPLETED",
            title: `Radiology Report Reviewed by Clinician`,
            description: clinical_decision ? `Clinical Decision: ${clinical_decision.trim()}` : `Reviewed by physician`,
            actor_id: doctorId,
            resource_type: "RadiologyClinicalReview",
            resource_id: reviewId,
          },
          t
        );
      }

      await t.commit();
      return review.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Record clinical decision based on radiology findings (e.g., Surgery, Follow-up CT, Discharge).
   */
  async recordDecision(reviewId, payload, doctorId) {
    const { clinical_decision, review_notes } = payload || {};

    if (!clinical_decision?.trim()) {
      const err = new Error("Clinical decision text is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const review = await db.RadiologyClinicalReview.findByPk(reviewId, { transaction: t });
      if (!review) {
        const err = new Error("Radiology clinical review not found");
        err.status = 404;
        throw err;
      }

      await review.update(
        {
          review_status: "ACKNOWLEDGED",
          clinical_decision: clinical_decision.trim(),
          review_notes: review_notes ? review_notes.trim() : review.review_notes,
          reviewed_at: review.reviewed_at || new Date(),
        },
        { transaction: t }
      );

      const study = await db.RadiologyStudy.findByPk(review.study_id, { transaction: t });

      await this.logAudit("RADIOLOGY_DECISION_RECORDED", reviewId, doctorId, { decision: clinical_decision.trim() }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_DECISION_RECORDED",
            title: `Clinical Decision Recorded for Radiology Study`,
            description: `Decision: ${clinical_decision.trim()}`,
            actor_id: doctorId,
            resource_type: "RadiologyClinicalReview",
            resource_id: reviewId,
          },
          t
        );
      }

      await t.commit();
      return review.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get all clinical reviews for a study.
   */
  async getStudyReviews(studyId) {
    const reviews = await db.RadiologyClinicalReview.findAll({
      where: { study_id: studyId },
      include: [{ model: db.User, as: "doctor", attributes: ["user_id", "full_name"] }],
      order: [["created_at", "ASC"]],
    });

    return reviews.map((r) => r.get({ plain: true }));
  }
}

module.exports = new RadiologyReviewService();
