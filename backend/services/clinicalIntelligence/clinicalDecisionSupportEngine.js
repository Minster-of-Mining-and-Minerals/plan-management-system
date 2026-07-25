"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalPatientContextService = require("./clinicalPatientContextService");
const clinicalAlertService = require("./clinicalAlertService");

class ClinicalDecisionSupportEngine {
  /**
   * Run multi-domain clinical decision support evaluation for a patient.
   * Returns list of generated alerts and recommendations.
   */
  async evaluatePatientContext(patientId, actorId = null) {
    if (!patientId) throw Object.assign(new Error("patientId is required"), { status: 400 });

    const snapshot = await clinicalPatientContextService.getPatientSnapshot(patientId);
    const alerts = [];

    // 1. Drug-Allergy cross-check
    const allergyAlerts = this._checkDrugAllergies(snapshot.allergies, snapshot.active_medications);
    alerts.push(...allergyAlerts);

    // 2. Abnormal lab result flags
    const labAlerts = this._checkAbnormalLabResults(snapshot.recent_lab_results);
    alerts.push(...labAlerts);

    // 3. High-severity problem with no recent lab investigation
    const problemAlerts = this._checkUnreviewedHighSeverityProblems(snapshot.active_problems, snapshot.recent_lab_results);
    alerts.push(...problemAlerts);

    // 4. Radiology critical impression detection
    const radAlerts = this._checkRadiologyCriticalFindings(snapshot.recent_radiology_reports);
    alerts.push(...radAlerts);

    // Persist new alerts
    const persisted = [];
    for (const alert of alerts) {
      try {
        const existing = await db.ClinicalAlert.findOne({
          where: {
            patient_id: patientId,
            alert_type: alert.alert_type,
            status: "OPEN",
            message: alert.message,
          },
        });
        if (!existing) {
          const created = await clinicalAlertService.createAlert({
            patient_id: patientId,
            alert_type: alert.alert_type,
            domain: alert.domain || "GENERAL",
            severity: alert.severity || "WARNING",
            message: alert.message,
            recommendation: alert.recommendation || null,
            source_entity_type: alert.source_entity_type || null,
            source_entity_id: alert.source_entity_id || null,
            metadata_json: alert.metadata || {},
            created_by: actorId || null,
          });
          persisted.push(created);
        }
      } catch (err) {
        console.error("Failed to persist clinical alert:", err.message);
      }
    }

    return {
      patient_id: patientId,
      evaluated_at: new Date().toISOString(),
      alerts_generated: alerts.length,
      alerts_persisted: persisted.length,
      alert_details: alerts,
    };
  }

  _checkDrugAllergies(allergies = [], activeMedications = []) {
    const alerts = [];
    const allergenList = allergies.map((a) => String(a.allergen).toLowerCase());
    for (const rx of activeMedications) {
      const items = rx.items || [];
      for (const item of items) {
        const drugName = String(item.drug_name || item.item_name || "").toLowerCase();
        const matched = allergenList.find((allergen) => drugName.includes(allergen));
        if (matched) {
          alerts.push({
            alert_type: "DRUG_ALLERGY",
            domain: "PHARMACY",
            severity: "CRITICAL",
            message: `Drug-Allergy Alert: Patient is allergic to "${matched}" but has an active prescription for "${item.drug_name || item.item_name}".`,
            recommendation: `Immediately review and substitute ${item.drug_name || item.item_name} with a clinically appropriate alternative.`,
          });
        }
      }
    }
    return alerts;
  }

  _checkAbnormalLabResults(labResults = []) {
    const alerts = [];
    for (const obs of labResults) {
      const val = parseFloat(obs.value);
      if (isNaN(val)) continue;
      const low = parseFloat(obs.reference_range_low);
      const high = parseFloat(obs.reference_range_high);
      if ((!isNaN(low) && val < low) || (!isNaN(high) && val > high)) {
        alerts.push({
          alert_type: "ABNORMAL_LAB",
          domain: "LABORATORY",
          severity: obs.is_critical ? "CRITICAL" : "WARNING",
          message: `Abnormal Lab Result: ${obs.observation_name || obs.observation_code} = ${val} ${obs.unit || ""} (Reference: ${obs.reference_range_low || "?"} – ${obs.reference_range_high || "?"}).`,
          recommendation: `Review ${obs.observation_name} result with attending physician and consider clinical intervention.`,
          source_entity_type: "LaboratoryObservation",
          source_entity_id: obs.id || null,
        });
      }
    }
    return alerts;
  }

  _checkUnreviewedHighSeverityProblems(activeProblems = [], labResults = []) {
    const alerts = [];
    const highSeverityProblems = activeProblems.filter(
      (p) => p.severity === "HIGH" || p.severity === "CRITICAL"
    );
    if (highSeverityProblems.length > 0 && labResults.length === 0) {
      for (const problem of highSeverityProblems) {
        alerts.push({
          alert_type: "FOLLOW_UP",
          domain: "GENERAL",
          severity: "WARNING",
          message: `Clinical Follow-up Required: Patient has active ${problem.severity} severity problem "${problem.problem_name}" with no recent laboratory investigations on record.`,
          recommendation: `Order appropriate laboratory investigations for monitoring of "${problem.problem_name}".`,
          source_entity_type: "ClinicalProblem",
          source_entity_id: problem.problem_id || null,
        });
      }
    }
    return alerts;
  }

  _checkRadiologyCriticalFindings(reports = []) {
    const alerts = [];
    const criticalKeywords = ["mass", "malignancy", "fracture", "hemorrhage", "infarction", "embolism", "critical", "urgent"];
    for (const report of reports) {
      const impression = String(report.impression || "").toLowerCase();
      const findings = String(report.findings || "").toLowerCase();
      const combinedText = `${impression} ${findings}`;
      const matchedKeyword = criticalKeywords.find((kw) => combinedText.includes(kw));
      if (matchedKeyword) {
        alerts.push({
          alert_type: "RADIOLOGY_FINDING",
          domain: "RADIOLOGY",
          severity: "CRITICAL",
          message: `Critical Radiology Finding: Report for study "${report.study_id}" contains potential critical finding — keyword detected: "${matchedKeyword}".`,
          recommendation: "Immediate clinical review of radiology report and patient assessment required.",
          source_entity_type: "RadiologyReport",
          source_entity_id: report.report_id || null,
        });
      }
    }
    return alerts;
  }
}

module.exports = new ClinicalDecisionSupportEngine();
