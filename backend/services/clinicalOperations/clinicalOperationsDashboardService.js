"use strict";

const clinicalOperationsAnalyticsService = require("../clinicalOrder/clinicalOperationsAnalyticsService");
const auditService = require("../auditService");

class ClinicalOperationsDashboardService {
  /**
   * Return hospital KPIs.
   */
  async getHospitalKPIs(userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_kpis", resourceType: "OPERATIONS", details: { scope: "HOSPITAL" } });
    }
    return await clinicalOperationsAnalyticsService.getHospitalKPIs();
  }

  /**
   * Return department KPIs.
   */
  async getDepartmentKPIs(departmentId, userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_kpis", resourceType: "OPERATIONS", details: { scope: "DEPARTMENT", departmentId } });
    }
    return await clinicalOperationsAnalyticsService.getDepartmentKPIs(departmentId);
  }

  /**
   * Return provider KPIs & workload.
   */
  async getProviderKPIs(providerId, userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_kpis", resourceType: "OPERATIONS", details: { scope: "PROVIDER", providerId } });
    }
    return await clinicalOperationsAnalyticsService.getProviderWorkload(providerId);
  }

  /**
   * Return executive summary.
   */
  async getExecutiveSummary(userId) {
    if (userId) {
      await auditService.logAudit({ actorUserId: userId, action: "operations:view_executive_summary", resourceType: "OPERATIONS" });
    }
    return await clinicalOperationsAnalyticsService.getExecutiveSummary();
  }
}

module.exports = new ClinicalOperationsDashboardService();
