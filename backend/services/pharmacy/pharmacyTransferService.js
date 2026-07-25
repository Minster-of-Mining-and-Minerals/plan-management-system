"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const auditService = require("../auditService");
const notificationService = require("../notificationService");

class PharmacyTransferService {
  async logAudit(action, resourceId, actorId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: actorId,
        action,
        resourceType: "PharmacyStockTransfer",
        resourceId,
        details,
      });
    }
  }

  /**
   * Request inter-pharmacy stock transfer.
   */
  async requestStockTransfer({ source_pharmacy_id, destination_pharmacy_id, medication_batch_id, quantity }, requesterId) {
    if (!source_pharmacy_id || !destination_pharmacy_id || !medication_batch_id || !quantity || quantity <= 0) {
      const err = new Error("source_pharmacy_id, destination_pharmacy_id, medication_batch_id, and positive quantity are required");
      err.status = 400;
      throw err;
    }

    const batch = await db.MedicationBatch.findByPk(medication_batch_id);
    if (!batch) {
      const err = new Error("Source medication batch not found");
      err.status = 404;
      throw err;
    }

    if (batch.quantity_available < quantity) {
      const err = new Error(`Insufficient available stock in source batch. Available: ${batch.quantity_available}`);
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const transfer = await db.PharmacyStockTransfer.create(
        {
          id: uuidv4(),
          source_pharmacy_id,
          destination_pharmacy_id,
          medication_batch_id,
          quantity: parseInt(quantity, 10),
          status: "TRANSIT",
          requested_by: requesterId,
        },
        { transaction: t }
      );

      // Deduct from source batch and log transfer transaction
      await batch.update(
        { quantity_available: batch.quantity_available - parseInt(quantity, 10) },
        { transaction: t }
      );

      await db.PharmacyStockTransaction.create(
        {
          id: uuidv4(),
          pharmacy_id: source_pharmacy_id,
          warehouse_id: batch.warehouse_id,
          medication_batch_id: batch.id,
          transaction_type: "TRANSFER",
          quantity: -parseInt(quantity, 10),
          reference_type: "STOCK_TRANSFER",
          reference_id: transfer.id,
          performed_by: requesterId,
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_STOCK_TRANSFER_REQUESTED", transfer.id, requesterId, { quantity }, t);

      if (notificationService && typeof notificationService.notifyPharmacyUsers === "function") {
        try {
          await notificationService.notifyPharmacyUsers(destination_pharmacy_id, {
            title: `📦 Inter-Pharmacy Stock Transfer Incoming`,
            message: `Incoming shipment of ${quantity} units of batch #${batch.batch_number}.`,
          });
        } catch (nErr) {
          console.error("Failed to notify destination pharmacy:", nErr.message);
        }
      }

      await t.commit();
      return transfer.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Confirm reception of inter-pharmacy stock transfer at destination pharmacy.
   */
  async confirmStockTransfer(transferId, receiverId) {
    const t = await db.sequelize.transaction();
    try {
      const transfer = await db.PharmacyStockTransfer.findByPk(transferId, {
        include: [{ model: db.MedicationBatch, as: "batch" }],
        transaction: t,
      });

      if (!transfer) {
        const err = new Error("Stock transfer request not found");
        err.status = 404;
        throw err;
      }

      if (transfer.status !== "TRANSIT") {
        const err = new Error(`Stock transfer cannot be confirmed in '${transfer.status}' status`);
        err.status = 400;
        throw err;
      }

      const sourceBatch = transfer.batch;

      // Create new batch at destination pharmacy
      const destBatch = await db.MedicationBatch.create(
        {
          id: uuidv4(),
          pharmacy_id: transfer.destination_pharmacy_id,
          medication_catalog_id: sourceBatch.medication_catalog_id,
          batch_number: `${sourceBatch.batch_number}-TR`,
          manufacturer: sourceBatch.manufacturer,
          manufacture_date: sourceBatch.manufacture_date,
          expiry_date: sourceBatch.expiry_date,
          quantity_received: transfer.quantity,
          quantity_available: transfer.quantity,
          unit_cost: sourceBatch.unit_cost,
          selling_price: sourceBatch.selling_price,
          status: "ACTIVE",
          barcode_identifier: sourceBatch.barcode_identifier,
        },
        { transaction: t }
      );

      await db.PharmacyStockTransaction.create(
        {
          id: uuidv4(),
          pharmacy_id: transfer.destination_pharmacy_id,
          medication_batch_id: destBatch.id,
          transaction_type: "PURCHASE_RECEIVED",
          quantity: transfer.quantity,
          reference_type: "STOCK_TRANSFER_RECEIVED",
          reference_id: transfer.id,
          performed_by: receiverId,
        },
        { transaction: t }
      );

      await transfer.update(
        {
          status: "RECEIVED",
          received_by: receiverId,
          received_at: new Date(),
        },
        { transaction: t }
      );

      await this.logAudit("PHARMACY_STOCK_TRANSFER_CONFIRMED", transfer.id, receiverId, { destination_batch_id: destBatch.id }, t);

      await t.commit();
      return transfer.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * List inter-pharmacy stock transfers.
   */
  async listTransfers(pharmacyId) {
    const transfers = await db.PharmacyStockTransfer.findAll({
      where: {
        [db.Sequelize.Op.or]: [
          { source_pharmacy_id: pharmacyId },
          { destination_pharmacy_id: pharmacyId },
        ],
      },
      include: [
        { model: db.Pharmacy, as: "sourcePharmacy", attributes: ["pharmacy_id", "pharmacy_name"] },
        { model: db.Pharmacy, as: "destinationPharmacy", attributes: ["pharmacy_id", "pharmacy_name"] },
        { model: db.MedicationBatch, as: "batch", include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }] },
      ],
      order: [["created_at", "DESC"]],
    });

    return transfers.map((t) => t.get({ plain: true }));
  }
}

module.exports = new PharmacyTransferService();
