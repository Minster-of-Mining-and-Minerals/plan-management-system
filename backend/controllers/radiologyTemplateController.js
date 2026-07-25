"use strict";

const radiologyReportingTemplateService = require("../services/radiologyReportingTemplateService");

class RadiologyTemplateController {
  async createTemplate(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const template = await radiologyReportingTemplateService.createTemplate(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  async getTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const template = await radiologyReportingTemplateService.getTemplateById(id);
      return res.json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  async getTemplateForProcedure(req, res, next) {
    try {
      const { procedure_type, modality } = req.query;
      const template = await radiologyReportingTemplateService.getTemplateForProcedure(procedure_type, modality);
      return res.json({
        success: true,
        data: template,
      });
    } catch (err) {
      next(err);
    }
  }

  async applyTemplateToReport(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params; // reportId
      const { templateId, sectionData } = req.body;
      const report = await radiologyReportingTemplateService.applyTemplateToReport(id, templateId, sectionData, staffId);
      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyTemplateController();
