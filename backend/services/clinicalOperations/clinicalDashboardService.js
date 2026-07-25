"use strict";

const unifiedClinicalQueueService = require("../../services/clinicalOrder/unifiedClinicalQueueService");
const clinicalOperationsAnalyticsService = require("../clinicalOrder/clinicalOperationsAnalyticsService");
const auditService = require("../../services/auditService");

/**
 * ClinicalDashboardService
 * Provides data for the Live Hospital Dashboard and Department Dashboards.
 */
class ClinicalDashboardService {
  /**
   * Get aggregated hospital‑wide dashboard metrics.
   */
  async getHospitalDashboard(userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_hospital_dashboard", resourceType: "OPERATIONS" });
    }
    const queue = await unifiedClinicalQueueService.getUnifiedWorkQueue();
    const analytics = await clinicalOperationsAnalyticsService.getHospitalKPIs();
    return { queue, analytics };
  }

  /**
   * Get department‑specific dashboard metrics.
   * @param {string} departmentId - e.g., "LABORATORY", "RADIOLOGY", "PHARMACY", "CONSULTATION", "NURSING"
   */
  async getDepartmentDashboard(departmentId, userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_department_dashboard", resourceType: "OPERATIONS", details: { departmentId } });
    }
    const queue = await unifiedClinicalQueueService.getUnifiedWorkQueue({ order_type: departmentId });
    const analytics = await clinicalOperationsAnalyticsService.getDepartmentKPIs(departmentId);
    return { departmentId, queue, analytics };
  }
}

module.exports = new ClinicalDashboardService();
