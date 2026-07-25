"use strict";

const db = require("../../models");
const auditService = require("../../services/auditService");
const unifiedClinicalQueueService = require("../clinicalOrder/unifiedClinicalQueueService");
const clinicalOperationsAnalyticsService = require("../clinicalOrder/clinicalOperationsAnalyticsService");

/**
 * ClinicalOperationsCenterService
 * Orchestrates data aggregation for the Enterprise Clinical Operations Center.
 * All methods are thin wrappers around existing services to avoid duplicating logic.
 */
class ClinicalOperationsCenterService {
  /**
   * Get live hospital dashboard data.
   * Returns aggregated metrics across all domains.
   */
  async getHospitalDashboard(userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_dashboard", resourceType: "OPERATIONS" });
    }
    const hospitalQueue = await unifiedClinicalQueueService.getUnifiedWorkQueue();
    const analytics = await clinicalOperationsAnalyticsService.getHospitalKPIs();

    return {
      queue: hospitalQueue,
      analytics,
    };
  }

  /**
   * Get department-specific dashboard data.
   * departmentId corresponds to a domain (e.g., 'LABORATORY', 'RADIOLOGY', 'PHARMACY', 'CONSULTATION', 'NURSING').
   */
  async getDepartmentDashboard(departmentId, userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_department_dashboard", resourceType: "OPERATIONS", details: { departmentId } });
    }
    const departmentQueue = await unifiedClinicalQueueService.getUnifiedWorkQueue({ order_type: departmentId });
    const analytics = await clinicalOperationsAnalyticsService.getDepartmentKPIs(departmentId);

    return {
      departmentId,
      queue: departmentQueue,
      analytics,
    };
  }

  /**
   * Get provider workload data.
   */
  async getProviderWorkload(providerId, userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_provider_workload", resourceType: "OPERATIONS", details: { providerId } });
    }
    const workload = await clinicalOperationsAnalyticsService.getProviderWorkload(providerId);
    return workload;
  }

  /**
   * Get executive summary.
   */
  async getExecutiveSummary(userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_executive_summary", resourceType: "OPERATIONS" });
    }
    const summary = await clinicalOperationsAnalyticsService.getExecutiveSummary();
    return summary;
  }
}

module.exports = new ClinicalOperationsCenterService();
