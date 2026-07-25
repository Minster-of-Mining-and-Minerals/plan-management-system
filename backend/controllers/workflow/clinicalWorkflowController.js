"use strict";

const clinicalActivityDefinitionService = require("../../services/workflow/clinicalActivityDefinitionService");
const clinicalWorkflowEngine = require("../../services/workflow/clinicalWorkflowEngine");
const dynamicOrderExecutionService = require("../../services/workflow/dynamicOrderExecutionService");

class ClinicalWorkflowController {
  async getActivityDefinitions(req, res, next) {
    try {
      const data = await clinicalActivityDefinitionService.getActivityDefinitions(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createActivityDefinition(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalActivityDefinitionService.createActivityDefinition(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async submitClinicalIntent(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalWorkflowEngine.submitClinicalIntent(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getWorkflowDefinitions(req, res, next) {
    try {
      const data = await clinicalWorkflowEngine.getWorkflowDefinitions();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async executeOrderStep(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await dynamicOrderExecutionService.executeOrderStep(req.body, userId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalWorkflowController();
