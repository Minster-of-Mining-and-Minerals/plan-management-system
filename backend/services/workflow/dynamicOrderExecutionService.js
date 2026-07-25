"use strict";

const db = require("../../models");
const auditService = require("../auditService");
const timelineEventService = require("../timelineEventService");

class DynamicOrderExecutionService {
  /**
   * Execute department dynamic order step (e.g. Specimen Collection, Result Entry, Verification, Dispensing).
   */
  async executeOrderStep({ order_id, step_status, result_data = {}, result_notes = null }, actorUserId = null) {
    const order = await db.ClinicalOrder.findByPk(order_id);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    const updates = {
      status: step_status,
      notes: result_notes || order.notes,
    };

    await order.update(updates);

    if (actorUserId) {
      await auditService.logAudit({
        actorUserId,
        action: `workflow:order_execute_${step_status.toLowerCase()}`,
        resourceType: "CLINICAL_ORDER",
        resourceId: order_id,
        details: { step_status, order_type: order.order_type },
      });
    }

    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: `DYNAMIC_ORDER_${step_status}`,
          title: `Dynamic Order ${step_status}: ${order.title}`,
          notes: result_notes || `Order ${order.order_id} updated to ${step_status}`,
          domain: order.order_type,
          patient_id: order.patient_id,
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    return {
      order_id,
      order_type: order.order_type,
      status: step_status,
      result_data,
      updated_at: new Date().toISOString(),
    };
  }
}

module.exports = new DynamicOrderExecutionService();
