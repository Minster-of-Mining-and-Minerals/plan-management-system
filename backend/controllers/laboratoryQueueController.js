"use strict";

const laboratoryQueueService = require("../services/laboratoryQueueService");

class LaboratoryQueueController {
  async getWorkQueue(req, res, next) {
    try {
      const { queue_type, status, department_id } = req.query;
      const items = await laboratoryQueueService.getQueue({
        queue_type,
        status: status || "WAITING",
        department_id,
      });
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
      const items = await laboratoryQueueService.getStaffWorklist(staffId);
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
      const id = req.params.id;
      const item = await laboratoryQueueService.claimQueueItem(id, staffId);
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
      const id = req.params.id;
      const item = await laboratoryQueueService.startQueueItem(id, staffId);
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
      const id = req.params.id;
      const item = await laboratoryQueueService.completeQueueItem(id, staffId);
      return res.json({
        success: true,
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LaboratoryQueueController();
