"use strict";

const pharmacyInventoryService = require("../../services/pharmacy/pharmacyInventoryService");
const pharmacyControlledMedicationService = require("../../services/pharmacy/pharmacyControlledMedicationService");
const pharmacyExpiryService = require("../../services/pharmacy/pharmacyExpiryService");
const pharmacyInventoryAnalyticsService = require("../../services/pharmacy/pharmacyInventoryAnalyticsService");
const pharmacySubstitutionService = require("../../services/pharmacy/pharmacySubstitutionService");

class PharmacyInventoryController {
  async createWarehouse(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { pharmacy_id, warehouse_name, location } = req.body;
      const warehouse = await pharmacyInventoryService.createWarehouse(pharmacy_id, { warehouse_name, location }, actorId);
      return res.status(201).json({
        success: true,
        data: warehouse,
      });
    } catch (err) {
      next(err);
    }
  }

  async listWarehouses(req, res, next) {
    try {
      const { pharmacy_id } = req.query;
      const warehouses = await pharmacyInventoryService.listWarehouses(pharmacy_id);
      return res.json({
        success: true,
        data: warehouses,
      });
    } catch (err) {
      next(err);
    }
  }

  async receiveStock(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { pharmacy_id, warehouse_id, medication_catalog_id, batch_number, manufacturer, manufacture_date, expiry_date, quantity_received, unit_cost, selling_price } = req.body;
      const batch = await pharmacyInventoryService.receiveMedicationStock(
        pharmacy_id,
        { warehouse_id, medication_catalog_id, batch_number, manufacturer, manufacture_date, expiry_date, quantity_received, unit_cost, selling_price },
        actorId
      );
      return res.status(201).json({
        success: true,
        data: batch,
      });
    } catch (err) {
      next(err);
    }
  }

  async listBatches(req, res, next) {
    try {
      const { pharmacy_id } = req.query;
      const batches = await pharmacyInventoryService.listBatches(pharmacy_id);
      return res.json({
        success: true,
        data: batches,
      });
    } catch (err) {
      next(err);
    }
  }

  async logControlledDispensing(req, res, next) {
    try {
      const dispenserId = req.user.user_id;
      const { batchId, patientId, prescriptionId, quantity, verifierId, digitalSignature } = req.body;
      const log = await pharmacyControlledMedicationService.logControlledDispensing({
        batchId,
        patientId,
        prescriptionId,
        quantity,
        dispenserId,
        verifierId,
        digitalSignature,
      });
      return res.status(201).json({
        success: true,
        data: log,
      });
    } catch (err) {
      next(err);
    }
  }

  async getControlledLogs(req, res, next) {
    try {
      const { patientId } = req.query;
      const logs = await pharmacyControlledMedicationService.getControlledLogs(patientId);
      return res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  async getExpiringBatches(req, res, next) {
    try {
      const { pharmacy_id, days } = req.query;
      const batches = await pharmacyExpiryService.findExpiringMedication(pharmacy_id, days || 90);
      return res.json({
        success: true,
        data: batches,
      });
    } catch (err) {
      next(err);
    }
  }

  async quarantineExpired(req, res, next) {
    try {
      const actorId = req.user.user_id;
      const { pharmacy_id } = req.body;
      const result = await pharmacyExpiryService.quarantineExpiredMedication(pharmacy_id, actorId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req, res, next) {
    try {
      const { pharmacy_id } = req.query;
      const analytics = await pharmacyInventoryAnalyticsService.getInventoryAnalytics(pharmacy_id);
      return res.json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }

  async createSubstitutionRequest(req, res, next) {
    try {
      const staffId = req.user.user_id;
      const { pharmacy_prescription_item_id, original_medication_id, requested_medication_id, reason } = req.body;
      const result = await pharmacySubstitutionService.createSubstitutionRequest(
        { pharmacy_prescription_item_id, original_medication_id, requested_medication_id, reason },
        staffId
      );
      return res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async approveSubstitutionRequest(req, res, next) {
    try {
      const doctorId = req.user.user_id;
      const { requestId } = req.params;
      const result = await pharmacySubstitutionService.approveSubstitutionRequest(requestId, doctorId);
      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PharmacyInventoryController();
