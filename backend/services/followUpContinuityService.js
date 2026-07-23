"use strict";

const db = require("../models");
const { EncounterFollowUp, EncounterFollowUpAttempt, EncounterFollowUpOutcome, StaffAppointment, PatientSchedule, User, MedicalHistoryLog, Prescription } = db;

/**
 * FollowUpContinuityService
 * 
 * READ-ONLY service that builds a clinical handover DTO when a clinician
 * opens an encounter that originated from a Follow-up recommendation.
 * 
 * This service NEVER writes data.
 * It is purely a query/assembly layer.
 */
class FollowUpContinuityService {

  /**
   * Build the follow-up clinical context DTO for a given appointment.
   * 
   * @param {string} appointmentId - The current (new) encounter's appointment_id
   * @returns {Promise<object>} DTO with is_follow_up flag and continuity data
   */
  async getFollowUpContext(appointmentId) {
    // Step 1: Get the current encounter to find its schedule
    const currentEncounter = await StaffAppointment.findByPk(appointmentId, {
      attributes: ["appointment_id", "schedule_id", "patient_id", "assigned_staff_id"],
      raw: true,
    });

    if (!currentEncounter) {
      return { is_follow_up: false };
    }

    // Step 2: Find the follow-up attempt linked to this schedule
    // The schedule may have been created by reception for a follow-up
    const attempt = await EncounterFollowUpAttempt.findOne({
      where: { schedule_id: currentEncounter.schedule_id },
      include: [
        {
          model: EncounterFollowUp,
          as: "followUp",
          required: true,
        },
      ],
      paranoid: false,
    });

    if (!attempt || !attempt.followUp) {
      return { is_follow_up: false };
    }

    const followUp = attempt.followUp;

    // Step 3: Load the original encounter data
    const originalEncounterId = followUp.appointment_id;

    // Load original encounter with provider info
    const originalEncounter = await StaffAppointment.findByPk(originalEncounterId, {
      attributes: ["appointment_id", "assigned_staff_id", "workflow_status", "workflow_completed_at", "notes"],
      include: [
        {
          model: User,
          as: "staff",
          attributes: ["user_id", "full_name"],
        },
      ],
      raw: true,
      nest: true,
    });

    // Load the recommender
    const recommender = await User.findByPk(followUp.recommended_by, {
      attributes: ["user_id", "full_name"],
      raw: true,
    });

    // Step 4: Load previous diagnosis/clinical summary from original encounter
    const previousLogs = await MedicalHistoryLog.findAll({
      where: { appointment_id: originalEncounterId },
      attributes: ["log_id", "header_title", "action_type", "notes", "form_data", "created_at", "sender_staff_id"],
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["user_id", "full_name"],
          required: false,
        },
      ],
      order: [["created_at", "ASC"]],
      raw: true,
      nest: true,
    });

    // Process logs into structured summaries
    const diagnosisSummaries = previousLogs
      .filter((log) => log.action_type === "submit" || log.action_type === "forward")
      .map((log) => ({
        log_id: log.log_id,
        header_title: log.header_title || "Clinical Entry",
        created_at: log.created_at,
        provider_name: log.sender?.full_name || "Unknown",
        form_summary: this._extractFormSummary(log.form_data),
      }));

    // Step 5: Load previous prescriptions
    let previousPrescriptions = [];
    try {
      if (Prescription) {
        const rxRows = await Prescription.findAll({
          where: { appointment_id: originalEncounterId },
          attributes: ["prescription_id", "header_title", "issued_at", "notes"],
          include: [
            {
              model: db.PrescriptionCategory,
              as: "category",
              attributes: ["name"],
              required: false,
            },
            {
              model: db.PrescriptionTemplate,
              as: "template",
              attributes: ["name"],
              required: false,
            },
            {
              model: db.PrescriptionItem,
              as: "items",
              attributes: ["item_name", "dosage", "frequency"],
              required: false,
            },
            {
              model: User,
              as: "prescriber",
              attributes: ["user_id", "full_name"],
              required: false,
            },
          ],
          order: [["created_at", "ASC"]],
          raw: true,
          nest: true,
        });

        // Deduplicate raw rows into structured items
        const rxMap = new Map();
        for (const rx of rxRows) {
          if (!rxMap.has(rx.prescription_id)) {
            rxMap.set(rx.prescription_id, {
              prescription_id: rx.prescription_id,
              template_name: rx.template?.name || null,
              category_name: rx.category?.name || null,
              items_summary: rx.items?.item_name || null,
              prescriber_name: rx.prescriber?.full_name || null,
              issued_at: rx.issued_at || rx.created_at,
              header_title: rx.header_title || null,
            });
          }
        }
        previousPrescriptions = Array.from(rxMap.values());
      }
    } catch {
      // Non-fatal if Prescription model not available
    }

    // Step 6: Extract clinical notes (entries with notes field)
    const previousNotes = previousLogs
      .filter((log) => log.notes && log.notes.trim())
      .map((log) => ({
        log_id: log.log_id,
        header_title: log.header_title || "Clinical Notes",
        notes: log.notes,
        created_at: log.created_at,
        provider_name: log.sender?.full_name || "Unknown",
      }));

    // Step 7: Build timeline summary
    const actionTypes = [...new Set(previousLogs.map((l) => l.action_type))];
    const lastLog = previousLogs.length > 0 ? previousLogs[previousLogs.length - 1] : null;

    // Step 8: Build the normalized DTO
    return {
      is_follow_up: true,
      follow_up_id: followUp.follow_up_id,
      origin_encounter_id: originalEncounterId,
      current_encounter_id: appointmentId,
      previous_provider: originalEncounter?.staff
        ? {
            user_id: originalEncounter.staff.user_id,
            full_name: originalEncounter.staff.full_name,
          }
        : null,
      recommended_by: recommender
        ? {
            user_id: recommender.user_id,
            full_name: recommender.full_name,
          }
        : null,
      recommendation_date: followUp.recommended_date,
      reason: followUp.reason,
      clinical_instructions: followUp.clinical_instructions,
      expected_review_date: followUp.target_date,
      priority: followUp.priority,
      previous_diagnosis: diagnosisSummaries,
      previous_prescriptions: previousPrescriptions,
      previous_notes: previousNotes,
      previous_timeline_summary: {
        total_logs: previousLogs.length,
        action_types: actionTypes,
        last_action: lastLog?.action_type || null,
        last_action_at: lastLog?.created_at || null,
      },
      follow_up_status: followUp.status,
      attempt_number: attempt.attempt_number,
      attempt_status: attempt.status,
    };
  }

  /**
   * Extract a readable summary from form_data JSONB.
   */
  _extractFormSummary(formData) {
    if (!formData || typeof formData !== "object") return null;

    // Collect all non-empty, non-boolean string values
    const summaryParts = [];
    for (const [key, value] of Object.entries(formData)) {
      if (value === null || value === undefined || value === false) continue;
      if (typeof value === "boolean" && value === true) {
        summaryParts.push(key.replace(/^oph_|^opt_|_/g, " ").trim());
        continue;
      }
      if (typeof value === "string" && value.trim()) {
        // Skip very long values and internal IDs
        if (value.length > 200) continue;
        if (value.length < 3) continue;
        if (key.endsWith("_id") || key === "prescription_id") continue;
        summaryParts.push(`${key.replace(/^oph_|^opt_|_/g, " ").trim()}: ${value}`);
      }
    }

    return summaryParts.length > 0 ? summaryParts.slice(0, 8).join("; ") : null;
  }
}

module.exports = new FollowUpContinuityService();