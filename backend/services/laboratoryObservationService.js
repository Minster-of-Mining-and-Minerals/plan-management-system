"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const laboratoryCriticalValueService = require("./laboratoryCriticalValueService");

class LaboratoryObservationService {
  /**
   * Helper to log audit events into NovaCure audit system.
   */
  async logAudit(action, resourceId, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "LaboratoryObservation",
        resourceId,
        details,
      });
    }
  }

  /**
   * Calculate abnormal flag based on numeric value and reference ranges.
   */
  calculateAbnormalFlag(value, numericValue, referenceRange = {}) {
    if (numericValue === null || numericValue === undefined || isNaN(Number(numericValue))) {
      return "NORMAL";
    }

    const num = Number(numericValue);
    const { low, high, critical_low, critical_high } = referenceRange || {};

    if (critical_low !== undefined && critical_low !== null && num < Number(critical_low)) {
      return "CRITICAL_LOW";
    }
    if (critical_high !== undefined && critical_high !== null && num > Number(critical_high)) {
      return "CRITICAL_HIGH";
    }

    if (low !== undefined && low !== null && num < Number(low)) {
      return "LOW";
    }
    if (high !== undefined && high !== null && num > Number(high)) {
      return "HIGH";
    }

    return "NORMAL";
  }

  /**
   * Create a structured laboratory observation analyte entry.
   */
  async createObservation(payload, staffId) {
    const {
      result_id,
      order_id,
      test_catalog_id,
      observation_code,
      observation_name,
      value,
      numeric_value,
      unit,
      reference_range = {},
    } = payload;

    if (!result_id || !order_id || !observation_code || !observation_name || value === undefined) {
      const err = new Error("result_id, order_id, observation_code, observation_name, and value are required");
      err.status = 400;
      throw err;
    }

    const result = await db.ClinicalOrderResult.findByPk(result_id);
    if (!result) {
      const err = new Error("Clinical order result not found");
      err.status = 404;
      throw err;
    }

    const numVal = numeric_value !== undefined && numeric_value !== null && numeric_value !== ""
      ? Number(numeric_value)
      : !isNaN(Number(value)) ? Number(value) : null;

    const abnormalFlag = this.calculateAbnormalFlag(value, numVal, reference_range);

    const observation = await db.LaboratoryObservation.create({
      id: uuidv4(),
      result_id,
      order_id,
      test_catalog_id: test_catalog_id || null,
      observation_code: observation_code.trim().toUpperCase(),
      observation_name: observation_name.trim(),
      value: String(value),
      numeric_value: numVal,
      unit: unit || null,
      reference_range: reference_range || {},
      abnormal_flag: abnormalFlag,
      status: "PRELIMINARY",
      observed_by: staffId,
      observed_at: new Date(),
    });

    // Evaluate critical thresholds
    await laboratoryCriticalValueService.evaluateCriticalValue(observation);

    // Audit log
    await this.logAudit("LAB_OBSERVATION_CREATED", observation.id, staffId, {
      order_id,
      result_id,
      observation_code,
      abnormal_flag: abnormalFlag,
    });

    // Timeline event
    const order = await db.ClinicalOrder.findByPk(order_id);
    if (order) {
      await db.MedicalHistoryLog.create({
        log_id: uuidv4(),
        patient_id: order.patient_id,
        appointment_id: order.appointment_id,
        sender_staff_id: staffId,
        action_type: "update",
        header_title: `Laboratory Observation Recorded: ${observation_name}`,
        notes: `${observation_name}: ${value} ${unit || ""} (${abnormalFlag})`,
        status: "available",
      });
    }

    return observation.get({ plain: true });
  }

  /**
   * Get all observations for a clinical order result.
   */
  async getResultObservations(resultId) {
    const observations = await db.LaboratoryObservation.findAll({
      where: { result_id: resultId },
      include: [
        { model: db.User, as: "observedByUser", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "verifiedByUser", attributes: ["user_id", "full_name"] },
        {
          model: db.LaboratoryObservationHistory,
          as: "amendments",
          include: [{ model: db.User, as: "changedByUser", attributes: ["user_id", "full_name"] }],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    return observations.map((o) => o.get({ plain: true }));
  }

  /**
   * Verify an observation analyte result.
   */
  async verifyObservation(observationId, staffId) {
    const observation = await db.LaboratoryObservation.findByPk(observationId);
    if (!observation) {
      const err = new Error("Laboratory observation not found");
      err.status = 404;
      throw err;
    }

    await observation.update({
      status: "FINAL",
      verified_by: staffId,
    });

    await this.logAudit("LAB_OBSERVATION_VERIFIED", observationId, staffId, {
      order_id: observation.order_id,
      observation_code: observation.observation_code,
    });

    const order = await db.ClinicalOrder.findByPk(observation.order_id);
    if (order) {
      await db.MedicalHistoryLog.create({
        log_id: uuidv4(),
        patient_id: order.patient_id,
        appointment_id: order.appointment_id,
        sender_staff_id: staffId,
        action_type: "update",
        header_title: `Laboratory Result Verified: ${observation.observation_name}`,
        notes: `${observation.observation_name} verified by supervisor`,
        status: "verified",
      });
    }

    return observation.get({ plain: true });
  }

  /**
   * Amend an observation analyte result with history tracking.
   */
  async amendObservation(observationId, payload, staffId) {
    const observation = await db.LaboratoryObservation.findByPk(observationId);
    if (!observation) {
      const err = new Error("Laboratory observation not found");
      err.status = 404;
      throw err;
    }

    const { value, numeric_value, unit, change_reason } = payload || {};

    if (!change_reason?.trim()) {
      const err = new Error("Amendment reason is required");
      err.status = 400;
      throw err;
    }

    // Preserve history record
    if (db.LaboratoryObservationHistory) {
      await db.LaboratoryObservationHistory.create({
        id: uuidv4(),
        observation_id: observationId,
        previous_value: observation.value,
        previous_unit: observation.unit || null,
        previous_flag: observation.abnormal_flag,
        changed_by: staffId,
        change_reason: change_reason.trim(),
      });
    }

    const newValue = value !== undefined ? String(value) : observation.value;
    const newUnit = unit !== undefined ? unit : observation.unit;
    const numVal = numeric_value !== undefined && numeric_value !== null
      ? Number(numeric_value)
      : !isNaN(Number(newValue)) ? Number(newValue) : observation.numeric_value;

    const newFlag = this.calculateAbnormalFlag(newValue, numVal, observation.reference_range);

    await observation.update({
      value: newValue,
      numeric_value: numVal,
      unit: newUnit,
      abnormal_flag: newFlag,
      status: "AMENDED",
    });

    await this.logAudit("LAB_OBSERVATION_AMENDED", observationId, staffId, {
      change_reason: change_reason.trim(),
      previous_value: observation.value,
      new_value: newValue,
    });

    return observation.get({ plain: true });
  }

  /**
   * Fetch all critical value observation alerts across the platform.
   */
  async getCriticalResults() {
    const observations = await db.LaboratoryObservation.findAll({
      where: {
        abnormal_flag: ["CRITICAL_LOW", "CRITICAL_HIGH"],
      },
      include: [
        {
          model: db.ClinicalOrder,
          as: "order",
          include: [{ model: db.User, as: "patient", attributes: ["user_id", "full_name"] }],
        },
        { model: db.User, as: "observedByUser", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return observations.map((o) => o.get({ plain: true }));
  }
}

module.exports = new LaboratoryObservationService();
