"use strict";

const db = require("../../models");

class DuplicateTherapyService {
  /**
   * Check for duplicate therapy within proposed prescription items or against active patient prescriptions.
   */
  async checkDuplicateTherapy(patientId, items = []) {
    if (items.length === 0) {
      return [];
    }

    const alerts = [];
    const seenNames = new Map();

    // 1. Check duplicate items within current prescription draft
    for (const item of items) {
      const name = (item.item_name || item.name || "").trim().toLowerCase();
      if (!name) continue;

      if (seenNames.has(name)) {
        alerts.push({
          type: "DUPLICATE_THERAPY",
          severity: "WARNING",
          medication_name: item.item_name || item.name,
          message: `DUPLICATE THERAPY ALERT: Multiple line items for '${item.item_name || item.name}' included in the same prescription.`,
        });
      } else {
        seenNames.set(name, true);
      }
    }

    // 2. Check active existing prescriptions for the patient
    if (patientId) {
      try {
        const activePrescriptions = await db.Prescription.findAll({
          where: {
            patient_id: patientId,
            status: ["issued", "active"],
          },
          include: [{ model: db.PrescriptionItem, as: "items" }],
        });

        for (const rx of activePrescriptions) {
          for (const activeItem of rx.items || []) {
            const activeName = (activeItem.item_name || "").trim().toLowerCase();
            if (!activeName) continue;

            for (const item of items) {
              const proposedName = (item.item_name || item.name || "").trim().toLowerCase();
              if (proposedName && (proposedName.includes(activeName) || activeName.includes(proposedName))) {
                alerts.push({
                  type: "DUPLICATE_THERAPY",
                  severity: "WARNING",
                  medication_name: item.item_name || item.name,
                  message: `DUPLICATE THERAPY ALERT: Patient is currently taking active prescription '${activeItem.item_name}'. Re-prescribing may cause accidental double-dosing.`,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Duplicate therapy active rx query warning:", err.message);
      }
    }

    return alerts;
  }
}

module.exports = new DuplicateTherapyService();
