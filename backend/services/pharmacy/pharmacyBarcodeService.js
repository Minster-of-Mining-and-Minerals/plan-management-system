"use strict";

const db = require("../../models");

class PharmacyBarcodeService {
  /**
   * Verify barcode scan against medication batch, expiry date, and patient.
   */
  async verifyMedicationBarcode({ barcode_identifier, batch_id, patient_id }) {
    if (!barcode_identifier && !batch_id) {
      const err = new Error("barcode_identifier or batch_id is required for verification");
      err.status = 400;
      throw err;
    }

    const where = {};
    if (batch_id) where.id = batch_id;
    if (barcode_identifier) where.barcode_identifier = barcode_identifier;

    const batch = await db.MedicationBatch.findOne({
      where,
      include: [{ model: db.MedicationCatalog, as: "medicationCatalog" }],
    });

    if (!batch) {
      return {
        is_valid: false,
        status: "NOT_FOUND",
        message: "No matching medication stock batch found for scanned barcode",
      };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (batch.expiry_date <= todayStr) {
      return {
        is_valid: false,
        status: "EXPIRED",
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
        message: `⛔ BARCODE VERIFICATION FAILED: Scanned medication batch expired on ${batch.expiry_date}`,
      };
    }

    if (batch.status !== "ACTIVE" || batch.quantity_available <= 0) {
      return {
        is_valid: false,
        status: "UNAVAILABLE",
        batch_number: batch.batch_number,
        message: `⛔ BARCODE VERIFICATION FAILED: Stock batch status is '${batch.status}' (Qty: ${batch.quantity_available})`,
      };
    }

    let patientSnapshot = null;
    if (patient_id) {
      const patient = await db.User.findByPk(patient_id, {
        attributes: ["user_id", "full_name"],
      });
      patientSnapshot = patient ? patient.get({ plain: true }) : null;
    }

    return {
      is_valid: true,
      status: "VERIFIED",
      batch_id: batch.id,
      batch_number: batch.batch_number,
      barcode_identifier: batch.barcode_identifier || barcode_identifier,
      expiry_date: batch.expiry_date,
      medication_name: batch.medicationCatalog?.generic_name || "Medication Item",
      quantity_available: batch.quantity_available,
      patient: patientSnapshot,
      message: `✅ BARCODE VERIFIED: Matched batch #${batch.batch_number} (Exp: ${batch.expiry_date})`,
    };
  }
}

module.exports = new PharmacyBarcodeService();
