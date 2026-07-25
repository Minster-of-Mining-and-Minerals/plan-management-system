"use strict";

const db = require("../../models");

class PatientRiskAssessmentService {
  /**
   * Compute multi-dimensional risk score for a patient.
   * Returns: medication_risk (0-100), disease_risk (0-100), followup_risk (0-100), overall risk_level
   */
  async computeRiskScore(patientId) {
    if (!patientId) throw Object.assign(new Error("patientId is required"), { status: 400 });

    const [
      allergyCount,
      activeMedicationCount,
      openAlertCount,
      criticalAlertCount,
      highSeverityProblemCount,
      unresolvedAmendmentCount,
    ] = await Promise.all([
      this._countAllergies(patientId),
      this._countActiveMedications(patientId),
      this._countOpenAlerts(patientId),
      this._countCriticalOpenAlerts(patientId),
      this._countHighSeverityProblems(patientId),
      this._countUnresolvedAmendments(patientId),
    ]);

    // Medication Risk: allergies + active meds + medication alerts
    let medicationRisk = 0;
    medicationRisk += Math.min(allergyCount * 15, 30);
    medicationRisk += Math.min(activeMedicationCount * 5, 30);
    medicationRisk += Math.min(openAlertCount * 10, 25);
    medicationRisk += Math.min(criticalAlertCount * 15, 15);
    medicationRisk = Math.min(medicationRisk, 100);

    // Disease Risk: active problems + unresolved amendments
    let diseaseRisk = 0;
    diseaseRisk += Math.min(highSeverityProblemCount * 20, 60);
    diseaseRisk += Math.min(openAlertCount * 5, 20);
    diseaseRisk += Math.min(unresolvedAmendmentCount * 10, 20);
    diseaseRisk = Math.min(diseaseRisk, 100);

    // Follow-up Risk: open alerts + high severity problems
    let followupRisk = 0;
    followupRisk += Math.min(openAlertCount * 12, 50);
    followupRisk += Math.min(highSeverityProblemCount * 15, 35);
    followupRisk += Math.min(criticalAlertCount * 15, 15);
    followupRisk = Math.min(followupRisk, 100);

    const overall = Math.round((medicationRisk + diseaseRisk + followupRisk) / 3);
    const risk_level = overall >= 75 ? "CRITICAL" : overall >= 50 ? "HIGH" : overall >= 25 ? "MEDIUM" : "LOW";

    return {
      patient_id: patientId,
      assessed_at: new Date().toISOString(),
      medication_risk: medicationRisk,
      disease_risk: diseaseRisk,
      followup_risk: followupRisk,
      overall_risk_score: overall,
      risk_level,
      factors: {
        allergy_count: allergyCount,
        active_medication_count: activeMedicationCount,
        open_alert_count: openAlertCount,
        critical_alert_count: criticalAlertCount,
        high_severity_problem_count: highSeverityProblemCount,
        unresolved_amendment_count: unresolvedAmendmentCount,
      },
    };
  }

  async _countAllergies(patientId) {
    try { return await db.PatientAllergy.count({ where: { patient_id: patientId } }); } catch { return 0; }
  }

  async _countActiveMedications(patientId) {
    try { return await db.Prescription.count({ where: { patient_id: patientId, status: "active" } }); } catch { return 0; }
  }

  async _countOpenAlerts(patientId) {
    try { return await db.ClinicalAlert.count({ where: { patient_id: patientId, status: "OPEN" } }); } catch { return 0; }
  }

  async _countCriticalOpenAlerts(patientId) {
    try { return await db.ClinicalAlert.count({ where: { patient_id: patientId, status: "OPEN", severity: "CRITICAL" } }); } catch { return 0; }
  }

  async _countHighSeverityProblems(patientId) {
    try {
      const { Op } = require("sequelize");
      return await db.ClinicalProblem.count({ where: { patient_id: patientId, status: "ACTIVE", severity: { [Op.in]: ["HIGH", "CRITICAL"] } } });
    } catch { return 0; }
  }

  async _countUnresolvedAmendments(patientId) {
    try {
      const { Op } = require("sequelize");
      return await db.ClinicalAmendment.count({ where: { patient_id: patientId, status: { [Op.in]: ["REQUESTED", "UNDER_REVIEW"] } } });
    } catch { return 0; }
  }
}

module.exports = new PatientRiskAssessmentService();
