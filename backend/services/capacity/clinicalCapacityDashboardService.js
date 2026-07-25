"use strict";

const clinicalCapacityService = require("./clinicalCapacityService");
const clinicalForecastService = require("./clinicalForecastService");
const clinicalRecommendationService = require("./clinicalRecommendationService");
const auditService = require("../auditService");

class ClinicalCapacityDashboardService {
  /**
   * Executive Capacity Dashboard aggregator.
   */
  async getExecutiveCapacityDashboard(userId) {
    if (userId) {
      await auditService.logAudit({
        actorUserId: userId,
        action: "operations:capacity_view",
        resourceType: "OPERATIONS",
        details: { scope: "EXECUTIVE_CAPACITY" },
      });
    }

    const hospitalCap = await clinicalCapacityService.getHospitalCapacity();
    const labCap = await clinicalCapacityService.getDepartmentCapacity("LABORATORY");
    const radCap = await clinicalCapacityService.getDepartmentCapacity("RADIOLOGY");
    const pharmCap = await clinicalCapacityService.getDepartmentCapacity("PHARMACY");
    const forecast = await clinicalForecastService.getCapacityForecast();
    const recommendations = await clinicalRecommendationService.getOperationalRecommendations();

    const operationalScore = Math.max(100 - Math.round(hospitalCap.utilization_percentage * 0.4), 60);

    return {
      hospital_utilization_pct: hospitalCap.utilization_percentage,
      department_utilization: {
        LABORATORY: labCap.utilization_percentage,
        RADIOLOGY: radCap.utilization_percentage,
        PHARMACY: pharmCap.utilization_percentage,
        CONSULTATION: Math.round(hospitalCap.utilization_percentage * 0.9),
      },
      room_utilization_pct: Math.round((hospitalCap.room_capacity.occupied / hospitalCap.room_capacity.total) * 100),
      equipment_utilization_pct: Math.round((hospitalCap.equipment_capacity.in_use / hospitalCap.equipment_capacity.total) * 100),
      staff_coverage_pct: 92,
      queue_pressure: hospitalCap.utilization_percentage > 75 ? "HIGH" : "NORMAL",
      sla_risk: hospitalCap.utilization_percentage > 80 ? "HIGH" : "LOW",
      forecast_risk: forecast.risk_assessment.department_overload_risk,
      operational_health_score: operationalScore,
      recommended_actions: recommendations,
    };
  }
}

module.exports = new ClinicalCapacityDashboardService();
