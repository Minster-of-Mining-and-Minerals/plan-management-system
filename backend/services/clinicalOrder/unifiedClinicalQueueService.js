"use strict";

const db = require("../../models");

class UnifiedClinicalQueueService {
  /**
   * List open clinical work queue items across Laboratory, Radiology, and Pharmacy.
   */
  async getUnifiedWorkQueue(filters = {}) {
    const where = {};
    if (filters.order_type) {
      where.order_type = filters.order_type;
    }

    const orders = await db.ClinicalOrder.findAll({
      where,
      include: [
        { model: db.User, as: "patient", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "ASC"]],
    });

    const now = new Date();
    return orders.map((o) => {
      const plain = o.get({ plain: true });
      const createdAt = new Date(plain.created_at);
      const elapsedMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));

      return {
        ...plain,
        assigned_to: plain.assigned_to || plain.assigned_staff_id,
        sla_elapsed_minutes: elapsedMinutes,
        sla_status: elapsedMinutes > 120 ? "SLA_BREACHED" : elapsedMinutes > 60 ? "SLA_WARNING" : "SLA_OK",
      };
    });
  }

  /**
   * Claim clinical order work assignment.
   */
  async claimOrder(clinicalOrderId, staffId) {
    if (!clinicalOrderId || !staffId) {
      const err = new Error("clinicalOrderId and staffId are required to claim order");
      err.status = 400;
      throw err;
    }

    const order = await db.ClinicalOrder.findByPk(clinicalOrderId);
    if (!order) {
      const err = new Error("Clinical order not found");
      err.status = 404;
      throw err;
    }

    await order.update({ assigned_to: staffId, assigned_staff_id: staffId });
    const plain = order.get({ plain: true });
    return {
      ...plain,
      assigned_to: plain.assigned_to || plain.assigned_staff_id || staffId,
    };
  }

  /**
   * Reassign clinical order work assignment.
   */
  async reassignOrder(clinicalOrderId, newStaffId) {
    return await this.claimOrder(clinicalOrderId, newStaffId);
  }
}

module.exports = new UnifiedClinicalQueueService();
