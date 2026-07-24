"use strict";

const laboratoryService = require("../services/laboratoryService");

class LaboratoryController {
  async createTestCatalog(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const test = await laboratoryService.createTestCatalog(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: test,
      });
    } catch (err) {
      next(err);
    }
  }

  async listTestCatalog(req, res, next) {
    try {
      const category = req.query.category;
      const tests = await laboratoryService.listTestCatalog(category);
      return res.json({
        success: true,
        data: tests,
      });
    } catch (err) {
      next(err);
    }
  }

  async addTestItems(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const orderId = req.params.orderId;
      const { items } = req.body;
      const createdItems = await laboratoryService.addTestItems(orderId, items, staffId);
      return res.status(201).json({
        success: true,
        data: createdItems,
      });
    } catch (err) {
      next(err);
    }
  }

  async createSpecimen(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const orderId = req.params.orderId;
      const specimen = await laboratoryService.createSpecimen(orderId, req.body, staffId);
      return res.status(201).json({
        success: true,
        data: specimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async collectSpecimen(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const specimenId = req.params.id;
      const { notes, site } = req.body || {};
      const specimen = await laboratoryService.collectSpecimen(specimenId, staffId, notes, site);
      return res.json({
        success: true,
        data: specimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async receiveSpecimen(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const specimenId = req.params.id;
      const specimen = await laboratoryService.receiveSpecimen(specimenId, staffId);
      return res.json({
        success: true,
        data: specimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptSpecimen(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const specimenId = req.params.id;
      const specimen = await laboratoryService.acceptSpecimen(specimenId, staffId);
      return res.json({
        success: true,
        data: specimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectSpecimen(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const specimenId = req.params.id;
      const { reason } = req.body || {};
      const specimen = await laboratoryService.rejectSpecimen(specimenId, reason, staffId);
      return res.json({
        success: true,
        data: specimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async createRecollectionRequest(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const specimenId = req.params.id;
      const { notes } = req.body || {};
      const newSpecimen = await laboratoryService.createRecollectionRequest(specimenId, staffId, notes);
      return res.status(201).json({
        success: true,
        data: newSpecimen,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSpecimenHistory(req, res, next) {
    try {
      const specimenId = req.params.id;
      const history = await laboratoryService.getSpecimenHistory(specimenId);
      return res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateLaboratoryStatus(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const orderId = req.params.orderId;
      const { laboratory_status, reason } = req.body;
      const order = await laboratoryService.updateLaboratoryStatus(
        orderId,
        laboratory_status,
        staffId,
        reason
      );
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async submitLaboratoryResult(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const orderId = req.params.orderId;
      const order = await laboratoryService.submitLaboratoryResult(orderId, req.body, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LaboratoryController();
