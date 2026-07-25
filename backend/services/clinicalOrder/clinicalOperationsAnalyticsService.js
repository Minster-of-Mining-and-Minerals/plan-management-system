"use strict";

const db = require("../../models");
const unifiedClinicalSLAEngine = require("./unifiedClinicalSLAEngine");

class ClinicalOperationsAnalyticsService {
  /**
   * Compute comprehensive clinical operations analytics across all domains.
   */
  async getClinicalOperationsAnalytics() {
    const orders = await db.ClinicalOrder.findAll();

    const ordersByDomain = {};
    const pendingWorkloadByDomain = {};
    const cancellationStatsByDomain = {};
    let totalBreaches = 0;
    let completedCount = 0;
    let totalCompletionDurationMins = 0;

    for (const order of orders) {
      const domain = (order.order_type || "LABORATORY").toUpperCase();
      const status = (order.status || order.order_status || "ordered").toUpperCase();

      // 1. Orders by domain
      ordersByDomain[domain] = (ordersByDomain[domain] || 0) + 1;

      // 2. Cancellation stats
      if (status === "CANCELLED") {
        cancellationStatsByDomain[domain] = (cancellationStatsByDomain[domain] || 0) + 1;
      } else if (status !== "COMPLETED" && status !== "VERIFIED") {
        // 3. Pending workload
        pendingWorkloadByDomain[domain] = (pendingWorkloadByDomain[domain] || 0) + 1;
      }

      // 4. SLA breaches
      const sla = unifiedClinicalSLAEngine.evaluateSLA(order.created_at, order.priority, domain);
      if (sla.status === "SLA_BREACHED") {
        totalBreaches++;
      }

      // 5. Completion time calculation
      if (status === "COMPLETED" || status === "VERIFIED") {
        completedCount++;
        const createdAt = new Date(order.created_at);
        const updatedAt = new Date(order.updated_at);
        const durationMins = Math.max(0, Math.round((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60)));
        totalCompletionDurationMins += durationMins;
      }
    }

    const averageCompletionTimeMins = completedCount > 0 ? Math.round(totalCompletionDurationMins / completedCount) : 0;

    return {
      total_orders: orders.length,
      orders_by_domain: ordersByDomain,
      pending_workload_by_domain: pendingWorkloadByDomain,
      cancellation_stats_by_domain: cancellationStatsByDomain,
      total_sla_breaches: totalBreaches,
      average_completion_time_minutes: averageCompletionTimeMins,
      completed_orders_count: completedCount,
    };
  }
}

module.exports = new ClinicalOperationsAnalyticsService();
