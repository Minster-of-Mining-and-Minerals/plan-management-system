"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class PharmacyReconciliationService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "MedicationReconciliation",
        resourceId,
        details,
      });
    }
  }

  /**
   * Perform admission or discharge medication reconciliation.
   */
  async performReconciliation({ patient_id, reconciliation_type = "ADMISSION", home_medications = [], reconciled_medications = [] }, clinicianId) {
    if (!patient_id || !clinicianId) {
      const err = new Error("patient_id and clinicianId are required for reconciliation");
      err.status = 400;
      throw err;
    }

    // Detect potential conflicts between home medications and reconciled medications
    const conflicts = [];
    const homeNames = home_medications.map((m) => (m.name || m.generic_name || "").toLowerCase());
    const activeNames = reconciled_medications.map((m) => (m.name || m.generic_name || "").toLowerCase());

    for (const hName of homeNames) {
      if (hName && activeNames.includes(hName)) {
        conflicts.push({
          type: "DUPLICATE_MEDICATION",
          medication_name: hName,
          severity: "WARNING",
          message: `Home medication '${hName}' is also actively prescribed in hospital reconciliation plan.`,
        });
      }
    }

    const t = await db.sequelize.transaction();
    try {
      const rec = await db.MedicationReconciliation.create(
        {
          id: uuidv4(),
          patient_id,
          reconciliation_type: reconciliation_type.toUpperCase(),
          home_medications_json: home_medications,
          reconciled_medications_json: reconciled_medications,
          conflict_summary_json: conflicts,
          reconciled_by: clinicianId,
        },
        { transaction: t }
      );

      await this.logAudit("MEDICATION_RECONCILIATION_PERFORMED", rec.id, clinicianId, { conflicts_found: conflicts.length }, t);

      if (timelineEventService && typeof timelineEventService.emit === "function") {
        try {
          await timelineEventService.emit(
            {
              patient_id,
              event_type: `MEDICATION_RECONCILIATION_${reconciliation_type.toUpperCase()}`,
              title: `Medication Reconciliation (${reconciliation_type.toUpperCase()})`,
              description: `Medication reconciliation completed with ${conflicts.length} conflict warnings detected`,
              actor_id: clinicianId,
              resource_type: "MedicationReconciliation",
              resource_id: rec.id,
            },
            t
          );
        } catch (tErr) {
          console.error("Failed to emit reconciliation timeline event:", tErr.message);
        }
      }

      await t.commit();
      return rec.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get reconciliation history for a patient.
   */
  async getPatientReconciliations(patientId) {
    const records = await db.MedicationReconciliation.findAll({
      where: { patient_id: patientId },
      include: [{ model: db.User, as: "reconciler", attributes: ["user_id", "full_name"] }],
      order: [["created_at", "DESC"]],
    });

    return records.map((r) => r.get({ plain: true }));
  }
}

module.exports = new PharmacyReconciliationService();
