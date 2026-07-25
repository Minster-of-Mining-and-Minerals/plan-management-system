"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");

class PharmacySubstitutionService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "MedicationSubstitutionRequest",
        resourceId,
        details,
      });
    }
  }

  /**
   * Pharmacist proposes medication substitution.
   */
  async createSubstitutionRequest({ pharmacy_prescription_item_id, original_medication_id, requested_medication_id, reason }, staffId) {
    if (!requested_medication_id || !reason) {
      const err = new Error("requested_medication_id and substitution reason are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const req = await db.MedicationSubstitutionRequest.create(
        {
          id: uuidv4(),
          pharmacy_prescription_item_id: pharmacy_prescription_item_id || null,
          original_medication_id: original_medication_id || null,
          requested_medication_id,
          reason: reason.trim(),
          status: "REQUESTED",
          requested_by: staffId,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_SUBSTITUTION_REQUESTED", req.id, staffId, { requested_medication_id, reason }, t);

      await t.commit();
      return req.get({ plain: true });
    } catch (err) {
      await t.rollback();
      console.error("Substitution request error:", err.message, err.parent ? err.parent.message : "");
      throw err;
    }
  }

  /**
   * Doctor approves substitution request.
   */
  async approveSubstitutionRequest(requestId, doctorId) {
    const t = await db.sequelize.transaction();
    try {
      const subReq = await db.MedicationSubstitutionRequest.findByPk(requestId, { transaction: t });
      if (!subReq) {
        const err = new Error("Substitution request not found");
        err.status = 404;
        throw err;
      }

      await subReq.update(
        {
          status: "APPROVED",
          approved_by: doctorId,
          approved_at: new Date(),
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_SUBSTITUTION_APPROVED", subReq.id, doctorId, {}, t);

      await t.commit();
      return subReq.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new PharmacySubstitutionService();
