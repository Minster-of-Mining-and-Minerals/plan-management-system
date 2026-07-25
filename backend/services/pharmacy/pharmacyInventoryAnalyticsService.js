"use strict";

const { Op } = require("sequelize");
const db = require("../../models");

class PharmacyInventoryAnalyticsService {
  /**
   * Get comprehensive pharmacy inventory & financial metrics.
   */
  async getInventoryAnalytics(pharmacyId) {
    const batches = await db.MedicationBatch.findAll({
      where: { pharmacy_id: pharmacyId },
      include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }],
    });

    let totalMedications = 0;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let expiredCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    for (const b of batches) {
      totalMedications += b.quantity_available;
      totalStockValue += (b.quantity_available * parseFloat(b.selling_price || b.unit_cost || 0));

      if (b.quantity_available <= 10 && b.status === "ACTIVE") {
        lowStockCount++;
      }

      if (b.expiry_date <= todayStr || b.status === "EXPIRED" || b.status === "QUARANTINED") {
        expiredCount++;
      }
    }

    const txns = await db.PharmacyStockTransaction.findAll({
      where: {
        pharmacy_id: pharmacyId,
        transaction_type: "DISPENSED",
      },
    });

    const dispensingVolume = txns.length;

    return {
      pharmacy_id: pharmacyId,
      total_batches: batches.length,
      total_medications_quantity: totalMedications,
      total_stock_value: Math.round(totalStockValue * 100) / 100,
      low_stock_items: lowStockCount,
      expired_or_quarantined_items: expiredCount,
      total_dispensing_transactions: dispensingVolume,
    };
  }
}

module.exports = new PharmacyInventoryAnalyticsService();
