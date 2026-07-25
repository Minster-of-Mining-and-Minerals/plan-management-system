"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");
const timelineEventService = require("./timelineEventService");
const notificationService = require("./notificationService");

class RadiologyCriticalAlertService {
  async logAudit(action, resourceId, staffId, details = {}, transaction = null) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyCriticalAlert",
        resourceId,
        details,
      });
    }
  }

  async emitTimelineEvent(eventData, transaction = null) {
    if (timelineEventService && typeof timelineEventService.emit === "function") {
      try {
        await timelineEventService.emit(eventData, transaction);
      } catch (err) {
        console.error("Failed to emit radiology critical alert timeline event:", err.message);
      }
    }
  }

  /**
   * Create critical finding alert and trigger notification to ordering physician.
   */
  async createAlert(payload, staffId) {
    const { study_id, severity = "CRITICAL", finding, recipient_doctor_id } = payload || {};

    if (!study_id || !finding?.trim() || !recipient_doctor_id) {
      const err = new Error("study_id, finding, and recipient_doctor_id are required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const study = await db.RadiologyStudy.findByPk(study_id, { transaction: t });
      if (!study) {
        const err = new Error("Radiology study not found");
        err.status = 404;
        throw err;
      }

      const alert = await db.RadiologyCriticalAlert.create(
        {
          id: uuidv4(),
          study_id,
          created_by: staffId,
          severity: severity.trim().toUpperCase(),
          finding: finding.trim(),
          recipient_doctor_id,
          status: "OPEN",
        },
        { transaction: t }
      );

      await this.logAudit("RADIOLOGY_CRITICAL_ALERT_CREATED", alert.id, staffId, { study_id, severity }, t);

      await this.emitTimelineEvent(
        {
          patient_id: study.patient_id,
          appointment_id: study.appointment_id,
          event_type: "RADIOLOGY_CRITICAL_ALERT_CREATED",
          title: `🚨 CRITICAL RADIOLOGY FINDING ALERT`,
          description: `Severity: ${severity.toUpperCase()} — Finding: ${finding.trim().slice(0, 150)}`,
          actor_id: staffId,
          resource_type: "RadiologyCriticalAlert",
          resource_id: alert.id,
        },
        t
      );

      // Trigger internal notification to physician
      if (notificationService && typeof notificationService.notifyInternalUser === "function") {
        try {
          await notificationService.notifyInternalUser(recipient_doctor_id, {
            title: `🚨 CRITICAL RADIOLOGY ALERT: Accession ${study.accession_number}`,
            message: `Critical Finding: ${finding.trim()}`,
            category: "workflow",
            relatedType: "radiology_critical_alert",
            relatedId: alert.id,
          });
        } catch (err) {
          console.error("Failed to notify physician of critical alert:", err.message);
        }
      }

      await t.commit();
      return alert.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Reassign critical alert recipient doctor.
   */
  async assignRecipient(alertId, doctorId, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const alert = await db.RadiologyCriticalAlert.findByPk(alertId, { transaction: t });
      if (!alert) {
        const err = new Error("Critical alert not found");
        err.status = 404;
        throw err;
      }

      await alert.update({ recipient_doctor_id: doctorId }, { transaction: t });
      await t.commit();
      return alert.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Acknowledge critical finding alert by ordering physician.
   */
  async acknowledgeAlert(alertId, doctorId) {
    const t = await db.sequelize.transaction();
    try {
      const alert = await db.RadiologyCriticalAlert.findByPk(alertId, { transaction: t });
      if (!alert) {
        const err = new Error("Critical alert not found");
        err.status = 404;
        throw err;
      }

      await alert.update(
        {
          status: "ACKNOWLEDGED",
          acknowledged_at: new Date(),
          acknowledged_by: doctorId,
        },
        { transaction: t }
      );

      const study = await db.RadiologyStudy.findByPk(alert.study_id, { transaction: t });

      await this.logAudit("RADIOLOGY_CRITICAL_ALERT_ACKNOWLEDGED", alertId, doctorId, { study_id: alert.study_id }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_CRITICAL_ALERT_ACKNOWLEDGED",
            title: `Critical Finding Alert Acknowledged`,
            description: `Acknowledged by ordering physician`,
            actor_id: doctorId,
            resource_type: "RadiologyCriticalAlert",
            resource_id: alertId,
          },
          t
        );
      }

      await t.commit();
      return alert.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Close critical alert after action taken.
   */
  async closeAlert(alertId, staffId) {
    const t = await db.sequelize.transaction();
    try {
      const alert = await db.RadiologyCriticalAlert.findByPk(alertId, { transaction: t });
      if (!alert) {
        const err = new Error("Critical alert not found");
        err.status = 404;
        throw err;
      }

      await alert.update({ status: "CLOSED" }, { transaction: t });

      const study = await db.RadiologyStudy.findByPk(alert.study_id, { transaction: t });

      await this.logAudit("RADIOLOGY_CRITICAL_ALERT_CLOSED", alertId, staffId, { study_id: alert.study_id }, t);

      if (study) {
        await this.emitTimelineEvent(
          {
            patient_id: study.patient_id,
            appointment_id: study.appointment_id,
            event_type: "RADIOLOGY_CRITICAL_ALERT_CLOSED",
            title: `Critical Finding Alert Closed`,
            description: `Alert marked resolved`,
            actor_id: staffId,
            resource_type: "RadiologyCriticalAlert",
            resource_id: alertId,
          },
          t
        );
      }

      await t.commit();
      return alert.get({ plain: true });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get all active or historical critical alerts for a study.
   */
  async getStudyAlerts(studyId) {
    const alerts = await db.RadiologyCriticalAlert.findAll({
      where: { study_id: studyId },
      include: [
        { model: db.User, as: "creator", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "recipientDoctor", attributes: ["user_id", "full_name"] },
        { model: db.User, as: "acknowledgedByUser", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    return alerts.map((a) => a.get({ plain: true }));
  }
}

module.exports = new RadiologyCriticalAlertService();
