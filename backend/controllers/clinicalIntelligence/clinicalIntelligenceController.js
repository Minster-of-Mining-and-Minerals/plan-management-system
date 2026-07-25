"use strict";

const clinicalPatientContextService = require("../../services/clinicalIntelligence/clinicalPatientContextService");
const clinicalDecisionSupportEngine = require("../../services/clinicalIntelligence/clinicalDecisionSupportEngine");
const patientRiskAssessmentService = require("../../services/clinicalIntelligence/patientRiskAssessmentService");
const clinicalAlertService = require("../../services/clinicalIntelligence/clinicalAlertService");
const clinicalProblemService = require("../../services/clinicalIntelligence/clinicalProblemService");

class ClinicalIntelligenceController {
  async getPatientSnapshot(req, res, next) {
    try {
      const { patientId } = req.params;
      const snapshot = await clinicalPatientContextService.getPatientSnapshot(patientId);
      return res.json({ success: true, data: snapshot });
    } catch (err) { next(err); }
  }

  async evaluatePatientContext(req, res, next) {
    try {
      const { patientId } = req.params;
      const actorId = req.user.user_id;
      const result = await clinicalDecisionSupportEngine.evaluatePatientContext(patientId, actorId);
      return res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  async getRiskScore(req, res, next) {
    try {
      const { patientId } = req.params;
      const risk = await patientRiskAssessmentService.computeRiskScore(patientId);
      return res.json({ success: true, data: risk });
    } catch (err) { next(err); }
  }

  async getAlerts(req, res, next) {
    try {
      const { patientId } = req.params;
      const { status, severity, domain, limit } = req.query;
      const alerts = await clinicalAlertService.getAlertsForPatient(patientId, { status, severity, domain, limit });
      return res.json({ success: true, data: alerts });
    } catch (err) { next(err); }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const userId = req.user.user_id;
      const alert = await clinicalAlertService.acknowledgeAlert(alertId, userId);
      return res.json({ success: true, data: alert });
    } catch (err) { next(err); }
  }

  async markAlertActionTaken(req, res, next) {
    try {
      const { alertId } = req.params;
      const userId = req.user.user_id;
      const alert = await clinicalAlertService.markActionTaken(alertId, userId);
      return res.json({ success: true, data: alert });
    } catch (err) { next(err); }
  }

  async dismissAlert(req, res, next) {
    try {
      const { alertId } = req.params;
      const userId = req.user.user_id;
      const alert = await clinicalAlertService.dismissAlert(alertId, userId);
      return res.json({ success: true, data: alert });
    } catch (err) { next(err); }
  }

  async addProblem(req, res, next) {
    try {
      const createdBy = req.user.user_id;
      const { patient_id, problem_code, problem_name, status, severity, onset_date, notes, encounter_id } = req.body;
      const problem = await clinicalProblemService.addProblem(
        { patient_id, problem_code, problem_name, status, severity, onset_date, notes, encounter_id },
        createdBy
      );
      return res.status(201).json({ success: true, data: problem });
    } catch (err) { next(err); }
  }

  async resolveProblem(req, res, next) {
    try {
      const { problemId } = req.params;
      const userId = req.user.user_id;
      const problem = await clinicalProblemService.resolveProblem(problemId, userId);
      return res.json({ success: true, data: problem });
    } catch (err) { next(err); }
  }

  async listProblems(req, res, next) {
    try {
      const { patientId } = req.params;
      const { status } = req.query;
      const problems = await clinicalProblemService.listProblems(patientId, status);
      return res.json({ success: true, data: problems });
    } catch (err) { next(err); }
  }
}

module.exports = new ClinicalIntelligenceController();
