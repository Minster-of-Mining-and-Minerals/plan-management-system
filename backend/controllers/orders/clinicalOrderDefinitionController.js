"use strict";

const clinicalOrderDefinitionService = require("../../services/orders/clinicalOrderDefinitionService");
const runtimeOrderGenerationService = require("../../services/orders/runtimeOrderGenerationService");
const orderDefinitionDesignerService = require("../../services/orders/orderDefinitionDesignerService");

class ClinicalOrderDefinitionController {
  async getOrderDefinitions(req, res, next) {
    try {
      const data = await clinicalOrderDefinitionService.getOrderDefinitions(req.query);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createOrderDefinition(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await clinicalOrderDefinitionService.createOrderDefinition(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async instantiateRuntimeOrder(req, res, next) {
    try {
      const userId = req.user?.user_id || req.user?.id;
      const data = await runtimeOrderGenerationService.instantiateRuntimeOrder(req.body, userId);
      return res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getDesignerConfigOptions(req, res, next) {
    try {
      const data = await orderDefinitionDesignerService.getDesignerConfigOptions();
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalOrderDefinitionController();
