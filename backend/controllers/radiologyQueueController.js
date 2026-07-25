"use strict";

const radiologyQueueService = require("../services/radiologyQueueService");

class RadiologyQueueController {
  async getQueue(req, res, next) {
    try {
      const { queue_type, status, department_id } = req.query;
      const items = await radiologyQueueService.getQueue({ queue_type, status, department_id });
      return res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMyWorklist(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const items = await radiologyQueueService.getStaffWorklist(staffId);
      return res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async claimQueueItem(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const item = await radiologyQueueService.claimQueueItem(id, staffId);
      return res.json({
        success: true,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async startQueueItem(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const item = await radiologyQueueService.startQueueItem(id, staffId);
      return res.json({
        success: true,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeQueueItem(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const item = await radiologyQueueService.completeQueueItem(id, staffId);
      return res.json({
        success: true,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyQueueController();
