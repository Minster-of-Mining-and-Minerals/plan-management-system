"use strict";

const clinicalOperationsCenterService = require("../../services/clinicalOperations/clinicalOperationsCenterService");
const clinicalDashboardService = require("../../services/clinicalOperations/clinicalDashboardService");
const clinicalWorkloadService = require("../../services/clinicalOperations/clinicalWorkloadService");
const clinicalOperationsFeedService = require("../../services/clinicalOperations/clinicalOperationsFeedService");
const hospitalOperationsTimelineService = require("../../services/clinicalOperations/hospitalOperationsTimelineService");
const clinicalOperationsDashboardService = require("../../services/clinicalOperations/clinicalOperationsDashboardService");
const unifiedClinicalQueueService = require("../../services/clinicalOrder/unifiedClinicalQueueService");
const auditService = require("../../services/auditService");

class ClinicalOperationsController {
  async getHospitalDashboard(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalDashboardService.getHospitalDashboard(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDepartmentDashboard(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const { departmentId } = req.params;
      const data = await clinicalDashboardService.getDepartmentDashboard(departmentId, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getHospitalQueue(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      if (userId) await auditService.logAudit({ actorUserId: userId, action: "operations:view_queues", resourceType: "OPERATIONS" });
      const data = await unifiedClinicalQueueService.getEnterpriseQueuesOverview();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getOperationsFeed(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 20;
      const data = await clinicalOperationsFeedService.getOperationsFeed(limit);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getProviderWorkload(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const { providerId } = req.params;
      const data = await clinicalOperationsAnalyticsService.getProviderWorkload(providerId);
      if (userId) await auditService.recordAction(userId, "operations:view_provider_workload", { providerId });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getWorkloadDistribution(req, res, next) {
    try {
      const data = await clinicalWorkloadService.getWorkloadDistribution();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getExecutiveSummary(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalOperationsDashboardService.getExecutiveSummary(userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getHospitalTimeline(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 30;
      const data = await hospitalOperationsTimelineService.getHospitalTimeline(limit);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

// Ensure clinicalOperationsAnalyticsService is imported for getProviderWorkload
const clinicalOperationsAnalyticsService = require("../../services/clinicalOrder/clinicalOperationsAnalyticsService");

module.exports = new ClinicalOperationsController();
