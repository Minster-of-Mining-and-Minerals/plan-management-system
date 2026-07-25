"use strict";

const db = require("../../models");
const clinicalIncidentEngine = require("./clinicalIncidentEngine");
const unifiedClinicalQueueService = require("../clinicalOrder/unifiedClinicalQueueService");
const clinicalCapacityService = require("../capacity/clinicalCapacityService");

class ClinicalOperationalRulesEngine {
  /**
   * Evaluate system rules and generate automated operational incidents if thresholds breached.
   */
  async evaluateOperationalRules() {
    const createdIncidents = [];

    // 1. Evaluate Queue Overload & Overdue SLA
    const queues = await unifiedClinicalQueueService.getEnterpriseQueuesOverview();

    if (queues.overdue_queue.current_size > 0) {
      const inc = await clinicalIncidentEngine.createIncident({
        title: `SLA Breach Incident: ${queues.overdue_queue.current_size} Overdue Order(s)`,
        incident_type: "SLA_BREACH",
        severity: "HIGH",
        department_id: "OPERATIONS",
        assigned_owner_role: "OPERATIONS_MANAGER",
      });
      createdIncidents.push(inc);
    }

    if (queues.stat_queue.current_size > 3) {
      const inc = await clinicalIncidentEngine.createIncident({
        title: `STAT Queue Overload: ${queues.stat_queue.current_size} STAT Orders Pending`,
        incident_type: "EMERGENCY_OVERLOAD",
        severity: "CRITICAL",
        department_id: "HOSPITAL",
        assigned_owner_role: "CHIEF_MEDICAL_OFFICER",
      });
      createdIncidents.push(inc);
    }

    // 2. Evaluate Capacity Overload
    const cap = await clinicalCapacityService.getHospitalCapacity();
    if (cap.utilization_percentage > 85) {
      const inc = await clinicalIncidentEngine.createIncident({
        title: `Hospital Capacity Alert: Utilization at ${cap.utilization_percentage}%`,
        incident_type: "QUEUE_OVERLOAD",
        severity: "HIGH",
        department_id: "HOSPITAL",
        assigned_owner_role: "OPERATIONS_MANAGER",
      });
      createdIncidents.push(inc);
    }

    return {
      evaluated_rules_count: 5,
      triggered_incidents_count: createdIncidents.length,
      incidents: createdIncidents,
    };
  }
}

module.exports = new ClinicalOperationalRulesEngine();
