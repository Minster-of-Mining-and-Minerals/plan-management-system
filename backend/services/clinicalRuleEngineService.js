"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { ClinicalRule, PatientAllergy } = db;

class ClinicalRuleEngineService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initializes the rule engine by seeding default rules if empty.
   */
  async ensureInitialized() {
    if (this.initialized) return;

    try {
      const count = await ClinicalRule.count();
      if (count === 0) {
        await this.seedDefaultRules();
      }
      this.initialized = true;
    } catch (e) {
      console.error("ClinicalRuleEngineService failed to initialize:", e.message);
    }
  }

  /**
   * Evaluate active clinical rules for a trigger event.
   * @param {string} triggerEvent - The clinical event trigger (e.g. PRESCRIPTION_CREATE, LAB_RESULT_SUBMIT, VITALS_CREATE)
   * @param {object} contextData - Context payload (e.g. patient_id, prescriptions array, vitals object, lab results)
   */
  async evaluateRules(triggerEvent, contextData) {
    await this.ensureInitialized();

    const rules = await ClinicalRule.findAll({
      where: {
        trigger_event: triggerEvent,
        is_enabled: true,
      },
    });

    const alerts = [];

    // Fetch patient allergies if prescribing and not already provided
    let allergies = contextData.allergies || [];
    if (triggerEvent === "PRESCRIPTION_CREATE" && contextData.patient_id && !contextData.allergies) {
      allergies = await PatientAllergy.findAll({
        where: { patient_id: contextData.patient_id },
      });
    }

    for (const rule of rules) {
      try {
        if (rule.name === "Drug-Allergy Alert") {
          const prescriptions = contextData.prescriptions || [];
          for (const rx of prescriptions) {
            const rxName = String(rx.drug_name || rx.name).toLowerCase();
            const matched = allergies.find((a) =>
              rxName.includes(String(a.allergen).toLowerCase())
            );
            if (matched) {
              alerts.push({
                rule_id: rule.rule_id,
                rule_name: rule.name,
                severity: rule.severity || "CRITICAL",
                message: `Allergy Warning: Patient is allergic to ${matched.allergen}. Reaction: ${matched.reaction || "unknown"}. Prescribed drug: ${rx.drug_name || rx.name}.`,
              });
            }
          }
        }

        if (rule.name === "Drug-Drug Interaction Alert") {
          const prescriptions = contextData.prescriptions || [];
          const drugNames = prescriptions.map((rx) => String(rx.drug_name || rx.name).toLowerCase());
          
          // Seeded mock interaction database
          const interactions = [
            { drugA: "warfarin", drugB: "ibuprofen", severity: "CRITICAL", msg: "Warfarin and Ibuprofen co-administration increases bleeding risk." },
            { drugA: "aspirin", drugB: "clopidogrel", severity: "WARNING", msg: "Aspirin and Clopidogrel combination increases risk of gastrointestinal hemorrhage." },
            { drugA: "lisinopril", drugB: "spironolactone", severity: "WARNING", msg: "Lisinopril and Spironolactone co-administration may cause severe hyperkalemia." },
          ];

          for (const inter of interactions) {
            const hasA = drugNames.some((n) => n.includes(inter.drugA));
            const hasB = drugNames.some((n) => n.includes(inter.drugB));
            if (hasA && hasB) {
              alerts.push({
                rule_id: rule.rule_id,
                rule_name: rule.name,
                severity: inter.severity,
                message: `Drug Interaction: ${inter.msg}`,
              });
            }
          }
        }

        if (rule.name === "Duplicate Medication Alert") {
          const prescriptions = contextData.prescriptions || [];
          const drugNames = prescriptions.map((rx) => String(rx.drug_name || rx.name).toLowerCase().trim());
          
          // Check duplicates inside the current cart/order list
          const duplicates = drugNames.filter((item, index) => drugNames.indexOf(item) !== index);
          for (const dup of duplicates) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "WARNING",
              message: `Duplicate Medication: ${dup.toUpperCase()} is prescribed multiple times in this order.`,
            });
          }

          // Check against active/existing prescriptions if patient_id is present
          if (contextData.patient_id) {
            try {
              const activeRx = await db.PrescriptionItem.findAll({
                include: [
                  {
                    model: db.Prescription,
                    as: "prescription",
                    where: { patient_id: contextData.patient_id, status: "active" },
                  },
                ],
              });

              for (const rx of prescriptions) {
                const rxName = String(rx.drug_name || rx.name || "").toLowerCase().trim();
                const alreadyActive = activeRx.some((a) => {
                  const plainA = a.get ? a.get({ plain: true }) : a;
                  const val = plainA.item_name || plainA.drug_name || "";
                  return String(val).toLowerCase().trim().includes(rxName);
                });
                if (alreadyActive) {
                  alerts.push({
                    rule_id: rule.rule_id,
                    rule_name: rule.name,
                    severity: "WARNING",
                    message: `Duplicate Medication Alert: Patient is already taking an active prescription for ${rx.drug_name || rx.name}.`,
                  });
                }
              }
            } catch (err) {
              // Safely handle unmigrated test DB tables
            }
          }
        }

        if (rule.name === "Abnormal Lab Value Flag") {
          const results = contextData.lab_results || []; // e.g. [ { test_name: "Hemoglobin", value: 9.5, min: 12.0, max: 16.0, unit: "g/dL" } ]
          for (const res of results) {
            const val = parseFloat(res.value);
            if (isNaN(val)) continue;
            if ((res.min !== undefined && val < res.min) || (res.max !== undefined && val > res.max)) {
              alerts.push({
                rule_id: rule.rule_id,
                rule_name: rule.name,
                severity: rule.severity || "WARNING",
                message: `Abnormal Lab Value: ${res.test_name} is ${res.value} ${res.unit || ""} (Normal range: ${res.min}-${res.max}).`,
              });
            }
          }
        }

        if (rule.name === "Abnormal Vitals Warning") {
          const vitals = contextData.vitals || {}; // e.g. { systolic, diastolic, oxygen_saturation }
          const sys = parseFloat(vitals.systolic || vitals.blood_pressure_sys);
          const dia = parseFloat(vitals.diastolic || vitals.blood_pressure_dia);
          const o2 = parseFloat(vitals.oxygen_saturation || vitals.o2_sat);

          if (sys > 140 || dia > 90) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: "WARNING",
              message: `High Blood Pressure Alert: BP is recorded as ${vitals.systolic || vitals.blood_pressure_sys}/${vitals.diastolic || vitals.blood_pressure_dia} mmHg.`,
            });
          }
          if (o2 && o2 < 90) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: "CRITICAL",
              message: `Critical Oxygen Alert: O2 Saturation is dangerously low at ${o2}%.`,
            });
          }
        }

        // Encounter Completion specific rules
        if (triggerEvent === "ENCOUNTER_COMPLETE") {
          if (rule.name === "Active Task Blocking" && contextData.has_pending_tasks) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "CRITICAL",
              message: `Cannot complete encounter: There are incomplete workflow tasks assigned.`,
              resolutionHint: "Resolve or cancel all pending workflow tasks first."
            });
          }

          if (rule.name === "Pending Orders Warning") {
            const hasPendingLab = contextData.has_pending_lab;
            const hasPendingPharmacy = contextData.has_pending_pharmacy;
            
            if (hasPendingLab) {
              alerts.push({
                rule_id: rule.rule_id,
                rule_name: rule.name,
                severity: rule.severity || "WARNING",
                message: `Patient has pending laboratory orders.`,
                resolutionHint: "Ensure patient visits the lab before leaving."
              });
            }
            if (hasPendingPharmacy) {
              alerts.push({
                rule_id: rule.rule_id,
                rule_name: rule.name,
                severity: rule.severity || "WARNING",
                message: `Patient has unfulfilled pharmacy prescriptions.`,
                resolutionHint: "Ensure patient collects medications before leaving."
              });
            }
          }

          if (rule.name === "Unpaid Balance Warning" && contextData.has_unpaid_balance) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "WARNING",
              message: `Patient has an unpaid balance.`,
              resolutionHint: "Direct patient to cashier."
            });
          }
          
          if (rule.name === "Missing Diagnosis" && !contextData.has_diagnosis) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "WARNING",
              message: `No diagnosis recorded for this encounter.`,
              resolutionHint: "Consider adding a diagnosis before completion."
            });
          }

          if (rule.name === "Missing Follow-up Recommendation" && contextData.follow_up_required && !contextData.has_follow_up_record) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "WARNING",
              message: `Follow-up is marked as required but no follow-up recommendation exists.`,
              resolutionHint: "Create a follow-up recommendation or override this warning."
            });
          }

          // Phase 2.4.4 - Follow-up Outcome Required
          if (rule.name === "Follow-up Outcome Required" && contextData.is_follow_up && !contextData.has_follow_up_outcome) {
            alerts.push({
              rule_id: rule.rule_id,
              rule_name: rule.name,
              severity: rule.severity || "WARNING",
              message: `This is a follow-up encounter but the clinical outcome has not been recorded.`,
              resolutionHint: "Record the follow-up outcome before completing the encounter."
            });
          }
        }
      } catch (err) {
        console.error(`Error executing rule ${rule.name}:`, err.message);
      }
    }

    return alerts;
  }

  /**
   * Seed standard clinical rules.
   */
  async seedDefaultRules() {
    const defaultRules = [
      {
        rule_id: uuidv4(),
        name: "Drug-Allergy Alert",
        trigger_event: "PRESCRIPTION_CREATE",
        conditions: { check: "allergy_matches" },
        severity: "CRITICAL",
        action: { display_alert: true, block_ordering: false },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Drug-Drug Interaction Alert",
        trigger_event: "PRESCRIPTION_CREATE",
        conditions: { check: "interaction_lookup" },
        severity: "CRITICAL",
        action: { display_alert: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Duplicate Medication Alert",
        trigger_event: "PRESCRIPTION_CREATE",
        conditions: { check: "duplicate_lookup" },
        severity: "WARNING",
        action: { display_alert: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Abnormal Lab Value Flag",
        trigger_event: "LAB_RESULT_SUBMIT",
        conditions: { check: "range_check" },
        severity: "WARNING",
        action: { display_badge: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Abnormal Vitals Warning",
        trigger_event: "VITALS_CREATE",
        conditions: { check: "vitals_threshold" },
        severity: "WARNING",
        action: { display_alert: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Active Task Blocking",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "pending_tasks" },
        severity: "CRITICAL", // Blocking
        action: { block_completion: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Pending Orders Warning",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "pending_orders" },
        severity: "WARNING",
        action: { display_warning: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Unpaid Balance Warning",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "unpaid_balance" },
        severity: "WARNING",
        action: { display_warning: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Missing Diagnosis",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "has_diagnosis" },
        severity: "WARNING",
        action: { display_warning: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Missing Follow-up Recommendation",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "follow_up_required_and_missing" },
        severity: "WARNING",
        action: { display_warning: true },
        is_enabled: true,
      },
      {
        rule_id: uuidv4(),
        name: "Follow-up Outcome Required",
        trigger_event: "ENCOUNTER_COMPLETE",
        conditions: { check: "follow_up_outcome_missing" },
        severity: "WARNING",
        action: { display_warning: true },
        is_enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      await ClinicalRule.findOrCreate({
        where: { name: rule.name },
        defaults: rule,
      });
    }
  }
}

module.exports = new ClinicalRuleEngineService();
