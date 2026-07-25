"use strict";

const db = require("../../models");

/**
 * Cross-reactivity mapping for common drug allergen groups.
 */
const ALLERGEN_CROSS_REACTIVITY = {
  penicillin: [
    "penicillin",
    "amoxicillin",
    "ampicillin",
    "augmentin",
    "cloxacillin",
    "piperacillin",
    "amoxicillin-clavulanate",
  ],
  sulfa: [
    "sulfa",
    "sulfamethoxazole",
    "bactrim",
    "sulfasalazine",
    "co-trimoxazole",
  ],
  nsaid: [
    "nsaid",
    "aspirin",
    "ibuprofen",
    "naproxen",
    "diclofenac",
    "ketorolac",
    "indomethacin",
  ],
  codeine: ["codeine", "morphine", "oxycodone", "hydrocodone"],
};

class MedicationAllergyChecker {
  /**
   * Evaluate drug-allergy safety for a patient against proposed medication items.
   */
  async checkAllergies(patientId, items = []) {
    if (!patientId || items.length === 0) {
      return [];
    }

    const patientAllergies = await db.PatientAllergy.findAll({
      where: { patient_id: patientId },
    });

    if (!patientAllergies || patientAllergies.length === 0) {
      return [];
    }

    const alerts = [];

    for (const item of items) {
      const medName = (item.item_name || item.name || "").trim().toLowerCase();
      if (!medName) continue;

      for (const allergy of patientAllergies) {
        const allergen = (allergy.allergen || "").trim().toLowerCase();
        if (!allergen) continue;

        let isMatch = false;
        let matchReason = "";

        // Direct string match or substring match
        if (medName.includes(allergen) || allergen.includes(medName)) {
          isMatch = true;
          matchReason = `Direct match with recorded patient allergy '${allergy.allergen}'`;
        } else {
          // Check allergen cross reactivity group
          const groupKeys = Object.keys(ALLERGEN_CROSS_REACTIVITY);
          for (const groupKey of groupKeys) {
            if (allergen.includes(groupKey)) {
              const members = ALLERGEN_CROSS_REACTIVITY[groupKey];
              if (members.some((m) => medName.includes(m))) {
                isMatch = true;
                matchReason = `Cross-reactivity with recorded allergy group '${allergy.allergen}' (${groupKey.toUpperCase()} family)`;
                break;
              }
            }
          }
        }

        if (isMatch) {
          const alertSeverity =
            allergy.severity === "HIGH" || allergy.severity === "SEVERE"
              ? "SEVERE"
              : allergy.severity === "CONTRAINDICATED"
              ? "CONTRAINDICATED"
              : "WARNING";

          alerts.push({
            type: "ALLERGY",
            severity: alertSeverity,
            medication_name: item.item_name || item.name,
            allergen: allergy.allergen,
            message: `CRITICAL ALLERGY ALERT: Prescribed medication '${item.item_name || item.name}' triggers patient allergy '${allergy.allergen}'. ${matchReason}. Reaction history: ${allergy.reaction || "None specified"}.`,
          });
        }
      }
    }

    return alerts;
  }
}

module.exports = new MedicationAllergyChecker();
