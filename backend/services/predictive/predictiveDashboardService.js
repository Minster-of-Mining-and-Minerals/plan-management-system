"use strict";

const predictiveOperationsEngine = require("./predictiveOperationsEngine");
const clinicalOperationalRiskService = require("./clinicalOperationalRiskService");
const clinicalRecommendationService = require("../capacity/clinicalRecommendationService");
const predictiveAnalyticsService = require("./predictiveAnalyticsService");
const auditService = require("../auditService");

class PredictiveDashboardService {
  /**
   * Executive Predictive Health Dashboard aggregator.
   */
  async getPredictiveDashboard(userId = null) {
    if (userId) {
      await auditService.logAudit({
        actorUserId: userId,
        action: "operations:prediction_view",
        resourceType: "OPERATIONS",
        details: { scope: "PREDICTIVE_EXECUTIVE_DASHBOARD" },
      });
    }

    const predictions = await predictiveOperationsEngine.generatePredictions();
    const riskScores = await clinicalOperationalRiskService.getOperationalRiskScores();
    const recommendations = await clinicalRecommendationService.getPredictiveRecommendations();
    const analytics = await predictiveAnalyticsService.getPredictiveAnalytics();

    const highRiskCount = riskScores.filter((r) => r.risk_level === "HIGH" || r.risk_level === "CRITICAL").length;
    const futureRiskScore = Math.min(100, Math.max(10, highRiskCount * 25 + 15));

    return {
      hospital_future_risk_score: futureRiskScore,
      next_24h_predictions: predictions,
      high_risk_departments: riskScores.filter((r) => r.risk_level === "HIGH").map((r) => r.department),
      expected_sla_breaches_count: predictions.filter((p) => p.prediction_type === "SLA_BREACH" && p.risk_level === "HIGH").length,
      predicted_workload_trend: "+12% peak surge between 14:00 - 17:00",
      recommended_interventions: recommendations,
      prediction_accuracy_pct: analytics.prediction_accuracy_pct,
      prevented_incidents_count: analytics.prevented_incidents_count,
    };
  }

  /**
   * Department Prediction Panel data aggregator.
   */
  async getDepartmentPredictions(departmentId = "RADIOLOGY") {
    const predictions = await predictiveOperationsEngine.generatePredictions();
    const riskScores = await clinicalOperationalRiskService.getOperationalRiskScores();
    const recommendations = await clinicalRecommendationService.getPredictiveRecommendations();

    const deptPredictions = predictions.filter((p) => p.department === departmentId || p.domain === departmentId);
    const deptRisk = riskScores.find((r) => r.department === departmentId) || { risk_score: 20, risk_level: "LOW", factors: ["Normal throughput"] };
    const deptRecs = recommendations.filter((r) => r.affected_department === departmentId);

    return {
      department: departmentId,
      current_status: deptRisk.risk_level === "HIGH" ? "CONGESTED" : "OPTIMAL",
      future_risk: deptRisk,
      predictions: deptPredictions,
      recommended_actions: deptRecs,
    };
  }
}

module.exports = new PredictiveDashboardService();
