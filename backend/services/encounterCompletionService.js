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
   * @param {object} [options] - { followUpRequired: boolean }
   * @returns {Promise<object>} Validation result with warnings, blocking issues, and overall readiness
   */
  async validateCompletion(appointmentId, userId, options = {}) {
    const appointment = await this._getAppointment(appointmentId);

    const contextData = await this._buildValidationContext(appointment, userId, options);

    // Evaluate clinical rules for ENCOUNTER_COMPLETE trigger
    const alerts = await clinicalRuleEngineService.evaluateRules(
      "ENCOUNTER_COMPLETE",
      contextData
    );

    // Check for explicit diagnosis record
    const hasDiagnosisRecord = db.DiagnosisRecord
      ? await db.DiagnosisRecord.count({ where: { appointment_id: appointmentId } })
      : 0;

    const tier1_blocking = alerts.filter(
      (a) => a.severity === "CRITICAL" || a.rule_code === "MISSING_DIAGNOSIS"
    );

    if (!contextData.has_diagnosis && hasDiagnosisRecord === 0) {
      const missingDiagAlready = tier1_blocking.some((a) => a.rule_code === "MISSING_DIAGNOSIS");
      if (!missingDiagAlready) {
        tier1_blocking.push({
          rule_code: "MISSING_DIAGNOSIS",
          severity: "CRITICAL",
          message: "Encounter requires a documented final or preliminary diagnosis.",
          tier: 1,
        });
      }
    }

    const tier2_warning = alerts.filter(
      (a) => a.severity === "HIGH" || a.severity === "MEDIUM" || a.severity === "WARNING"
    );

    if (contextData.has_unpaid_balance) {
      if (!tier2_warning.some((a) => a.rule_code === "UNPAID_BALANCE")) {
        tier2_warning.push({
          rule_code: "UNPAID_BALANCE",
          severity: "HIGH",
          message: "Appointment billing account has an outstanding balance due.",
          tier: 2,
        });
      }
    }

    if (contextData.has_pending_clinical_orders) {
      if (!tier2_warning.some((a) => a.rule_code === "PENDING_ORDERS")) {
        tier2_warning.push({
          rule_code: "PENDING_ORDERS",
          severity: "MEDIUM",
          message: `Encounter has ${contextData.pending_clinical_orders_count} pending clinical orders.`,
          tier: 2,
        });
      }
    }

    const tier3_informational = alerts.filter((a) => a.severity === "LOW" || a.severity === "INFO");
    if (contextData.follow_up_required && !contextData.has_follow_up_record) {
      tier3_informational.push({
        rule_code: "FOLLOW_UP_RECOMMENDED",
        severity: "INFO",
        message: "Follow-up visit recommended for patient care continuity.",
        tier: 3,
      });
    }

    return {
      ready: tier1_blocking.length === 0,
      tier1_blocking,
      tier2_warning,
      tier3_informational,
      blockingIssues: tier1_blocking,
      warnings: tier2_warning,
      summary: {
        totalBlocking: tier1_blocking.length,
        totalWarnings: tier2_warning.length,
        totalInformational: tier3_informational.length,
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
  async _buildValidationContext(appointment, userId, options = {}) {
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

    // Check if follow-up record exists for this encounter
    let hasFollowUpRecord = false;
    try {
      const encounterFollowUpService = require("./encounterFollowUpService");
      const followUp = await encounterFollowUpService.findFollowUpForAppointment(appointmentId);
      hasFollowUpRecord = !!followUp;
    } catch {
      // Non-fatal if follow-up service is not available
    }

    // Phase 2.4.4 - Check if this is a follow-up encounter and if outcome exists
    let isFollowUp = false;
    let hasFollowUpOutcome = false;
    try {
      const followUpContinuityService = require("./followUpContinuityService");
      const continuity = await followUpContinuityService.getFollowUpContext(appointmentId);
      isFollowUp = continuity.is_follow_up === true;
      if (isFollowUp && continuity.follow_up_id) {
        const followUpOutcomeService = require("./followUpOutcomeService");
        const outcome = await followUpOutcomeService.getOutcome(continuity.follow_up_id);
        hasFollowUpOutcome = !!outcome;
      }
    } catch {
      // Non-fatal
    }

    // Check for pending clinical orders (ClinicalOrder architecture)
    let pendingClinicalOrders = 0;
    if (db.ClinicalOrder) {
      pendingClinicalOrders = await db.ClinicalOrder.count({
        where: {
          appointment_id: appointmentId,
          status: { [db.Sequelize.Op.in]: ["SUBMITTED", "IN_PROGRESS", "ACCEPTED", "PERFORMED"] },
        },
      });
    }

    const followUpRequired = options.followUpRequired === true;

    return {
      patient_id: appointment.patient_id,
      appointment_id: appointmentId,
      has_pending_tasks: pendingTasks > 0 || pendingClinicalOrders > 0,
      has_pending_clinical_orders: pendingClinicalOrders > 0,
      pending_clinical_orders_count: pendingClinicalOrders,
      has_pending_lab: pendingLabOrders > 0,
      has_pending_pharmacy: unfulfilledPrescriptions > 0,
      has_unpaid_balance: hasUnpaidBalance,
      has_diagnosis: diagnosisLogs > 0,
      follow_up_required: followUpRequired,
      has_follow_up_record: hasFollowUpRecord,
      // Phase 2.4.4 - Follow-up outcome context
      is_follow_up: isFollowUp,
      has_follow_up_outcome: hasFollowUpOutcome,
    };
  }
}

module.exports = new EncounterCompletionService();