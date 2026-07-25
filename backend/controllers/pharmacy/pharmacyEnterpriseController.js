"use strict";

const { PharmacyOrderStateMachine } = require("../../services/pharmacy/pharmacyOrderStateMachine");
const pharmacyMARService = require("../../services/pharmacy/pharmacyMARService");
const patientMedicationHistoryService = require("../../services/pharmacy/patientMedicationHistoryService");
const pharmacyFormularyService = require("../../services/pharmacy/pharmacyFormularyService");
const pharmacyReconciliationService = require("../../services/pharmacy/pharmacyReconciliationService");
const pharmacyIntegrationAdapter = require("../../services/pharmacy/pharmacyIntegrationAdapter");
const db = require("../../models");

class PharmacyEnterpriseController {
  async transitionOrderState(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { clinicalOrderId } = req.params;
      const { targetState, reason } = req.body;
      const result = await PharmacyOrderStateMachine.transitionState(clinicalOrderId, targetState, actorId, reason);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async recordAdministration(req, res, next) {
    try {
      const nurseId = req.user.user_id;
      const { patient_id, prescription_id, medication_catalog_id, dose, route, scheduled_time, status, reason } = req.body;
      const mar = await pharmacyMARService.recordAdministration(
        { patient_id, prescription_id, medication_catalog_id, dose, route, scheduled_time, status, reason },
        nurseId
      );
      return res.status(201).json({
        success: true,
        data: mar,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPatientMAR(req, res, next) {
    try {
      const { patientId } = req.params;
      const records = await pharmacyMARService.getPatientMAR(patientId);
      return res.json({
        success: true,
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMedicationHistory(req, res, next) {
    try {
      const { patientId } = req.params;
      const history = await patientMedicationHistoryService.getLongitudinalMedicationHistory(patientId);
      return res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async setFormularyRule(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { medication_catalog_id, department_restriction, requires_approval, doctor_authorization_level, preferred_alternative_id, notes } = req.body;
      const rule = await pharmacyFormularyService.setFormularyRule(
        { medication_catalog_id, department_restriction, requires_approval, doctor_authorization_level, preferred_alternative_id, notes },
        staffId
      );
      return res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (err) {
      next(err);
    }
  }

  async validateFormulary(req, res, next) {
    try {
      const { medicationCatalogId, departmentName } = req.query;
      const validation = await pharmacyFormularyService.validateFormularyAccess(medicationCatalogId, departmentName);
      return res.json({
        success: true,
        data: validation,
      });
    } catch (err) {
      next(err);
    }
  }

  async listFormularyRules(req, res, next) {
    try {
      const rules = await pharmacyFormularyService.listFormularyRules();
      return res.json({
        success: true,
        data: rules,
      });
    } catch (err) {
      next(err);
    }
  }

  async performReconciliation(req, res, next) {
    try {
      const clinicianId = req.user.user_id;
      const { patient_id, reconciliation_type, home_medications, reconciled_medications } = req.body;
      const result = await pharmacyReconciliationService.performReconciliation(
        { patient_id, reconciliation_type, home_medications, reconciled_medications },
        clinicianId
      );
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPatientReconciliations(req, res, next) {
    try {
      const { patientId } = req.params;
      const records = await pharmacyReconciliationService.getPatientReconciliations(patientId);
      return res.json({
        success: true,
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  async exportFHIRMedicationRequest(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const prescription = await db.Prescription.findByPk(prescriptionId, {
        include: [{ model: db.PrescriptionItem, as: "items" }],
      });
      if (!prescription) {
        const err = new Error("Prescription not found");
        err.status = 404;
        throw err;
      }

      const fhirResource = pharmacyIntegrationAdapter.exportToFHIRMedicationRequest(prescription.get({ plain: true }));
      return res.json({
        success: true,
        data: fhirResource,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PharmacyEnterpriseController();
