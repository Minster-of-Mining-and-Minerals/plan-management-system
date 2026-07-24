"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class LaboratoryCriticalValueService {
  /**
   * Evaluate whether an observation represents a critical value requiring immediate notification.
   */
  async evaluateCriticalValue(observation) {
    if (!observation) return false;

    const flag = observation.abnormal_flag;
    const isCritical = flag === "CRITICAL_LOW" || flag === "CRITICAL_HIGH";

    if (isCritical) {
      // 1. Audit event
      if (auditService && typeof auditService.logAudit === "function") {
        await auditService.logAudit({
          actorUserId: observation.observed_by,
          action: "LAB_CRITICAL_VALUE_DETECTED",
          resourceType: "LaboratoryObservation",
          resourceId: observation.id,
          details: {
            order_id: observation.order_id,
            observation_code: observation.observation_code,
            observation_name: observation.observation_name,
            value: observation.value,
            unit: observation.unit,
            abnormal_flag: observation.abnormal_flag,
          },
        });
      }

      // 2. Timeline Event (MedicalHistoryLog)
      const order = await db.ClinicalOrder.findByPk(observation.order_id);
      if (order) {
        await db.MedicalHistoryLog.create({
          log_id: uuidv4(),
          patient_id: order.patient_id,
          appointment_id: order.appointment_id,
          sender_staff_id: observation.observed_by,
          action_type: "update",
          header_title: `CRITICAL LAB RESULT: ${observation.observation_name}`,
          notes: `Critical Value Alert: ${observation.observation_name} = ${observation.value} ${observation.unit || ""} (${observation.abnormal_flag})`,
          status: "critical",
        });
      }

      return true;
    }

    return false;
  }
}

module.exports = new LaboratoryCriticalValueService();
