"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class PharmacyControlledMedicationService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "ControlledMedicationLog",
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
        console.error("Failed to emit controlled drug timeline event:", err.message);
      }
    }
  }

  /**
   * Log secondary verification and digital signature for controlled drug dispensing.
   */
  async logControlledDispensing({ batchId, patientId, prescriptionId, quantity, dispenserId, verifierId, digitalSignature }) {
    if (!batchId || !patientId || !prescriptionId || !dispenserId || !verifierId) {
      const err = new Error("batchId, patientId, prescriptionId, dispenserId, and verifierId are required for controlled drug verification");
      err.status = 400;
      throw err;
    }

    if (dispenserId === verifierId) {
      const err = new Error("Controlled drug dispensing requires dual verification by a separate authorized clinical staff member");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const log = await db.ControlledMedicationLog.create(
        {
          id: uuidv4(),
          medication_batch_id: batchId,
          patient_id: patientId,
          prescription_id: prescriptionId,
          quantity: parseInt(quantity, 10) || 1,
          dispensed_by: dispenserId,
          verified_by: verifierId,
          digital_signature: digitalSignature || `SIG-${uuidv4().slice(0, 12)}`,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_CONTROLLED_DRUG_DISPENSED", log.id, dispenserId, { verifier_id: verifierId, quantity }, t);

      await this.emitTimelineEvent(
        {
          patient_id: patientId,
          event_type: "PHARMACY_CONTROLLED_DISPENSED",
          title: `Controlled Substance Dispensed & Dual-Verified`,
          description: `Controlled medication batch #${batchId.slice(0, 8)} verified by staff #${verifierId.slice(0, 8)}`,
          actor_id: dispenserId,
          resource_type: "ControlledMedicationLog",
          resource_id: log.id,
        },
        t
      );

      await t.commit();
      return log.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * List controlled medication logs.
   */
  async getControlledLogs(patientId = null) {
    const where = {};
    if (patientId) where.patient_id = patientId;

    const logs = await db.ControlledMedicationLog.findAll({
      where,
      include: [
        { model: db.MedicationBatch, as: "batch", include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }] },
        { model: db.User, as: "dispenser", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "verifier", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return logs.map((l) => l.get({ plain: true }));
  }
}

module.exports = new PharmacyControlledMedicationService();
