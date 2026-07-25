"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class PharmacyMARService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "MedicationAdministration",
        resourceId,
        details,
      });
    }
  }

  /**
   * Record nursing medication administration in MAR.
   */
  async recordAdministration({ patient_id, prescription_id, medication_catalog_id, dose, route, scheduled_time, status = "GIVEN", reason }, nurseId) {
    if (!patient_id || !prescription_id || !dose || !nurseId) {
      const err = new Error("patient_id, prescription_id, dose, and nurseId are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const mar = await db.MedicationAdministration.create(
        {
          id: uuidv4(),
          patient_id,
          prescription_id,
          medication_catalog_id: medication_catalog_id || null,
          dose: dose.trim(),
          route: route || "Oral",
          scheduled_time: scheduled_time || new Date(),
          administered_time: status === "GIVEN" ? new Date() : null,
          status: status.toUpperCase(),
          administered_by: nurseId,
          reason: reason || null,
        },
        { transaction: t }
      );

      await this.logAudit("MEDICATION_ADMINISTRATION_RECORDED", mar.id, nurseId, { status, dose }, t);

      if (timelineEventService && typeof timelineEventService.emit === "function") {
        try {
          await timelineEventService.emit(
            {
              patient_id,
              event_type: `MEDICATION_MAR_${status.toUpperCase()}`,
              title: `Medication Administration: ${status.toUpperCase()}`,
              description: `Dose of ${dose} (${route || "Oral"}) recorded as ${status.toUpperCase()}`,
              actor_id: nurseId,
              resource_type: "MedicationAdministration",
              resource_id: mar.id,
            },
            t
          );
        } catch (tErr) {
          console.error("Failed to emit MAR timeline event:", tErr.message);
        }
      }

      await t.commit();
      return mar.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * List MAR records for a patient.
   */
  async getPatientMAR(patientId) {
    const records = await db.MedicationAdministration.findAll({
      where: { patient_id: patientId },
      include: [
        { model: db.MedicationCatalog, as: "medicationCatalog" },
        { model: db.User, as: "administrator", attributes: ["user_id", "full_name"] },
      ],
      order: [["scheduled_time", "DESC"]],
    });

    return records.map((r) => r.get({ plain: true }));
  }
}

module.exports = new PharmacyMARService();
