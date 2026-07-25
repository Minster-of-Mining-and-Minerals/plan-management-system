"use strict";

const unifiedClinicalQueueService = require("../../services/clinicalOrder/unifiedClinicalQueueService");
const unifiedClinicalBillingIntegrityService = require("../../services/clinicalOrder/unifiedClinicalBillingIntegrityService");

class UnifiedClinicalOrderController {
  async getUnifiedQueue(req, res, next) {
    try {
      const { order_type } = req.query;
      const queue = await unifiedClinicalQueueService.getUnifiedWorkQueue({ order_type });
      return res.json({
        success: true,
        data: queue,
      });
    } catch (err) {
      next(err);
    }
  }

  async claimOrder(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { clinicalOrderId } = req.params;
      const order = await unifiedClinicalQueueService.claimOrder(clinicalOrderId, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async reassignOrder(req, res, next) {
    try {
      const { clinicalOrderId } = req.params;
      const { newStaffId } = req.body;
      const order = await unifiedClinicalQueueService.reassignOrder(clinicalOrderId, newStaffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async processBillingIntegrity(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { clinicalOrderId, eventType } = req.body;
      const result = await unifiedClinicalBillingIntegrityService.processBillingIntegrity(clinicalOrderId, eventType, actorId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UnifiedClinicalOrderController();
