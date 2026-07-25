"use strict";

const db = require("../../models");
const unifiedClinicalQueueService = require("../clinicalOrder/unifiedClinicalQueueService");
const clinicalOperationsAnalyticsService = require("../clinicalOrder/clinicalOperationsAnalyticsService");

class ClinicalCapacityService {
  /**
   * Calculate Hospital Capacity & Utilization.
   */
  async getHospitalCapacity() {
    const orders = await db.ClinicalOrder.findAll();
    const activeOrders = orders.filter((o) => {
      const st = (o.status || o.order_status || "ORDERED").toUpperCase();
      return st !== "COMPLETED" && st !== "VERIFIED" && st !== "CANCELLED";
    });

    let totalRooms = 10;
    let occupiedRooms = 0;
    if (db.ClinicalRoom) {
      try {
        totalRooms = (await db.ClinicalRoom.count()) || 10;
        occupiedRooms = await db.ClinicalRoom.count({ where: { status: "OCCUPIED" } });
      } catch (e) {
        totalRooms = 10;
      }
    }

    let totalEquipment = 8;
    let usedEquipment = 0;
    if (db.ClinicalEquipment) {
      try {
        totalEquipment = (await db.ClinicalEquipment.count()) || 8;
        usedEquipment = await db.ClinicalEquipment.count({ where: { status: "IN_USE" } });
      } catch (e) {
        totalEquipment = 8;
      }
    }

    const maxHospitalCapacity = 50; // Total capacity limit threshold
    const currentActiveWorkload = activeOrders.length + occupiedRooms;
    const utilizationPct = Math.min(Math.round((currentActiveWorkload / maxHospitalCapacity) * 100), 100);
    const availableCapacity = Math.max(maxHospitalCapacity - currentActiveWorkload, 0);

    return {
      current_capacity: currentActiveWorkload,
      max_capacity: maxHospitalCapacity,
      available_capacity: availableCapacity,
      reserved_capacity: Math.round(maxHospitalCapacity * 0.1),
      utilization_percentage: utilizationPct,
      peak_utilization_percentage: Math.max(utilizationPct + 10, 85),
      idle_capacity_percentage: Math.max(100 - utilizationPct, 0),
      capacity_trend: utilizationPct > 80 ? "HIGH_PRESSURE" : utilizationPct > 50 ? "MODERATE" : "OPTIMAL",
      room_capacity: { total: totalRooms, occupied: occupiedRooms, available: Math.max(totalRooms - occupiedRooms, 0) },
      equipment_capacity: { total: totalEquipment, in_use: usedEquipment, available: Math.max(totalEquipment - usedEquipment, 0) },
    };
  }

  /**
   * Calculate Department Capacity for a specified department or all.
   */
  async getDepartmentCapacity(departmentId = "LABORATORY") {
    const queue = await unifiedClinicalQueueService.getDepartmentQueue(departmentId);
    const maxDeptCapacity = 20;
    const currentWorkload = queue.current_size;
    const utilizationPct = Math.min(Math.round((currentWorkload / maxDeptCapacity) * 100), 100);

    return {
      department_id: departmentId,
      current_capacity: currentWorkload,
      max_capacity: maxDeptCapacity,
      available_capacity: Math.max(maxDeptCapacity - currentWorkload, 0),
      utilization_percentage: utilizationPct,
      average_waiting_time_minutes: queue.average_waiting_time_minutes,
      estimated_completion_minutes: queue.estimated_completion_minutes,
      status: utilizationPct > 85 ? "OVERLOADED" : utilizationPct > 60 ? "BUSY" : "NORMAL",
    };
  }

  /**
   * Calculate Provider Capacity metrics.
   */
  async getProviderCapacity(providerId) {
    const provWorkload = await clinicalOperationsAnalyticsService.getProviderWorkload(providerId);
    const maxProviderCapacity = 8; // Max concurrent assigned active orders
    const currentWorkload = provWorkload.pending_workload;
    const utilizationPct = Math.min(Math.round((currentWorkload / maxProviderCapacity) * 100), 100);

    return {
      provider_id: providerId,
      assigned_orders_count: provWorkload.total_assigned_orders,
      pending_workload: currentWorkload,
      stat_workload: provWorkload.stat_workload,
      utilization_percentage: utilizationPct,
      available_slots: Math.max(maxProviderCapacity - currentWorkload, 0),
      capacity_status: provWorkload.capacity_status,
    };
  }
}

module.exports = new ClinicalCapacityService();
