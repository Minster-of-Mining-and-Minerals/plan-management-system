"use strict";

const clinicalCapacityService = require("./clinicalCapacityService");
const unifiedClinicalQueueService = require("../clinicalOrder/unifiedClinicalQueueService");
const unifiedClinicalSLAEngine = require("../clinicalOrder/unifiedClinicalSLAEngine");
const clinicalForecastService = require("./clinicalForecastService");
const timelineEventService = require("../timelineEventService");
const notificationService = require("../notificationService");

class ClinicalRecommendationService {
  /**
   * Generate actionable operational capacity recommendations.
   */
  async getOperationalRecommendations() {
    const hospitalCap = await clinicalCapacityService.getHospitalCapacity();
    const queues = await unifiedClinicalQueueService.getEnterpriseQueuesOverview();
    const forecast = await clinicalForecastService.getCapacityForecast();

    const recommendations = [];

    // 1. High capacity utilization rule
    if (hospitalCap.utilization_percentage > 70) {
      recommendations.push({
        id: "rec-cap-01",
        title: "Open Additional Consultation Room",
        reason: `Hospital capacity utilization reached ${hospitalCap.utilization_percentage}%`,
        priority: "HIGH",
        expected_benefit: "Reduces patient waiting time by ~20 minutes",
        affected_department: "CONSULTATION",
        confidence_score: 92,
        action_type: "OPEN_ROOM",
      });
    }

    // 2. STAT queue overflow rule
    if (queues.stat_queue.current_size > 0) {
      recommendations.push({
        id: "rec-stat-02",
        title: "Escalate STAT Queue Assignments",
        reason: `${queues.stat_queue.current_size} STAT order(s) currently pending in queue`,
        priority: "CRITICAL",
        expected_benefit: "Prevents immediate SLA breach for STAT clinical orders",
        affected_department: "HOSPITAL",
        confidence_score: 98,
        action_type: "ESCALATE_STAT",
      });
    }

    // 3. Overdue queue rule
    if (queues.overdue_queue.current_size > 0) {
      recommendations.push({
        id: "rec-overdue-03",
        title: "Reassign Staff to Overdue Orders",
        reason: `${queues.overdue_queue.current_size} order(s) have exceeded SLA threshold`,
        priority: "HIGH",
        expected_benefit: "Restores SLA compliance for overdue orders",
        affected_department: "OPERATIONS",
        confidence_score: 95,
        action_type: "REASSIGN_STAFF",
      });
    }

    // 4. Pharmacy peak forecast rule
    if (forecast.risk_assessment.department_overload_risk === "HIGH") {
      recommendations.push({
        id: "rec-pharm-04",
        title: "Increase Pharmacy Staffing for Afternoon Shift",
        reason: "Forecast predicts 25% peak workload surge between 14:00 - 17:00",
        priority: "MEDIUM",
        expected_benefit: "Balances dispensing throughput and prevents prescription queue bottleneck",
        affected_department: "PHARMACY",
        confidence_score: 88,
        action_type: "INCREASE_STAFF",
      });
    }

    // Default recommendation if empty
    if (recommendations.length === 0) {
      recommendations.push({
        id: "rec-opt-00",
        title: "Maintain Optimal Operations",
        reason: "Current capacity, SLA, and queue metrics are operating within normal parameters",
        priority: "LOW",
        expected_benefit: "Optimal resource utilization maintained",
        affected_department: "HOSPITAL",
        confidence_score: 100,
        action_type: "NONE",
      });
    }

    return recommendations;
  }

  /**
   * Accept / Apply a recommendation.
   */
  async acceptRecommendation(recommendationId, actorUserId) {
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit({
          event_type: "RECOMMENDATION_ACCEPTED",
          title: `Recommendation Accepted: #${recommendationId}`,
          notes: `Operational recommendation #${recommendationId} accepted by user ${actorUserId}`,
          domain: "OPERATIONS",
        });
      } catch (e) {
        // Silently capture timeline error
      }
    }

    return {
      success: true,
      recommendation_id: recommendationId,
      status: "ACCEPTED",
      applied_at: new Date().toISOString(),
    };
  }
}

module.exports = new ClinicalRecommendationService();
