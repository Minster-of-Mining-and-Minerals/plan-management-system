"use strict";

const radiologyCriticalAlertService = require("../services/radiologyCriticalAlertService");

class RadiologyCriticalAlertController {
  async createAlert(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const alert = await radiologyCriticalAlertService.createAlert(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }

  async assignRecipient(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { doctor_id } = req.body;
      const alert = await radiologyCriticalAlertService.assignRecipient(id, doctor_id, staffId);
      return res.json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const doctorId = req.user.user_id;
      const { id } = req.params;
      const alert = await radiologyCriticalAlertService.acknowledgeAlert(id, doctorId);
      return res.json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }

  async closeAlert(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const alert = await radiologyCriticalAlertService.closeAlert(id, staffId);
      return res.json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudyAlerts(req, res, next) {
    try {
      const { id } = req.params; // studyId
      const alerts = await radiologyCriticalAlertService.getStudyAlerts(id);
      return res.json({
        success: true,
        data: alerts,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyCriticalAlertController();
