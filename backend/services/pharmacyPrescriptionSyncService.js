"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");
const notificationService = require("./notificationService");

class PharmacyPrescriptionSyncService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "PrescriptionSync",
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
        console.error("Failed to emit pharmacy sync timeline event:", err.message);
      }
    }
  }

  /**
   * Detect doctor edits to an issued prescription after forwarding to pharmacy.
   */
  async detectPrescriptionChanges(prescriptionId, staffId) {
    const forward = await db.PrescriptionPharmacyForward.findOne({
      where: { prescription_id: prescriptionId },
      include: [
        { model: db.Prescription, as: "prescription", include: [{ model: db.PrescriptionItem, as: "items" }] },
        { model: db.PharmacyPrescription, as: "pharmacyPrescription" },
        { model: db.Pharmacy, as: "pharmacy" },
      ],
    });

    if (!forward) {
      return { changed: false, message: "Prescription has not been forwarded to a pharmacy yet." };
    }

    const rx = forward.prescription;
    const pharmacyRx = forward.pharmacyPrescription;

    const t = await db.sequelize.transaction();
    try {
      await this.logAudit(
        "PHARMACY_PRESCRIPTION_UPDATED",
        prescriptionId,
        staffId,
        {
          pharmacy_id: forward.pharmacy_id,
          pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
        },
        t
      );

      await this.emitTimelineEvent(
        {
          patient_id: rx.patient_id,
          appointment_id: rx.appointment_id,
          event_type: "PHARMACY_PRESCRIPTION_UPDATED",
          title: `Forwarded Prescription Updated by Clinician`,
          description: `Clinician updated prescription #${prescriptionId.slice(0, 8)}. Review required by pharmacy.`,
          actor_id: staffId,
          resource_type: "Prescription",
          resource_id: prescriptionId,
        },
        t
      );

      // Notify pharmacy staff
      if (notificationService && typeof notificationService.notifyPharmacyUsers === "function") {
        try {
          await notificationService.notifyPharmacyUsers(forward.pharmacy_id, {
            title: `🚨 Forwarded Prescription Updated`,
            message: `Doctor updated prescription for patient. Review and re-verify dispensing line items.`,
            relatedId: pharmacyRx.pharmacy_prescription_id,
          });
        } catch (nErr) {
          console.error("Failed to notify pharmacy of prescription update:", nErr.message);
        }
      }

      await t.commit();
      return {
        changed: true,
        prescription_id: prescriptionId,
        pharmacy_id: forward.pharmacy_id,
        pharmacy_name: forward.pharmacy?.pharmacy_name,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get complete version history between EMR Prescription and Pharmacy Portal snapshots.
   */
  async getPrescriptionVersionHistory(prescriptionId) {
    const rx = await db.Prescription.findByPk(prescriptionId, {
      include: [
        { model: db.PrescriptionItem, as: "items" },
        { model: db.User, as: "prescriber", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
      ],
    });

    if (!rx) {
      const err = new Error("Prescription not found");
      err.status = 404;
      throw err;
    }

    const forwards = await db.PrescriptionPharmacyForward.findAll({
      where: { prescription_id: prescriptionId },
      include: [
        {
          model: db.PharmacyPrescription,
          as: "pharmacyPrescription",
          include: [{ model: db.PharmacyPrescriptionVersion, as: "versions" }],
        },
        { model: db.Pharmacy, as: "pharmacy" },
      ],
    });

    return {
      prescription: rx.get({ plain: true }),
      forwards: forwards.map((f) => f.get({ plain: true })),
    };
  }
}

module.exports = new PharmacyPrescriptionSyncService();
