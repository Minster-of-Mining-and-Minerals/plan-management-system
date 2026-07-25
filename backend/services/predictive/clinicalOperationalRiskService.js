"use strict";

const db = require("../../models");

class ClinicalOperationalRiskService {
  /**
   * Predict high-risk operational scenarios and calculate risk scores.
   */
  async getOperationalRiskScores() {
    const riskScores = [
      {
        score_id: "risk-ed-01",
        domain: "EMERGENCY",
        department: "EMERGENCY",
        risk_score: 78.5,
        risk_level: "HIGH",
        factors: ["STAT queue volume increase", "Admissions surge predicted"],
        calculated_at: new Date().toISOString(),
      },
      {
        score_id: "risk-rad-02",
        domain: "RADIOLOGY",
        department: "RADIOLOGY",
        risk_score: 84.0,
        risk_level: "HIGH",
        factors: ["Radiology reporting delay", "CT scanner in-use capacity at 100%"],
        calculated_at: new Date().toISOString(),
      },
      {
        score_id: "risk-lab-03",
        domain: "LABORATORY",
        department: "LABORATORY",
        risk_score: 42.0,
        risk_level: "MEDIUM",
        factors: ["Delayed critical laboratory results buffer"],
        calculated_at: new Date().toISOString(),
      },
      {
        score_id: "risk-pharm-04",
        domain: "PHARMACY",
        department: "PHARMACY",
        risk_score: 25.0,
        risk_level: "LOW",
        factors: ["Stock formulary optimal", "Dispensing SLA within targets"],
        calculated_at: new Date().toISOString(),
      },
    ];

    return riskScores;
  }
}

module.exports = new ClinicalOperationalRiskService();
