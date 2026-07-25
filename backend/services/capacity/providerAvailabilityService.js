"use strict";

const db = require("../../models");
const clinicalOperationsAnalyticsService = require("../clinicalOrder/clinicalOperationsAnalyticsService");

class ProviderAvailabilityService {
  /**
   * Get real-time provider availability status, current workload, and next estimated slot.
   */
  async getProviderAvailability(providerId) {
    const workload = await clinicalOperationsAnalyticsService.getProviderWorkload(providerId);

    let status = "AVAILABLE";
    if (workload.pending_workload >= 8) status = "BUSY";
    else if (workload.stat_workload > 0) status = "EMERGENCY";
    else if (workload.pending_workload > 0) status = "CONSULTING";

    const nextAvailableMins = workload.pending_workload * 15; // 15 mins per order estimate

    return {
      provider_id: providerId,
      current_status: status,
      current_workload: workload.pending_workload,
      total_assigned_orders: workload.total_assigned_orders,
      stat_workload: workload.stat_workload,
      capacity_status: workload.capacity_status,
      next_availability_in_minutes: nextAvailableMins,
      estimated_completion_time: new Date(Date.now() + nextAvailableMins * 60 * 1000).toISOString(),
    };
  }

  /**
   * Get availability board for all providers in a department or hospital.
   */
  async getDepartmentAvailabilityBoard(departmentId = "CONSULTATION") {
    const users = await db.User.findAll({
      where: { account_type: "INTERNAL", is_active: true },
      attributes: ["user_id", "full_name", "email"],
      limit: 10,
    });

    const board = await Promise.all(
      users.map(async (u) => {
        const avail = await this.getProviderAvailability(u.user_id);
        return {
          user_id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          ...avail,
        };
      })
    );

    return board;
  }
}

module.exports = new ProviderAvailabilityService();
