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
   * Helper to calculate standard enterprise queue metrics for a set of orders.
   */
  _computeQueueMetrics(orders) {
    const now = new Date();
    const activeOrders = orders.filter((o) => {
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      return st !== "COMPLETED" && st !== "VERIFIED" && st !== "CANCELLED";
    });

    const completedOrders = orders.filter((o) => {
      const st = (o.status || o.order_status || "").toUpperCase();
      return st === "COMPLETED" || st === "VERIFIED";
    });

    // 1. Current size
    const currentSize = activeOrders.length;

    // 2. Average waiting time
    let totalWaitMins = 0;
    activeOrders.forEach((o) => {
      const createdAt = new Date(o.created_at || Date.now());
      totalWaitMins += Math.max(0, Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60)));
    });
    const averageWaitingTimeMins = currentSize > 0 ? Math.round(totalWaitMins / currentSize) : 0;

    // 3. Oldest order
    let oldestOrder = null;
    if (activeOrders.length > 0) {
      const sorted = [...activeOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const o = sorted[0];
      const plain = typeof o.get === "function" ? o.get({ plain: true }) : o;
      oldestOrder = {
        clinical_order_id: plain.clinical_order_id || plain.id,
        order_type: plain.order_type,
        priority: plain.priority,
        created_at: plain.created_at,
        elapsed_minutes: Math.round((now.getTime() - new Date(plain.created_at).getTime()) / (1000 * 60)),
      };
    }

    // 4. Average completion time
    let totalCompletionMins = 0;
    completedOrders.forEach((o) => {
      const createdAt = new Date(o.created_at);
      const updatedAt = new Date(o.updated_at || o.created_at);
      totalCompletionMins += Math.max(0, Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)));
    });
    const averageCompletionMins = completedOrders.length > 0 ? Math.round(totalCompletionMins / completedOrders.length) : 30;

    // 5. Current processors
    const processors = new Set();
    activeOrders.forEach((o) => {
      const p = o.assigned_to || o.assigned_staff_id || o.doctor_id;
      if (p) processors.add(p);
    });

    // 6. Estimated completion time
    const activeProcessorsCount = Math.max(processors.size, 1);
    const estimatedCompletionMins = Math.round((currentSize * (averageCompletionMins || 20)) / activeProcessorsCount);

    return {
      current_size: currentSize,
      average_waiting_time_minutes: averageWaitingTimeMins,
      oldest_order: oldestOrder,
      average_completion_minutes: averageCompletionMins,
      current_processors_count: processors.size,
      estimated_completion_minutes: estimatedCompletionMins,
    };
  }

  /**
   * Get metrics for Hospital Queue (all active orders).
   */
  async getHospitalQueueSummary() {
    const orders = await db.ClinicalOrder.findAll();
    return this._computeQueueMetrics(orders);
  }

  /**
   * Get metrics for Department Queue (e.g. LABORATORY, RADIOLOGY, PHARMACY).
   */
  async getDepartmentQueue(departmentId) {
    const orders = await db.ClinicalOrder.findAll({
      where: { order_type: departmentId },
    });
    return this._computeQueueMetrics(orders);
  }

  /**
   * Get metrics for Provider Queue.
   */
  async getProviderQueue(providerId) {
    const orders = await db.ClinicalOrder.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { assigned_staff_id: providerId },
          { ordered_by: providerId },
        ],
      },
    });
    return this._computeQueueMetrics(orders);
  }

  /**
   * Get metrics for Priority / STAT Queue.
   */
  async getPriorityQueue(priority = "STAT") {
    const orders = await db.ClinicalOrder.findAll({
      where: { priority },
    });
    return this._computeQueueMetrics(orders);
  }

  /**
   * Get metrics for Overdue Queue (SLA breached).
   */
  async getOverdueQueue() {
    const orders = await db.ClinicalOrder.findAll();
    const now = new Date();
    const overdueOrders = orders.filter((o) => {
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      if (st === "COMPLETED" || st === "VERIFIED" || st === "CANCELLED") return false;
      const elapsedMins = Math.round((now.getTime() - new Date(o.created_at).getTime()) / (1000 * 60));
      return elapsedMins > 120 || (o.priority === "STAT" && elapsedMins > 30);
    });
    return this._computeQueueMetrics(overdueOrders);
  }

  /**
   * Get comprehensive enterprise queues overview.
   */
  async getEnterpriseQueuesOverview() {
    const [hospital, lab, rad, pharmacy, statQueue, overdueQueue] = await Promise.all([
      this.getHospitalQueueSummary(),
      this.getDepartmentQueue("LABORATORY"),
      this.getDepartmentQueue("RADIOLOGY"),
      this.getDepartmentQueue("PHARMACY"),
      this.getPriorityQueue("STAT"),
      this.getOverdueQueue(),
    ]);

    return {
      hospital_queue: hospital,
      department_queues: {
        LABORATORY: lab,
        RADIOLOGY: rad,
        PHARMACY: pharmacy,
      },
      stat_queue: statQueue,
      overdue_queue: overdueQueue,
    };
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
