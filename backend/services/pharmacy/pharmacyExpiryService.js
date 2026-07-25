"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const db = require("../../models");
const auditService = require("../auditService");
const notificationService = require("../notificationService");

class PharmacyExpiryService {
  /**
   * Find batches expiring within specified days (default 90 days).
   */
  async findExpiringMedication(pharmacyId, daysAhead = 90) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(daysAhead, 10));

    const todayStr = today.toISOString().split("T")[0];
    const futureStr = futureDate.toISOString().split("T")[0];

    const batches = await db.MedicationBatch.findAll({
      where: {
        pharmacy_id: pharmacyId,
        status: "ACTIVE",
        expiry_date: {
          [Op.between]: [todayStr, futureStr],
        },
      },
      include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }],
      order: [["expiry_date", "ASC"]],
    });

    return batches.map((b) => b.get({ plain: true }));
  }

  /**
   * Quarantine expired batches and notify pharmacy manager.
   */
  async quarantineExpiredMedication(pharmacyId, actorId) {
    const todayStr = new Date().toISOString().split("T")[0];

    const expiredBatches = await db.MedicationBatch.findAll({
      where: {
        pharmacy_id: pharmacyId,
        status: "ACTIVE",
        expiry_date: {
          [Op.lte]: todayStr,
        },
      },
    });

    if (!expiredBatches || expiredBatches.length === 0) {
      return { quarantinedCount: 0, batches: [] };
    }

    const t = await db.sequelize.transaction();
    try {
      const quarantined = [];
      for (const batch of expiredBatches) {
        const qtyToQuarantine = batch.quantity_available;
        await batch.update(
          {
            status: "QUARANTINED",
            quantity_available: 0,
          },
          { transaction: t }
        );

        if (qtyToQuarantine > 0) {
          await db.PharmacyStockTransaction.create(
            {
              id: uuidv4(),
              pharmacy_id: pharmacyId,
              warehouse_id: batch.warehouse_id,
              medication_batch_id: batch.id,
              transaction_type: "EXPIRED",
              quantity: -qtyToQuarantine,
              reference_type: "EXPIRY_QUARANTINE",
              reference_id: batch.id,
              performed_by: actorId,
            },
            { transaction: t }
          );
        }

        quarantined.push(batch.get({ plain: true }));
      }

      if (notificationService && typeof notificationService.notifyPharmacyUsers === "function") {
        try {
          await notificationService.notifyPharmacyUsers(pharmacyId, {
            title: `⚠️ Expired Medication Quarantined`,
            message: `${quarantined.length} expired stock batches have been quarantined and removed from active inventory.`,
          });
        } catch (nErr) {
          console.error("Failed to notify pharmacy of expired stock:", nErr.message);
        }
      }

      await t.commit();
      return { quarantinedCount: quarantined.length, batches: quarantined };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
}

module.exports = new PharmacyExpiryService();
