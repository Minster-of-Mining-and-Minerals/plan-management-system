"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalRecordVersionService = require("./clinicalRecordVersionService");
const clinicalAuditEngine = require("./clinicalAuditEngine");
const timelineEventService = require("../timelineEventService");

class ClinicalAmendmentWorkflowService {
  /**
   * Request a clinical record amendment.
   */
  async requestAmendment({ entity_type, entity_id, patient_id, original_content = null, proposed_content, clinical_reason }, requesterId) {
    if (!entity_type || !entity_id || !patient_id || !proposed_content || !clinical_reason || !requesterId) {
      const err = new Error("entity_type, entity_id, patient_id, proposed_content, clinical_reason, and requesterId are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const amendment = await db.ClinicalAmendment.create(
        {
          id: uuidv4(),
          entity_type,
          entity_id,
          patient_id,
          requested_by: requesterId,
          status: "REQUESTED",
          original_content_json: original_content,
          proposed_content_json: proposed_content,
          clinical_reason: clinical_reason.trim(),
        },
        { transaction: t }
      );

      await clinicalAuditEngine.recordAuditEvent({
        event_type: "CLINICAL_AMENDMENT_REQUESTED",
        domain: "GENERAL",
        entity_type,
        entity_id,
        patient_id,
        actor_id: requesterId,
        action: "REQUEST_AMENDMENT",
        new_value: proposed_content,
        reason: clinical_reason,
      });

      await t.commit();
      return amendment.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Review and approve or reject a clinical record amendment.
   */
  async reviewAmendment(amendmentId, targetStatus, review_notes, reviewerId) {
    if (!amendmentId || !targetStatus || !reviewerId) {
      const err = new Error("amendmentId, targetStatus, and reviewerId are required");
      err.status = 400;
      throw err;
    }

    const validStatuses = ["APPROVED", "REJECTED", "UNDER_REVIEW"];
    if (!validStatuses.includes(targetStatus.toUpperCase())) {
      const err = new Error(`Invalid amendment status '${targetStatus}'. Must be one of: ${validStatuses.join(", ")}`);
      err.status = 400;
      throw err;
    }

    const amendment = await db.ClinicalAmendment.findByPk(amendmentId);
    if (!amendment) {
      const err = new Error("Clinical amendment request not found");
      err.status = 404;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      await amendment.update(
        {
          status: targetStatus.toUpperCase(),
          reviewed_by: reviewerId,
          review_notes: review_notes || null,
        },
        { transaction: t }
      );

      if (targetStatus.toUpperCase() === "APPROVED") {
        // Save immutable record version snapshot
        await clinicalRecordVersionService.createRecordVersion({
          entity_type: amendment.entity_type,
          entity_id: amendment.entity_id,
          snapshot_data: amendment.proposed_content_json,
          changed_by: reviewerId,
          change_reason: amendment.clinical_reason,
        });

        // Emit timeline event
        if (timelineEventService && typeof timelineEventService.emit === "function") {
          try {
            await timelineEventService.emit(
              {
                patient_id: amendment.patient_id,
                event_type: "CLINICAL_RECORD_AMENDED",
                title: `Clinical Record Amended: ${amendment.entity_type}`,
                description: `Amendment approved: ${amendment.clinical_reason}`,
                actor_id: reviewerId,
                resource_type: amendment.entity_type,
                resource_id: amendment.entity_id,
              },
              t
            );
          } catch (tErr) {
            console.error("Failed to emit amendment timeline event:", tErr.message);
          }
        }
      }

      await clinicalAuditEngine.recordAuditEvent({
        event_type: `CLINICAL_AMENDMENT_${targetStatus.toUpperCase()}`,
        domain: "GENERAL",
        entity_type: amendment.entity_type,
        entity_id: amendment.entity_id,
        patient_id: amendment.patient_id,
        actor_id: reviewerId,
        action: `REVIEW_AMENDMENT_${targetStatus.toUpperCase()}`,
        reason: amendment.clinical_reason,
      });

      await t.commit();
      return amendment.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get pending or completed amendments for a patient or entity.
   */
  async getAmendments(filters = {}) {
    const where = {};
    if (filters.patient_id) where.patient_id = filters.patient_id;
    if (filters.entity_id) where.entity_id = filters.entity_id;
    if (filters.status) where.status = filters.status.toUpperCase();

    const records = await db.ClinicalAmendment.findAll({
      where,
      include: [
        { model: db.User, as: "requester", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "reviewer", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return records.map((r) => r.get({ plain: true }));
  }
}

module.exports = new ClinicalAmendmentWorkflowService();
