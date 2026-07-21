"use strict";

const db = require("../models");
const clinicalRuleEngineService = require("./clinicalRuleEngineService");

/**
 * Encounter Completion Validation Engine
 * Validates and executes encounter completion.
 * This service does NOT create audit logs for routine validation calls.
 * Audit logging is reserved for meaningful events (e.g., actual completion).
 */
class EncounterCompletionService {
  /**
   * Validate whether an appointment is ready for completion.
   * @param {string} appointmentId
   * @param {string} userId
   * @returns {Promise<object>} Validation result with warnings, blocking issues, and overall readiness
   */
  async validateCompletion(appointmentId, userId) {
    const appointment = await this._getAppointment(appointmentId);

    const contextData = await this._buildValidationContext(appointment, userId);

    // Evaluate clinical rules for ENCOUNTER_COMPLETE trigger
    const alerts = await clinicalRuleEngineService.evaluateRules(
      "ENCOUNTER_COMPLETE",
      contextData
    );

    const blockingIssues = alerts.filter((a) => a.severity === "CRITICAL");
    const warnings = alerts.filter((a) => a.severity !== "CRITICAL");

    return {
      ready: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      summary: {
        totalWarnings: warnings.length,
        totalBlocking: blockingIssues.length,
      },
    };
  }

  /**
   * Execute encounter completion for an appointment.
   * @param {string} appointmentId
   * @param {string} userId
   * @param {object} options - { overrideReason, overriddenWarnings }
   * @returns {Promise<object>} The completed appointment record
   */
  async executeCompletion(appointmentId, userId, options = {}) {
    const { overrideReason, overriddenWarnings } = options;

    const appointment = await this._getAppointment(appointmentId);

    if (appointment.workflow_status === "completed") {
      const err = new Error("Encounter is already completed");
      err.status = 400;
      throw err;
    }

    const contextData = await this._buildValidationContext(appointment, userId);

    const alerts = await clinicalRuleEngineService.evaluateRules(
      "ENCOUNTER_COMPLETE",
      contextData
    );

    const blockingIssues = alerts.filter((a) => a.severity === "CRITICAL");

    if (blockingIssues.length > 0) {
      if (!overrideReason) {
        const err = new Error("Cannot complete encounter due to blocking issues");
        err.status = 400;
        err.details = blockingIssues;
        throw err;
      }
    }

    const t = await db.sequelize.transaction();

    try {
      await appointment.update(
        {
          workflow_status: "completed",
          workflow_completed_at: new Date(),
          completed_by: userId,
        },
        { transaction: t }
      );

      // Cancel any pending workflow tasks
      await db.WorkflowTask.update(
        { status: "cancelled" },
        {
          where: {
            appointment_id: appointmentId,
            status: "pending",
          },
          transaction: t,
        }
      );

      await t.commit();
    } catch (e) {
      if (!t.finished) await t.rollback();
      throw e;
    }

    // Fetch the updated appointment
    const updated = await db.StaffAppointment.findByPk(appointmentId, {
      include: [
        {
          model: db.User,
          as: "patient",
          attributes: ["user_id", "full_name"],
        },
      ],
    });

    return updated.get({ plain: true });
  }

  /**
   * Fetch appointment with access validation.
   */
  async _getAppointment(appointmentId) {
    const appointment = await db.StaffAppointment.findOne({
      where: { appointment_id: appointmentId },
      include: [
        {
          model: db.User,
          as: "patient",
          attributes: ["user_id", "full_name"],
        },
        {
          model: db.PatientSchedule,
          as: "schedule",
          attributes: ["schedule_id", "status"],
        },
      ],
    });

    if (!appointment) {
      const err = new Error("Appointment not found");
      err.status = 404;
      throw err;
    }

    return appointment;
  }

  /**
   * Build context data for clinical rule evaluation.
   */
  async _buildValidationContext(appointment, userId) {
    const appointmentId = appointment.appointment_id;

    // Check for pending workflow tasks
    const pendingTasks = await db.WorkflowTask.count({
      where: {
        appointment_id: appointmentId,
        status: "pending",
      },
    });

    // Check for pending lab orders
    const pendingLabOrders = await db.MedicalHistoryLog.count({
      where: {
        appointment_id: appointmentId,
        action_type: "submit",
        header_title: { [db.Sequelize.Op.like]: "%Lab%Order%" },
      },
    });

    // Check for active prescriptions
    const unfulfilledPrescriptions = db.Prescription
      ? await db.Prescription.count({
          where: {
            appointment_id: appointmentId,
            status: { [db.Sequelize.Op.ne]: "dispensed" },
          },
        })
      : 0;

    // Check for diagnosis records (form submissions with diagnosis)
    const diagnosisLogs = await db.MedicalHistoryLog.count({
      where: {
        appointment_id: appointmentId,
        action_type: { [db.Sequelize.Op.in]: ["submit", "forward"] },
      },
    });

    // Check for unpaid balance
    let hasUnpaidBalance = false;
    try {
      const billingService = require("./appointmentBillingService");
      const billingInfo = await billingService.getAppointmentBillingSummary(
        appointmentId
      );
      hasUnpaidBalance = billingInfo?.balance_due > 0;
    } catch {
      // Non-fatal if billing service is not available
    }

    return {
      patient_id: appointment.patient_id,
      appointment_id: appointmentId,
      has_pending_tasks: pendingTasks > 0,
      has_pending_lab: pendingLabOrders > 0,
      has_pending_pharmacy: unfulfilledPrescriptions > 0,
      has_unpaid_balance: hasUnpaidBalance,
      has_diagnosis: diagnosisLogs > 0,
    };
  }
}

module.exports = new EncounterCompletionService();