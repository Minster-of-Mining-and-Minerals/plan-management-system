"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const db = require("../../models");
const auditService = require("../auditService");

class PharmacyInventoryService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "PharmacyInventory",
        resourceId,
        details,
      });
    }
  }

  /**
   * Create or fetch a pharmacy storage warehouse location.
   */
  async createWarehouse(pharmacyId, data, actorId) {
    if (!pharmacyId || !data.warehouse_name) {
      const err = new Error("pharmacy_id and warehouse_name are required");
      err.status = 400;
      throw err;
    }

    const warehouse = await db.PharmacyWarehouse.create({
      id: uuidv4(),
      pharmacy_id: pharmacyId,
      warehouse_name: data.warehouse_name.trim(),
      location: data.location || "Main Hospital Building",
      status: "ACTIVE",
    });

    await this.logAudit("PHARMACY_WAREHOUSE_CREATED", warehouse.id, actorId, { warehouse_name: data.warehouse_name });
    return warehouse.get({ plain: true });
  }

  /**
   * Receive a new medication stock batch into inventory.
   */
  async receiveMedicationStock(pharmacyId, data, actorId) {
    if (!pharmacyId || !data.medication_catalog_id || !data.batch_number || !data.expiry_date || data.quantity_received <= 0) {
      const err = new Error("pharmacy_id, medication_catalog_id, batch_number, expiry_date, and positive quantity_received are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const batch = await db.MedicationBatch.create(
        {
          id: uuidv4(),
          pharmacy_id: pharmacyId,
          warehouse_id: data.warehouse_id || null,
          medication_catalog_id: data.medication_catalog_id,
          batch_number: data.batch_number.trim(),
          manufacturer: data.manufacturer || "Generic Pharma",
          manufacture_date: data.manufacture_date || null,
          expiry_date: data.expiry_date,
          quantity_received: parseInt(data.quantity_received, 10),
          quantity_available: parseInt(data.quantity_received, 10),
          unit_cost: parseFloat(data.unit_cost) || 0.0,
          selling_price: parseFloat(data.selling_price) || 0.0,
          status: "ACTIVE",
        },
        { transaction: t }
      );

      await db.PharmacyStockTransaction.create(
        {
          id: uuidv4(),
          pharmacy_id: pharmacyId,
          warehouse_id: data.warehouse_id || null,
          medication_batch_id: batch.id,
          transaction_type: "PURCHASE_RECEIVED",
          quantity: parseInt(data.quantity_received, 10),
          reference_type: "STOCK_RECEIPT",
          reference_id: batch.id,
          performed_by: actorId,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_STOCK_RECEIVED", batch.id, actorId, { quantity: data.quantity_received, batch_number: data.batch_number }, t);

      await t.commit();
      return batch.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Allocate and deduct medication stock from available batch during dispensing.
   */
  async allocateMedicationForDispensing(pharmacyId, medicationCatalogId, requestedQty, referenceId, actorId) {
    const qtyNeeded = parseInt(requestedQty, 10) || 1;

    // Find active non-expired batch with available stock (FEFO - First Expired First Out)
    const todayStr = new Date().toISOString().split("T")[0];
    const batch = await db.MedicationBatch.findOne({
      where: {
        pharmacy_id: pharmacyId,
        medication_catalog_id: medicationCatalogId,
        status: "ACTIVE",
        expiry_date: { [Op.gt]: todayStr },
        quantity_available: { [Op.gte]: qtyNeeded },
      },
      order: [["expiry_date", "ASC"]],
    });

    if (!batch) {
      const err = new Error(`Insufficient available stock batch for medication catalog ID '${medicationCatalogId}'. Minimum required: ${qtyNeeded}`);
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const newQty = batch.quantity_available - qtyNeeded;
      const newStatus = newQty === 0 ? "DEPLETED" : "ACTIVE";

      await batch.update(
        {
          quantity_available: newQty,
          status: newStatus,
        },
        { transaction: t }
      );

      const txn = await db.PharmacyStockTransaction.create(
        {
          id: uuidv4(),
          pharmacy_id: pharmacyId,
          warehouse_id: batch.warehouse_id,
          medication_batch_id: batch.id,
          transaction_type: "DISPENSED",
          quantity: -qtyNeeded,
          reference_type: "PRESCRIPTION_DISPENSING",
          reference_id: referenceId,
          performed_by: actorId,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_STOCK_DISPENSED", batch.id, actorId, { quantity_deducted: qtyNeeded, remaining: newQty }, t);

      await t.commit();
      return {
        batch: batch.get({ plain: true }),
        transaction: txn.get({ plain: true }),
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Search available batches by pharmacy.
   */
  async listBatches(pharmacyId) {
    const batches = await db.MedicationBatch.findAll({
      where: { pharmacy_id: pharmacyId },
      include: [
        { model: db.MedicationCatalog, as: "medicationCatalog" },
        { model: db.PharmacyWarehouse, as: "warehouse" },
      ],
      order: [["expiry_date", "ASC"]],
    });

    return batches.map((b) => b.get({ plain: true }));
  }

  /**
   * Search available warehouses by pharmacy.
   */
  async listWarehouses(pharmacyId) {
    const warehouses = await db.PharmacyWarehouse.findAll({
      where: { pharmacy_id: pharmacyId },
      order: [["created_at", "ASC"]],
    });

    return warehouses.map((w) => w.get({ plain: true }));
  }
}

module.exports = new PharmacyInventoryService();
