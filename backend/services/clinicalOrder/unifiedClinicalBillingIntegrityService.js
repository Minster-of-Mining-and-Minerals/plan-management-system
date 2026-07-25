"use strict";

const db = require("../../models");
const auditService = require("../auditService");

class UnifiedClinicalBillingIntegrityService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "ClinicalBillingIntegrity",
        resourceId,
        details,
      });
    }
  }

  /**
   * Verify and process clinical order billing completion or cancellation.
   */
  async processBillingIntegrity(clinicalOrderId, eventType, actorId) {
    if (!clinicalOrderId || !eventType) {
      const err = new Error("clinicalOrderId and eventType are required");
      err.status = 400;
      throw err;
    }

    const order = await db.ClinicalOrder.findByPk(clinicalOrderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    if (eventType === "ORDER_COMPLETED") {
      await this.logAudit("UNIFIED_BILLING_CHARGE_VERIFIED", clinicalOrderId, actorId, { order_type: order.order_type });
      return { status: "CHARGE_VERIFIED", order_id: clinicalOrderId };
    } else if (eventType === "ORDER_CANCELLED") {
      await this.logAudit("UNIFIED_BILLING_CHARGE_CANCELLED", clinicalOrderId, actorId, { order_type: order.order_type });
      return { status: "CHARGE_VOIDED", order_id: clinicalOrderId };
    }

    return { status: "NO_ACTION", order_id: clinicalOrderId };
  }
}

module.exports = new UnifiedClinicalBillingIntegrityService();
