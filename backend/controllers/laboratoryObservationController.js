"use strict";

const laboratoryObservationService = require("../services/laboratoryObservationService");

class LaboratoryObservationController {
  async createObservation(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const resultId = req.params.resultId;
      const payload = { ...req.body, result_id: resultId };
      const observation = await laboratoryObservationService.createObservation(payload, staffId);
      return res.status(201).json({
        success: true,
        data: observation,
      });
    } catch (err) {
      next(err);
    }
  }

  async getResultObservations(req, res, next) {
    try {
      const resultId = req.params.resultId;
      const observations = await laboratoryObservationService.getResultObservations(resultId);
      return res.json({
        success: true,
        data: observations,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyObservation(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const id = req.params.id;
      const observation = await laboratoryObservationService.verifyObservation(id, staffId);
      return res.json({
        success: true,
        data: observation,
      });
    } catch (err) {
      next(err);
    }
  }

  async amendObservation(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const id = req.params.id;
      const observation = await laboratoryObservationService.amendObservation(id, req.body, staffId);
      return res.json({
        success: true,
        data: observation,
      });
    } catch (err) {
      next(err);
    }
  }

  async getCriticalResults(req, res, next) {
    try {
      const criticals = await laboratoryObservationService.getCriticalResults();
      return res.json({
        success: true,
        data: criticals,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LaboratoryObservationController();
