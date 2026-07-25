"use strict";

const clinicalIncidentEngine = require("./clinicalIncidentEngine");
const incidentAnalyticsService = require("./incidentAnalyticsService");
const auditService = require("../auditService");

class ExecutiveIncidentDashboardService {
  /**
   * Executive Incident & Orchestration Dashboard aggregator.
   */
  async getExecutiveIncidentSummary(userId = null) {
    if (userId) {
      await auditService.logAudit({
        actorUserId: userId,
        action: "operations:incident_view",
        resourceType: "OPERATIONS",
        details: { scope: "EXECUTIVE_INCIDENT_SUMMARY" },
      });
    }

    const incidents = await clinicalIncidentEngine.getIncidents();
    const analytics = await incidentAnalyticsService.getIncidentAnalytics();

    const activeIncidents = incidents.filter((i) => i.status === "OPEN" || i.status === "ACKNOWLEDGED" || i.status === "IN_PROGRESS");
    const criticalIncidents = activeIncidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH");

    const healthScore = Math.max(100 - criticalIncidents.length * 15 - activeIncidents.length * 3, 50);

    return {
      active_incidents_count: activeIncidents.length,
      critical_incidents_count: criticalIncidents.length,
      mean_resolution_time_minutes: analytics.mean_resolution_time_minutes,
      automation_success_rate_pct: analytics.automation_effectiveness_pct,
      operational_health_score: healthScore,
      incident_trends: "-15% compared to last week",
      departments_at_risk: ["RADIOLOGY", "PHARMACY"],
      top_recurring_incidents: ["RADIOLOGY_BACKLOG", "SLA_BREACH"],
      active_incidents_list: activeIncidents.slice(0, 10),
    };
  }
}

module.exports = new ExecutiveIncidentDashboardService();
