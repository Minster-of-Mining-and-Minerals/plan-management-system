"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");
const medicationAllergyChecker = require("./medicationAllergyChecker");
const drugInteractionService = require("./drugInteractionService");
const duplicateTherapyService = require("./duplicateTherapyService");
const doseSafetyService = require("./doseSafetyService");

const SEVERITY_RANK = {
  CLEAN: 0,
  INFO: 1,
  WARNING: 2,
  SEVERE: 3,
  CONTRAINDICATED: 4,
};

class MedicationSafetyService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "MedicationSafetyAlert",
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
        console.error("Failed to emit medication safety timeline event:", err.message);
      }
    }
  }

  /**
   * Evaluate complete medication safety for a patient and proposed items.
   */
  async evaluatePrescriptionSafety({ patient_id, prescription_id, items = [] }, actorId = null) {
    if (!patient_id) {
      const err = new Error("patient_id is required for medication safety evaluation");
      err.status = 400;
      throw err;
    }

    const allergyAlerts = await medicationAllergyChecker.checkAllergies(patient_id, items);
    const interactionAlerts = await drugInteractionService.checkInteractions(patient_id, items);
    const duplicateAlerts = await duplicateTherapyService.checkDuplicateTherapy(patient_id, items);
    const doseAlerts = await doseSafetyService.checkDoseSafety(patient_id, items);

    // Advanced Clinical Decision Support: Pregnancy & Renal Safety Checks
    const pregnancyAlerts = [];
    const renalAlerts = [];

    const PREGNANCY_CONTRAINDICATED_DRUGS = ["lisinopril", "warfarin", "methotrexate", "enalapril", "losartan", "ace inhibitor"];
    const RENAL_ADJUSTMENT_DRUGS = ["metformin", "gentamicin", "vancomycin", "ciprofloxacin"];

    for (const item of items) {
      const name = (item.item_name || item.generic_name || "").toLowerCase();

      // Pregnancy check
      if (item.is_pregnant || item.patient_is_pregnant) {
        if (PREGNANCY_CONTRAINDICATED_DRUGS.some((drug) => name.includes(drug))) {
          pregnancyAlerts.push({
            type: "PREGNANCY_CONTRAINDICATION",
            severity: "CONTRAINDICATED",
            message: `⛔ PREGNANCY CONTRAINDICATION: '${item.item_name || name}' is strictly contraindicated during pregnancy due to fetal toxicity risk.`,
          });
        }
      }

      // Renal dosage adjustment check
      if (item.egfr !== undefined && Number(item.egfr) < 30) {
        if (RENAL_ADJUSTMENT_DRUGS.some((drug) => name.includes(drug))) {
          renalAlerts.push({
            type: "RENAL_DOSE_ADJUSTMENT",
            severity: "SEVERE",
            message: `⚠️ RENAL DOSE ADJUSTMENT REQUIRED: Patient eGFR is ${item.egfr} mL/min. Reduced dosage or extended dosing interval required for '${item.item_name || name}'.`,
          });
        }
      }
    }

    const allAlerts = [
      ...allergyAlerts,
      ...interactionAlerts,
      ...duplicateAlerts,
      ...doseAlerts,
      ...pregnancyAlerts,
      ...renalAlerts,
    ];

    let maxRank = 0;
    let overallSeverity = "CLEAN";

    for (const a of allAlerts) {
      const rank = SEVERITY_RANK[a.severity] || 0;
      if (rank > maxRank) {
        maxRank = rank;
        overallSeverity = a.severity;
      }
    }

    // Persist alerts in database if prescription_id is provided and alerts exist
    const persistedAlerts = [];
    if (prescription_id && allAlerts.length > 0) {
      const t = await db.sequelize.transaction();
      try {
        for (const alertData of allAlerts) {
          const alert = await db.MedicationSafetyAlert.create(
            {
              alert_id: uuidv4(),
              patient_id,
              prescription_id,
              alert_type: alertData.type,
              severity: alertData.severity,
              status: "OPEN",
              message: alertData.message,
              created_by: actorId,
            },
            { transaction: t }
          );

          await this.logAudit(
            "MEDICATION_SAFETY_ALERT_CREATED",
            alert.alert_id,
            actorId,
            { alert_type: alertData.type, severity: alertData.severity, prescription_id },
            t
          );

          await this.emitTimelineEvent(
            {
              patient_id,
              event_type: "MEDICATION_SAFETY_ALERT_CREATED",
              title: `Medication Safety Alert: ${alertData.type} (${alertData.severity})`,
              description: alertData.message,
              actor_id: actorId,
              resource_type: "MedicationSafetyAlert",
              resource_id: alert.alert_id,
            },
            t
          );

          persistedAlerts.push(alert.get({ plain: true }));
        }
        await t.commit();
      } catch (err) {
        await t.rollback();
        console.error("Failed to persist medication safety alerts:", err.message);
      }
    }

    return {
      patient_id,
      prescription_id: prescription_id || null,
      overall_severity: overallSeverity,
      is_safe: maxRank < SEVERITY_RANK.WARNING,
      has_warnings: maxRank >= SEVERITY_RANK.WARNING,
      requires_override: maxRank >= SEVERITY_RANK.SEVERE,
      total_alerts: allAlerts.length,
      alerts: allAlerts,
      persisted_alerts: persistedAlerts,
    };
  }

  /**
   * Override a safety alert with a mandatory clinical justification reason.
   */
  async overrideSafetyAlert(alertId, reason, doctorId) {
    if (!alertId || !reason || reason.trim().length === 0) {
      const err = new Error("alert_id and mandatory clinical override reason are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const alert = await db.MedicationSafetyAlert.findByPk(alertId, { transaction: t });
      if (!alert) {
        const err = new Error("Medication safety alert not found");
        err.status = 404;
        throw err;
      }

      await alert.update(
        {
          status: "OVERRIDDEN",
          resolved_by: doctorId,
          resolution_reason: reason.trim(),
        },
        { transaction: t }
      );

      await this.logAudit(
        "MEDICATION_ALERT_OVERRIDDEN",
        alert.alert_id,
        doctorId,
        { reason: reason.trim(), alert_type: alert.alert_type, severity: alert.severity },
        t
      );

      await this.emitTimelineEvent(
        {
          patient_id: alert.patient_id,
          event_type: "MEDICATION_OVERRIDE_RECORDED",
          title: `Medication Safety Alert Overridden by Clinician`,
          description: `Clinician overridden ${alert.alert_type} alert. Reason: "${reason.trim()}"`,
          actor_id: doctorId,
          resource_type: "MedicationSafetyAlert",
          resource_id: alert.alert_id,
        },
        t
      );

      if (notificationService && typeof notificationService.notifyInternalUser === "function") {
        try {
          await notificationService.notifyInternalUser(doctorId, {
            title: `Medication Safety Warning Overridden`,
            message: `Override recorded for alert #${alert.alert_id.slice(0, 8)}. Clinical justification saved.`,
            category: "workflow",
            relatedType: "medication_alert",
            relatedId: alert.alert_id,
          });
        } catch (nErr) {
          console.error("Failed to notify doctor of alert override:", nErr.message);
        }
      }

      await t.commit();
      return alert.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get active safety alerts for a patient or prescription.
   */
  async getMedicationAlerts(patientId, prescriptionId = null) {
    const where = { patient_id: patientId };
    if (prescriptionId) {
      where.prescription_id = prescriptionId;
    }

    const alerts = await db.MedicationSafetyAlert.findAll({
      where,
      include: [
        { model: db.User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "resolver", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return alerts.map((a) => a.get({ plain: true }));
  }
}

module.exports = new MedicationSafetyService();
