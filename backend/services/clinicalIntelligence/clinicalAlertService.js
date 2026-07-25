"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const clinicalAuditEngine = require("../clinicalIntegrity/clinicalAuditEngine");

const VALID_STATUSES = ["OPEN", "ACKNOWLEDGED", "ACTION_TAKEN", "DISMISSED"];

class ClinicalAlertService {
  async createAlert({
    patient_id,
    alert_type,
    domain = "GENERAL",
    severity = "WARNING",
    message,
    recommendation = null,
    source_rule_id = null,
    source_entity_type = null,
    source_entity_id = null,
    metadata_json = {},
    created_by = null,
  }) {
    if (!patient_id || !alert_type || !message) {
      throw Object.assign(new Error("patient_id, alert_type, and message are required"), { status: 400 });
    }

    const alert = await db.ClinicalAlert.create({
      alert_id: uuidv4(),
      patient_id,
      alert_type,
      domain: domain.toUpperCase(),
      severity: severity.toUpperCase(),
      message,
      recommendation,
      status: "OPEN",
      source_rule_id,
      source_entity_type,
      source_entity_id,
      metadata_json,
      created_by,
    });

    return alert.get({ plain: true });
  }

  async acknowledgeAlert(alertId, userId) {
    return this._transitionAlert(alertId, userId, "ACKNOWLEDGED", {
      acknowledged_by: userId,
      acknowledged_at: new Date(),
    });
  }

  async markActionTaken(alertId, userId) {
    return this._transitionAlert(alertId, userId, "ACTION_TAKEN", {
      action_taken_by: userId,
      action_taken_at: new Date(),
    });
  }

  async dismissAlert(alertId, userId) {
    return this._transitionAlert(alertId, userId, "DISMISSED", {
      dismissed_by: userId,
      dismissed_at: new Date(),
    });
  }

  async _transitionAlert(alertId, userId, newStatus, extraFields = {}) {
    const alert = await db.ClinicalAlert.findByPk(alertId);
    if (!alert) throw Object.assign(new Error("Clinical alert not found"), { status: 404 });

    const previousStatus = alert.status;

    await alert.update({ status: newStatus, ...extraFields });

    try {
      await clinicalAuditEngine.recordAuditEvent({
        event_type: `CLINICAL_ALERT_${newStatus}`,
        domain: alert.domain,
        entity_type: "ClinicalAlert",
        entity_id: alertId,
        patient_id: alert.patient_id,
        actor_id: userId,
        action: `ALERT_${newStatus}`,
        previous_value: { status: previousStatus },
        new_value: { status: newStatus },
      });
    } catch (err) {
      console.error("Failed to audit clinical alert transition:", err.message);
    }

    return alert.get({ plain: true });
  }

  async getAlertsForPatient(patientId, filters = {}) {
    const where = { patient_id: patientId };
    if (filters.status) where.status = filters.status.toUpperCase();
    if (filters.severity) where.severity = filters.severity.toUpperCase();
    if (filters.domain) where.domain = filters.domain.toUpperCase();

    const alerts = await db.ClinicalAlert.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: Number(filters.limit) || 50,
    });

    return alerts.map((a) => a.get({ plain: true }));
  }
}

module.exports = new ClinicalAlertService();
