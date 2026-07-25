"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class PharmacyRefillService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "PrescriptionRefill",
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
        console.error("Failed to emit refill timeline event:", err.message);
      }
    }
  }

  /**
   * Process prescription refill.
   */
  async processPrescriptionRefill({ prescription_id, max_refills = 3 }, dispenserId) {
    if (!prescription_id || !dispenserId) {
      const err = new Error("prescription_id and dispenserId are required for refill processing");
      err.status = 400;
      throw err;
    }

    const rx = await db.Prescription.findByPk(prescription_id);
    if (!rx) {
      const err = new Error("Prescription not found");
      err.status = 404;
      throw err;
    }

    const previousRefills = await db.PrescriptionRefill.findAll({
      where: { prescription_id, status: "DISPENSED" },
    });

    const currentRefillNumber = previousRefills.length + 1;
    if (currentRefillNumber > parseInt(max_refills, 10)) {
      const err = new Error(`Prescription refill limit reached (${previousRefills.length} of ${max_refills} refills used)`);
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const refill = await db.PrescriptionRefill.create(
        {
          id: uuidv4(),
          prescription_id,
          refill_number: currentRefillNumber,
          max_refills: parseInt(max_refills, 10),
          dispensed_at: new Date(),
          dispensed_by: dispenserId,
          status: "DISPENSED",
        },
        { transaction: t }
      );

      await this.logAudit("PRESCRIPTION_REFILLED", refill.id, dispenserId, { refill_number: currentRefillNumber, max_refills }, t);

      await this.emitTimelineEvent(
        {
          patient_id: rx.patient_id,
          event_type: "MEDICATION_REFILLED",
          title: `Prescription Refilled (${currentRefillNumber}/${max_refills})`,
          description: `Prescription #${prescription_id.slice(0, 8)} refilled by pharmacy staff`,
          actor_id: dispenserId,
          resource_type: "PrescriptionRefill",
          resource_id: refill.id,
        },
        t
      );

      await t.commit();

      return {
        refill: refill.get({ plain: true }),
        remaining_refills: parseInt(max_refills, 10) - currentRefillNumber,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get prescription refill history.
   */
  async getRefillHistory(prescriptionId) {
    const refills = await db.PrescriptionRefill.findAll({
      where: { prescription_id: prescriptionId },
      include: [{ model: db.User, as: "dispenser", attributes: ["user_id", "full_name"] }],
      order: [["refill_number", "ASC"]],
    });

    return refills.map((r) => r.get({ plain: true }));
  }
}

module.exports = new PharmacyRefillService();
