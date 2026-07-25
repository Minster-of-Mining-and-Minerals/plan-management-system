"use strict";

const radiologyService = require("../services/radiologyService");

class RadiologyController {
  async createProcedureCatalog(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const catalog = await radiologyService.createProcedureCatalog(req.body, staffId);
      return res.status(201).json({
        success: true,
        data: catalog,
      });
    } catch (err) {
      next(err);
    }
  }

  async listProcedureCatalog(req, res, next) {
    try {
      const { modality } = req.query;
      const items = await radiologyService.listProcedureCatalog(modality);
      return res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async createStudy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { orderId } = req.params;
      const study = await radiologyService.createStudy(orderId, req.body, staffId);
      return res.status(201).json({
        success: true,
        data: study,
      });
    } catch (err) {
      next(err);
    }
  }

  async scheduleStudy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { scheduled_at } = req.body;
      const study = await radiologyService.scheduleStudy(id, scheduled_at, staffId);
      return res.json({
        success: true,
        data: study,
      });
    } catch (err) {
      next(err);
    }
  }

  async startStudy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const study = await radiologyService.startStudy(id, staffId);
      return res.json({
        success: true,
        data: study,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeAcquisition(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const study = await radiologyService.completeAcquisition(id, staffId);
      return res.json({
        success: true,
        data: study,
      });
    } catch (err) {
      next(err);
    }
  }

  async submitReport(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const report = await radiologyService.submitReport(id, req.body, staffId);
      return res.status(201).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyReport(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const report = await radiologyService.verifyReport(id, staffId);
      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async amendReport(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const report = await radiologyService.amendReport(id, req.body, staffId);
      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudy(req, res, next) {
    try {
      const { id } = req.params;
      const study = await radiologyService.getStudyWithReport(id);
      return res.json({
        success: true,
        data: study,
      });
    } catch (err) {
      next(err);
    }
  }

  async listStudies(req, res, next) {
    try {
      const { order_id, patient_id, workflow_status } = req.query;
      const studies = await radiologyService.listStudies({ order_id, patient_id, workflow_status });
      return res.json({
        success: true,
        data: studies,
      });
    } catch (err) {
      next(err);
    }
  }

  async releaseReportToPatient(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const report = await radiologyService.releaseReportToPatient(id, staffId);
      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  async withholdReportFromPatient(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { id } = req.params;
      const { reason } = req.body;
      const report = await radiologyService.withholdReportFromPatient(id, reason, staffId);
      return res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RadiologyController();
