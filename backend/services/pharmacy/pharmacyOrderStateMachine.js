"use strict";

const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

const PHARMACY_ORDER_STATES = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  SAFETY_CHECK_PENDING: "SAFETY_CHECK_PENDING",
  SAFETY_APPROVED: "SAFETY_APPROVED",
  SENT_TO_PHARMACY: "SENT_TO_PHARMACY",
  PHARMACY_REVIEW: "PHARMACY_REVIEW",
  STOCK_RESERVED: "STOCK_RESERVED",
  DISPENSING: "DISPENSING",
  DISPENSED: "DISPENSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
};

const VALID_TRANSITIONS = {
  [PHARMACY_ORDER_STATES.DRAFT]: [PHARMACY_ORDER_STATES.SUBMITTED, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.SUBMITTED]: [PHARMACY_ORDER_STATES.SAFETY_CHECK_PENDING, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.SAFETY_CHECK_PENDING]: [PHARMACY_ORDER_STATES.SAFETY_APPROVED, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.SAFETY_APPROVED]: [PHARMACY_ORDER_STATES.SENT_TO_PHARMACY, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.SENT_TO_PHARMACY]: [PHARMACY_ORDER_STATES.PHARMACY_REVIEW, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.PHARMACY_REVIEW]: [PHARMACY_ORDER_STATES.STOCK_RESERVED, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.STOCK_RESERVED]: [PHARMACY_ORDER_STATES.DISPENSING, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.DISPENSING]: [PHARMACY_ORDER_STATES.DISPENSED, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.DISPENSED]: [PHARMACY_ORDER_STATES.COMPLETED, PHARMACY_ORDER_STATES.CANCELLED],
  [PHARMACY_ORDER_STATES.COMPLETED]: [],
  [PHARMACY_ORDER_STATES.CANCELLED]: [],
};

class PharmacyOrderStateMachine {
  async transitionState(clinicalOrderId, targetState, actorId, reason = "") {
    if (!clinicalOrderId || !targetState || !actorId) {
      const err = new Error("clinicalOrderId, targetState, and actorId are required");
      err.status = 400;
      throw err;
    }

    const order = await db.ClinicalOrder.findByPk(clinicalOrderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const currentState = order.status || order.order_status || PHARMACY_ORDER_STATES.SUBMITTED;
    const allowed = VALID_TRANSITIONS[currentState] || [];

    if (!allowed.includes(targetState) && targetState !== currentState) {
      const err = new Error(`Invalid medication order status transition from '${currentState}' to '${targetState}'`);
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      await order.update({ status: targetState, order_status: targetState }, { transaction: t });

      await db.ClinicalOrderStatusHistory.create(
        {
          order_id: clinicalOrderId,
          previous_status: currentState,
          new_status: targetState,
          status_from: currentState,
          status_to: targetState,
          changed_by: actorId,
          reason: reason || `Transitioned to ${targetState}`,
        },
        { transaction: t }
      );

      if (auditService && typeof auditService.logAudit === "function") {
        await auditService.logAudit({
          actorUserId: actorId,
          action: "PHARMACY_ORDER_STATE_TRANSITION",
          resourceType: "ClinicalOrder",
          resourceId: clinicalOrderId,
          details: { currentState, targetState, reason },
        });
      }

      if (timelineEventService && typeof timelineEventService.emit === "function") {
        try {
          await timelineEventService.emit(
            {
              patient_id: order.patient_id,
              event_type: `PHARMACY_ORDER_${targetState}`,
              title: `Medication Order Status: ${targetState}`,
              description: `Pharmacy order #${clinicalOrderId.slice(0, 8)} updated to ${targetState}`,
              actor_id: actorId,
              resource_type: "ClinicalOrder",
              resource_id: clinicalOrderId,
            },
            t
          );
        } catch (tErr) {
          console.error("Failed to emit state transition timeline event:", tErr.message);
        }
      }

      await t.commit();
      return order.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = {
  PharmacyOrderStateMachine: new PharmacyOrderStateMachine(),
  PHARMACY_ORDER_STATES,
};
