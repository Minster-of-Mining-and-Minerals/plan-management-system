"use strict";

const clinicalConfigurationGovernanceService = require("../../services/workflow/clinicalConfigurationGovernanceService");
const db = require("../../models");

class ClinicalConfigurationGovernanceController {
  async validateConfiguration(req, res, next) {
    try {
      const { entity_type, entity_data } = req.body;
      const data = clinicalConfigurationGovernanceService.validateConfiguration(entity_type, entity_data);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async transitionLifecycleStatus(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const tenantId = req.headers["x-tenant-id"] || req.query.tenant_id || "DEFAULT_HOSPITAL";
      const data = await clinicalConfigurationGovernanceService.transitionLifecycleStatus(req.body, userId, tenantId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async performImpactAnalysis(req, res, next) {
    try {
      const { entity_type, entity_id } = req.query;
      const tenantId = req.headers["x-tenant-id"] || req.query.tenant_id || "DEFAULT_HOSPITAL";
      const data = await clinicalConfigurationGovernanceService.performImpactAnalysis(entity_type, entity_id, tenantId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDependencyTree(req, res, next) {
    try {
      const { entity_code } = req.query;
      const tenantId = req.headers["x-tenant-id"] || req.query.tenant_id || "DEFAULT_HOSPITAL";
      const data = await clinicalConfigurationGovernanceService.getDependencyTree(entity_code || "CBC_TEST", tenantId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getGovernanceLogs(req, res, next) {
    try {
      const tenantId = req.headers["x-tenant-id"] || req.query.tenant_id || "DEFAULT_HOSPITAL";
      let logs = [];
      if (db.ClinicalConfigurationGovernanceLog) {
        logs = await db.ClinicalConfigurationGovernanceLog.findAll({
          where: { tenant_id: tenantId },
          order: [["created_at", "DESC"]],
          limit: 50,
        });
      }
      return res.status(200).json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalConfigurationGovernanceController();
