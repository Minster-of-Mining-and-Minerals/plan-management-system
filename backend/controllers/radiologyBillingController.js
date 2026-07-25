"use strict";

const radiologyBillingService = require("../services/radiologyBillingService");

class RadiologyBillingController {
  async createRadiologyCharge(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const result = await radiologyBillingService.createRadiologyCharge(id, staffId);
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelRadiologyCharge(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { reason } = req.body;
      const result = await radiologyBillingService.cancelRadiologyCharge(id, reason, staffId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyCharge(req, res, next) {
    try {
      const { id } = req.params;
      const verification = await radiologyBillingService.verifyCharge(id);
      return res.json({
        success: true,
        data: verification,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyBillingController();
