"use strict";

const medicationSafetyService = require("../../services/medication/medicationSafetyService");
const medicationCatalogService = require("../../services/medication/medicationCatalogService");

class MedicationSafetyController {
  async evaluatePrescriptionSafety(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { patient_id, prescription_id, items } = req.body;
      const assessment = await medicationSafetyService.evaluatePrescriptionSafety(
        { patient_id, prescription_id, items },
        actorId
      );
      return res.json({
        success: true,
        data: assessment,
      });
    } catch (err) {
      next(err);
    }
  }

  async searchMedications(req, res, next) {
    try {
      const { query, limit } = req.query;
      const items = await medicationCatalogService.searchMedications(query, limit);
      return res.json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  async getMedicationAlerts(req, res, next) {
    try {
      const { patientId } = req.params;
      const { prescription_id } = req.query;
      const alerts = await medicationSafetyService.getMedicationAlerts(patientId, prescription_id);
      return res.json({
        success: true,
        data: alerts,
      });
    } catch (err) {
      next(err);
    }
  }

  async overrideSafetyAlert(req, res, next) {
    try {
      const doctorId = req.user.user_id;
      const { alertId } = req.params;
      const { reason } = req.body;
      const alert = await medicationSafetyService.overrideSafetyAlert(alertId, reason, doctorId);
      return res.json({
        success: true,
        data: alert,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new MedicationSafetyController();
