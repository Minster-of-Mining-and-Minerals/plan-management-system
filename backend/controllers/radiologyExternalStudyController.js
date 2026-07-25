"use strict";

const externalRadiologyStudyService = require("../services/externalRadiologyStudyService");

class RadiologyExternalStudyController {
  async importStudy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const externalStudy = await externalRadiologyStudyService.importStudy(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: externalStudy,
      });
    } catch (err) {
      next(err);
    }
  }

  async attachExternalReport(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { report_url } = req.body;
      const externalStudy = await externalRadiologyStudyService.attachExternalReport(id, report_url, staffId);
      return res.json({
        success: true,
        data: externalStudy,
      });
    } catch (err) {
      next(err);
    }
  }

  async linkToPatientTimeline(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const result = await externalRadiologyStudyService.linkToPatientTimeline(id, staffId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async listPatientExternalStudies(req, res, next) {
    try {
      const { patientId } = req.params;
      const studies = await externalRadiologyStudyService.listPatientExternalStudies(patientId);
      return res.json({
        success: true,
        data: studies,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyExternalStudyController();
