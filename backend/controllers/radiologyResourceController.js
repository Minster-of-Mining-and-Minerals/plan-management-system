"use strict";

const radiologySchedulingService = require("../services/radiologySchedulingService");

class RadiologyResourceController {
  async createResource(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const resource = await radiologySchedulingService.createResource(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: resource,
      });
    } catch (err) {
      next(err);
    }
  }

  async listResources(req, res, next) {
    try {
      const resources = await radiologySchedulingService.listResources();
      return res.json({
        success: true,
        data: resources,
      });
    } catch (err) {
      next(err);
    }
  }

  async findAvailableSlots(req, res, next) {
    try {
      const { id } = req.params;
      const { date } = req.query;
      const slots = await radiologySchedulingService.findAvailableSlots(id, date);
      return res.json({
        success: true,
        data: slots,
      });
    } catch (err) {
      next(err);
    }
  }

  async reserveResource(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { study_id, available_from, available_to } = req.body;
      const reservation = await radiologySchedulingService.reserveResource(id, study_id, available_from, available_to, staffId);
      return res.status(201).json({
        success: true,
        data: reservation,
      });
    } catch (err) {
      next(err);
    }
  }

  async releaseResource(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const result = await radiologySchedulingService.releaseResource(id, staffId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyResourceController();
