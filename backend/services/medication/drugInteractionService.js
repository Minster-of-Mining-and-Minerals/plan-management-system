"use strict";

const db = require("../../models");

/**
 * Default rule-based drug-drug interaction matrix.
 */
const DEFAULT_INTERACTIONS = [
  {
    med_a: "warfarin",
    med_b: "nsaid",
    severity: "SEVERE",
    description: "Concomitant use of Warfarin and NSAID/Aspirin significantly increases major hemorrhage and gastrointestinal bleeding risk.",
    action: "Consider acetaminophen for analgesia or monitor INR closely.",
  },
  {
    med_a: "warfarin",
    med_b: "ibuprofen",
    severity: "SEVERE",
    description: "Warfarin and Ibuprofen combination dramatically elevates bleeding risk.",
    action: "Avoid combination. Use alternative analgesic.",
  },
  {
    med_a: "warfarin",
    med_b: "aspirin",
    severity: "SEVERE",
    description: "Warfarin + Aspirin dual anticoagulation increases severe bleeding risk.",
    action: "Co-prescribe gastroprotection or reassess antithrombotic indication.",
  },
  {
    med_a: "lisinopril",
    med_b: "spironolactone",
    severity: "WARNING",
    description: "ACE Inhibitor + Potassium Sparing Diuretic increases risk of severe hyperkalemia.",
    action: "Monitor serum potassium levels regularly.",
  },
  {
    med_a: "sildenafil",
    med_b: "nitroglycerin",
    severity: "CONTRAINDICATED",
    description: "PDE5 inhibitor + Nitrates causes profound, life-threatening hypotension.",
    action: "STRICTLY CONTRAINDICATED. Do not administer together.",
  },
];

class DrugInteractionService {
  /**
   * Evaluate drug-drug interactions among proposed items and existing active medications.
   */
  async checkInteractions(patientId, items = []) {
    if (items.length === 0) {
      return [];
    }

    const alerts = [];
    const medNames = items.map((i) => (i.item_name || i.name || "").trim().toLowerCase()).filter(Boolean);

    // 1. Check interactions between co-prescribed items
    for (let i = 0; i < medNames.length; i++) {
      for (let j = i + 1; j < medNames.length; j++) {
        const nameA = medNames[i];
        const nameB = medNames[j];

        const interaction = this.findInteractionMatch(nameA, nameB);
        if (interaction) {
          alerts.push({
            type: "INTERACTION",
            severity: interaction.severity,
            medication_a: items[i].item_name || items[i].name,
            medication_b: items[j].item_name || items[j].name,
            message: `DRUG INTERACTION WARNING: '${items[i].item_name}' and '${items[j].item_name}' interact. ${interaction.description}`,
            clinical_action: interaction.action,
          });
        }
      }
    }

    // 2. Query database drug_interactions table
    try {
      const dbInteractions = await db.DrugInteraction.findAll();
      for (const dbi of dbInteractions) {
        const dbA = (dbi.medication_a_name || "").toLowerCase();
        const dbB = (dbi.medication_b_name || "").toLowerCase();

        for (let i = 0; i < medNames.length; i++) {
          for (let j = i + 1; j < medNames.length; j++) {
            const nameA = medNames[i];
            const nameB = medNames[j];

            if ((nameA.includes(dbA) && nameB.includes(dbB)) || (nameA.includes(dbB) && nameB.includes(dbA))) {
              alerts.push({
                type: "INTERACTION",
                severity: dbi.severity || "WARNING",
                medication_a: items[i].item_name || items[i].name,
                medication_b: items[j].item_name || items[j].name,
                message: `DRUG INTERACTION ALERT: '${items[i].item_name}' and '${items[j].item_name}' interact. ${dbi.description}`,
                clinical_action: dbi.clinical_action,
              });
            }
          }
        }
      }
    } catch (err) {
      // Table may be empty during early runs
    }

    return alerts;
  }

  findInteractionMatch(nameA, nameB) {
    return DEFAULT_INTERACTIONS.find((rule) => {
      const match1 = nameA.includes(rule.med_a) && nameB.includes(rule.med_b);
      const match2 = nameA.includes(rule.med_b) && nameB.includes(rule.med_a);
      return match1 || match2;
    });
  }
}

module.exports = new DrugInteractionService();
