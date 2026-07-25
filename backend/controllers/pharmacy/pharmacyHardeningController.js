"use strict";

const pharmacyTransferService = require("../../services/pharmacy/pharmacyTransferService");
const pharmacyBarcodeService = require("../../services/pharmacy/pharmacyBarcodeService");
const pharmacyRefillService = require("../../services/pharmacy/pharmacyRefillService");
const pharmacyAdvancedAnalyticsService = require("../../services/pharmacy/pharmacyAdvancedAnalyticsService");

class PharmacyHardeningController {
  async requestTransfer(req, res, next) {
    try {
      const requesterId = req.user.user_id;
      const { source_pharmacy_id, destination_pharmacy_id, medication_batch_id, quantity } = req.body;
      const transfer = await pharmacyTransferService.requestStockTransfer(
        { source_pharmacy_id, destination_pharmacy_id, medication_batch_id, quantity },
        requesterId
      );
      return res.status(201).json({
        success: true,
        data: transfer,
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmTransfer(req, res, next) {
    try {
      const receiverId = req.user.user_id;
      const { transferId } = req.params;
      const transfer = await pharmacyTransferService.confirmStockTransfer(transferId, receiverId);
      return res.json({
        success: true,
        data: transfer,
      });
    } catch (err) {
      next(err);
    }
  }

  async listTransfers(req, res, next) {
    try {
      const { pharmacy_id } = req.query;
      const transfers = await pharmacyTransferService.listTransfers(pharmacy_id);
      return res.json({
        success: true,
        data: transfers,
      });
    } catch (err) {
      next(err);
    }
  }

  async verifyBarcode(req, res, next) {
    try {
      const { barcode_identifier, batch_id, patient_id } = req.body;
      const result = await pharmacyBarcodeService.verifyMedicationBarcode({ barcode_identifier, batch_id, patient_id });
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async processRefill(req, res, next) {
    try {
      const dispenserId = req.user.user_id;
      const { prescription_id, max_refills } = req.body;
      const result = await pharmacyRefillService.processPrescriptionRefill({ prescription_id, max_refills }, dispenserId);
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRefillHistory(req, res, next) {
    try {
      const { prescriptionId } = req.params;
      const history = await pharmacyRefillService.getRefillHistory(prescriptionId);
      return res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAdvancedAnalytics(req, res, next) {
    try {
      const { pharmacy_id } = req.query;
      const analytics = await pharmacyAdvancedAnalyticsService.getAdvancedAnalytics(pharmacy_id);
      return res.json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PharmacyHardeningController();
