"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");

class PharmacyClinicalResultService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "PharmacyClinicalResult",
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
        console.error("Failed to emit pharmacy result timeline event:", err.message);
      }
    }
  }

  /**
   * Create or update ClinicalOrderResult representation for a completed dispensing workflow.
   */
  async createPharmacyResult(orderId, staffId) {
    if (!orderId) {
      const err = new Error("order_id is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const order = await db.ClinicalOrder.findByPk(orderId, {
        include: [
          { model: db.Prescription, as: "prescription", include: [{ model: db.PrescriptionItem, as: "items" }] },
        ],
        transaction: t,
      });

      if (!order) {
        const err = new Error("Pharmacy clinical order not found");
        err.status = 404;
        throw err;
      }

      const forward = await db.PrescriptionPharmacyForward.findOne({
        where: { prescription_id: order.prescription_id },
        include: [
          {
            model: db.PharmacyPrescription,
            as: "pharmacyPrescription",
            include: [
              { model: db.PharmacyPrescriptionItem, as: "items" },
              { model: db.PrescriptionFulfillment, as: "fulfillments" },
              { model: db.Pharmacy, as: "pharmacy" },
            ],
          },
        ],
        transaction: t,
      });

      const pharmacyRx = forward?.pharmacyPrescription;
      const pharmacyName = pharmacyRx?.pharmacy?.pharmacy_name || "Hospital Pharmacy";
      const fulfillments = pharmacyRx?.fulfillments || [];
      const latestFulfillment = fulfillments.length > 0 ? fulfillments[fulfillments.length - 1] : null;

      const itemsDispensed = (pharmacyRx?.items || []).map((i) => ({
        item_name: i.item_name,
        dosage: i.dosage,
        frequency: i.frequency,
        quantity_requested: i.quantity,
        quantity_dispensed: i.dispensed_quantity || i.quantity,
        status: i.pharmacy_item_status,
        substitution_notes: i.substitution_notes || null,
      }));

      const summaryText = `Medication Dispensing Completed by ${pharmacyName}. Total line items: ${itemsDispensed.length}.`;

      const resultPayload = {
        result_type: "PHARMACY_DISPENSING",
        pharmacy_id: pharmacyRx?.pharmacy_id || null,
        pharmacy_name: pharmacyName,
        pharmacist_id: staffId || latestFulfillment?.fulfilled_by || order.ordered_by,
        fulfillment_reference: latestFulfillment?.fulfillment_id || forward?.forward_id || null,
        dispensed_date: latestFulfillment?.dispensed_at || new Date().toISOString(),
        medications_dispensed: itemsDispensed,
      };

      // Check if ClinicalOrderResult already exists
      let orderResult = await db.ClinicalOrderResult.findOne({
        where: { order_id: orderId },
        transaction: t,
      });

      if (orderResult) {
        await orderResult.update(
          {
            verification_status: "FINAL",
            result_summary: summaryText,
            result_data: resultPayload,
            verified_by: staffId,
            verified_at: new Date(),
          },
          { transaction: t }
        );
      } else {
        orderResult = await db.ClinicalOrderResult.create(
          {
            result_id: uuidv4(),
            order_id: orderId,
            recorded_by: staffId || order.ordered_by,
            verified_by: staffId,
            verification_status: "FINAL",
            result_summary: summaryText,
            result_data: resultPayload,
            recorded_at: new Date(),
            verified_at: new Date(),
          },
          { transaction: t }
        );
      }

      await this.logAudit("PHARMACY_RESULT_CREATED", orderResult.result_id, staffId, { order_id: orderId }, t);

      await this.emitTimelineEvent(
        {
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          event_type: "PHARMACY_RESULT_CREATED",
          title: `Pharmacy Dispensing Result Published`,
          description: summaryText,
          actor_id: staffId,
          resource_type: "ClinicalOrderResult",
          resource_id: orderResult.result_id,
        },
        t
      );

      await t.commit();
      return orderResult.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get clinical result representation for a pharmacy order.
   */
  async getPharmacyResult(orderId) {
    const orderResult = await db.ClinicalOrderResult.findOne({
      where: { order_id: orderId },
      include: [
        { model: db.User, as: "recordedByUser", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "verifiedByUser", attributes: ["user_id", "full_name"] },
      ],
    });

    if (!orderResult) {
      return null;
    }

    return orderResult.get({ plain: true });
  }
}

module.exports = new PharmacyClinicalResultService();
