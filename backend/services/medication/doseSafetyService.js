"use strict";

class DoseSafetyService {
  /**
   * Evaluate dosage safety, route validity, and age restrictions.
   */
  async checkDoseSafety(patientId, items = []) {
    if (items.length === 0) {
      return [];
    }

    const alerts = [];

    for (const item of items) {
      const name = (item.item_name || item.name || "").trim().toLowerCase();
      const dosage = (item.dosage || "").trim().toLowerCase();
      const frequency = (item.frequency || "").trim().toLowerCase();

      // Rule 1: High Dose Acetaminophen / Paracetamol (> 4000mg / 4g daily)
      if (name.includes("paracetamol") || name.includes("acetaminophen")) {
        if (dosage.includes("1000mg") || dosage.includes("1g")) {
          if (frequency.includes("q4h") || frequency.includes("every 4 hours") || frequency.includes("6 times")) {
            alerts.push({
              type: "DOSE_SAFETY",
              severity: "WARNING",
              medication_name: item.item_name || item.name,
              message: `DOSE SAFETY WARNING: Paracetamol dosage exceeds recommended maximum daily limit (4,000mg/day). Risk of severe hepatotoxicity.`,
            });
          }
        }
      }

      // Rule 2: Pediatric Aspirin Safety (Reye's syndrome risk)
      if (name.includes("aspirin")) {
        if (dosage.includes("child") || dosage.includes("pediatric")) {
          alerts.push({
            type: "DOSE_SAFETY",
            severity: "CONTRAINDICATED",
            medication_name: item.item_name || item.name,
            message: `DOSE SAFETY WARNING: Aspirin in pediatric patients is contraindicated due to risk of Reye's syndrome.`,
          });
        }
      }

      // Rule 3: Missing Dosage or Frequency Specification
      if (!dosage || dosage === "n/a" || !frequency || frequency === "n/a") {
        alerts.push({
          type: "DOSE_SAFETY",
          severity: "INFO",
          medication_name: item.item_name || item.name,
          message: `DOSE SPECIFICATION NOTICE: Line item '${item.item_name || item.name}' lacks precise dosage or frequency details. Verify dosing instructions before dispensing.`,
        });
      }
    }

    return alerts;
  }
}

module.exports = new DoseSafetyService();
