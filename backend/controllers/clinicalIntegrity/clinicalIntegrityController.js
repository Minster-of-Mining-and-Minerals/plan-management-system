"use strict";

const clinicalAuditEngine = require("../../services/clinicalIntegrity/clinicalAuditEngine");
const clinicalRecordVersionService = require("../../services/clinicalIntegrity/clinicalRecordVersionService");
const clinicalAmendmentWorkflowService = require("../../services/clinicalIntegrity/clinicalAmendmentWorkflowService");
const clinicalComplianceService = require("../../services/clinicalIntegrity/clinicalComplianceService");

class ClinicalIntegrityController {
  async getAuditTrail(req, res, next) {
    try {
      const { patient_id, domain, entity_type, entity_id, limit } = req.query;
      const events = await clinicalAuditEngine.getAuditTrail({ patient_id, domain, entity_type, entity_id, limit });
      return res.json({
        success: true,
        data: events,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRecordVersions(req, res, next) {
    try {
      const { entity_type, entity_id } = req.params;
      const versions = await clinicalRecordVersionService.getRecordVersions(entity_type, entity_id);
      return res.json({
        success: true,
        data: versions,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestAmendment(req, res, next) {
    try {
      const requesterId = req.user.user_id;
      const { entity_type, entity_id, patient_id, original_content, proposed_content, clinical_reason } = req.body;
      const amendment = await clinicalAmendmentWorkflowService.requestAmendment(
        { entity_type, entity_id, patient_id, original_content, proposed_content, clinical_reason },
        requesterId
      );
      return res.status(201).json({
        success: true,
        data: amendment,
      });
    } catch (err) {
      next(err);
    }
  }

  async reviewAmendment(req, res, next) {
    try {
      const reviewerId = req.user.user_id;
      const { amendmentId } = req.params;
      const { status, review_notes } = req.body;
      const amendment = await clinicalAmendmentWorkflowService.reviewAmendment(amendmentId, status, review_notes, reviewerId);
      return res.json({
        success: true,
        data: amendment,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAmendments(req, res, next) {
    try {
      const { patient_id, entity_id, status } = req.query;
      const amendments = await clinicalAmendmentWorkflowService.getAmendments({ patient_id, entity_id, status });
      return res.json({
        success: true,
        data: amendments,
      });
    } catch (err) {
      next(err);
    }
  }

  async getComplianceMetrics(req, res, next) {
    try {
      const metrics = await clinicalComplianceService.getComplianceMetrics();
      return res.json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClinicalIntegrityController();
