"use strict";

const db = require("../../models");

class ClinicalWorkloadService {
  /**
   * Calculate detailed hospital workload distribution.
   */
  async getWorkloadDistribution() {
    const orders = await db.ClinicalOrder.findAll();

    const providerWorkload = {};
    const departmentWorkload = { LABORATORY: 0, RADIOLOGY: 0, PHARMACY: 0 };
    const priorityWorkload = { ROUTINE: 0, URGENT: 0, STAT: 0 };
    let pendingCount = 0;
    let completedCount = 0;

    orders.forEach((o) => {
      const domain = (o.order_type || "LABORATORY").toUpperCase();
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      const prio = (o.priority || "ROUTINE").toUpperCase();
      const provider = o.assigned_to || o.assigned_staff_id || o.doctor_id || "UNASSIGNED";

      departmentWorkload[domain] = (departmentWorkload[domain] || 0) + 1;
      priorityWorkload[prio] = (priorityWorkload[prio] || 0) + 1;
      providerWorkload[provider] = (providerWorkload[provider] || 0) + 1;

      if (st === "COMPLETED" || st === "VERIFIED") {
        completedCount++;
      } else if (st !== "CANCELLED") {
        pendingCount++;
      }
    });

    const activeProviderCount = Object.keys(providerWorkload).filter((k) => k !== "UNASSIGNED").length || 1;
    const averageWorkloadPerProvider = Math.round(orders.length / activeProviderCount);

    return {
      total_orders: orders.length,
      pending_workload: pendingCount,
      completed_workload: completedCount,
      department_workload: departmentWorkload,
      priority_workload: priorityWorkload,
      provider_workload: providerWorkload,
      average_workload_per_provider: averageWorkloadPerProvider,
      future_prediction: {
        estimated_next_hour_orders: Math.round(pendingCount * 0.3) + 2,
        recommended_staffing_level: pendingCount > 20 ? "HIGH" : "NORMAL",
      },
    };
  }
}

module.exports = new ClinicalWorkloadService();
