"use strict";

const pharmacyClinicalIntegrationService = require("../../services/pharmacyClinicalIntegrationService");
const pharmacyClinicalResultService = require("../../services/pharmacyClinicalResultService");
const pharmacyPrescriptionSyncService = require("../../services/pharmacyPrescriptionSyncService");

class PharmacyClinicalController {
  async createPharmacyOrder(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { prescription_id } = req.body;
      const order = await pharmacyClinicalIntegrationService.createPharmacyOrder(prescription_id, staffId);
      return res.status(201).json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async forwardToPharmacy(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { orderId } = req.params;
      const { pharmacy_id } = req.body;
      const result = await pharmacyClinicalIntegrationService.forwardToPharmacy(orderId, pharmacy_id, staffId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPharmacyOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const order = await pharmacyClinicalIntegrationService.getPharmacyOrderStatus(orderId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPatientPharmacyHistory(req, res, next) {
    try {
      const { patientId } = req.params;
      const history = await pharmacyClinicalIntegrationService.getPatientPharmacyHistory(patientId);
      return res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPharmacyClinicalResult(req, res, next) {
    try {
      const { orderId } = req.params;
      const result = await pharmacyClinicalResultService.getPharmacyResult(orderId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPrescriptionVersionHistory(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const history = await pharmacyPrescriptionSyncService.getPrescriptionVersionHistory(prescriptionId);
      return res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async requestDoctorApproval(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { orderId } = req.params;
      const { substitution_notes } = req.body;
      const order = await pharmacyClinicalIntegrationService.requestDoctorApproval(orderId, substitution_notes, staffId);
      return res.json({
        success: true,
        data: order,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PharmacyClinicalController();
