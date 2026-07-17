"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { TimelineEvent, User, StaffAppointment } = db;

/**
 * Service to manage patient chronological timeline events.
 */
class TimelineEventService {
  /**
   * Emit/Log a new timeline event.
   */
  async emit(eventData, transaction) {
    const {
      patient_id,
      appointment_id = null,
      event_type,
      title,
      description = null,
      event_date = new Date(),
      actor_id = null,
      resource_type = null,
      resource_id = null,
      metadata = {},
    } = eventData;

    if (!patient_id) {
      throw new Error("patient_id is required to emit a timeline event");
    }
    if (!event_type) {
      throw new Error("event_type is required to emit a timeline event");
    }
    if (!title) {
      throw new Error("title is required to emit a timeline event");
    }

    const event = await TimelineEvent.create(
      {
        event_id: uuidv4(),
        patient_id,
        appointment_id,
        event_type,
        title,
        description,
        event_date,
        actor_id,
        resource_type,
        resource_id,
        metadata,
      },
      { transaction }
    );

    return event.get({ plain: true });
  }

  /**
   * Retrieve unified patient timeline.
   */
  async listForPatient(patientId, options = {}) {
    const { isPatientPortal = false, limit = 50, offset = 0 } = options;

    const whereClause = { patient_id: patientId };

    // Patient portal security: do not expose draft/restricted records
    if (isPatientPortal) {
      // e.g. metadata.status !== 'draft'
      // We can inspect metadata -> status inside JSONB or event type
    }

    const events = await TimelineEvent.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["user_id", "full_name", "email"],
          required: false,
        },
        {
          model: StaffAppointment,
          as: "appointment",
          attributes: ["appointment_id", "workflow_status"],
          required: false,
        },
      ],
      order: [["event_date", "DESC"]],
      limit,
      offset,
    });

    let results = events.map((e) => e.get({ plain: true }));

    // Backwards compatibility fallback: if timeline_events is empty for this patient,
    // let's dynamically import and populate from existing medical history logs and appointments
    if (results.length === 0) {
      await this.backfillTimeline(patientId);
      const reQuery = await TimelineEvent.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "actor",
            attributes: ["user_id", "full_name", "email"],
            required: false,
          },
          {
            model: StaffAppointment,
            as: "appointment",
            attributes: ["appointment_id", "workflow_status"],
            required: false,
          },
        ],
        order: [["event_date", "DESC"]],
        limit,
        offset,
      });
      results = reQuery.map((e) => e.get({ plain: true }));
    }

    // Filter out draft if isPatientPortal
    if (isPatientPortal) {
      results = results.filter((item) => {
        const status = item.metadata?.status || item.metadata?.workflow_status;
        return status !== "draft" && status !== "pending";
      });
    }

    return results;
  }

  /**
   * Automatically backfill timeline events from medical history logs and appointments for demo patient.
   */
  async backfillTimeline(patientId) {
    const logs = await db.MedicalHistoryLog.findAll({
      where: { patient_id: patientId },
      order: [["created_at", "ASC"]],
    });

    const appointments = await db.StaffAppointment.findAll({
      where: { patient_id: patientId },
      order: [["created_at", "ASC"]],
    });

    const t = await db.sequelize.transaction();
    try {
      // 1. Backfill registration
      const patient = await db.User.findByPk(patientId, { transaction: t });
      if (patient) {
        await TimelineEvent.findOrCreate({
          where: {
            patient_id: patientId,
            event_type: "PATIENT_REGISTERED",
          },
          defaults: {
            event_id: uuidv4(),
            patient_id: patientId,
            event_type: "PATIENT_REGISTERED",
            title: "Patient Registered",
            description: `Patient ${patient.full_name} was registered in the system.`,
            event_date: patient.created_at || new Date(),
            metadata: { status: "final" },
          },
          transaction: t,
        });
      }

      // 2. Backfill appointments
      for (const appt of appointments) {
        await TimelineEvent.findOrCreate({
          where: {
            patient_id: patientId,
            resource_type: "StaffAppointment",
            resource_id: appt.appointment_id,
          },
          defaults: {
            event_id: uuidv4(),
            patient_id: patientId,
            appointment_id: appt.appointment_id,
            event_type: "APPOINTMENT_CREATED",
            title: `Appointment Created`,
            description: `Appointment status: ${appt.workflow_status || "admitted"}.`,
            event_date: appt.created_at || new Date(),
            actor_id: appt.admitted_by,
            resource_type: "StaffAppointment",
            resource_id: appt.appointment_id,
            metadata: { workflow_status: appt.workflow_status },
          },
          transaction: t,
        });
      }

      // 3. Backfill consultations/nursing logs
      for (const log of logs) {
        let type = "CONSULTATION";
        if (String(log.header_title).toLowerCase().includes("nursing")) {
          type = "NURSING_ASSESSMENT";
        } else if (String(log.header_title).toLowerCase().includes("lab")) {
          type = "LAB_RESULT";
        }

        await TimelineEvent.findOrCreate({
          where: {
            patient_id: patientId,
            resource_type: "MedicalHistoryLog",
            resource_id: log.log_id,
          },
          defaults: {
            event_id: uuidv4(),
            patient_id: patientId,
            appointment_id: log.appointment_id,
            event_type: type,
            title: log.header_title,
            description: log.notes || `Clinical action: ${log.action_type}`,
            event_date: log.created_at || new Date(),
            actor_id: log.sender_staff_id,
            resource_type: "MedicalHistoryLog",
            resource_id: log.log_id,
            metadata: {
              status: log.status,
              action_type: log.action_type,
              form_config_id: log.form_config_id,
            },
          },
          transaction: t,
        });
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      console.error("Timeline backfill failed:", e.message);
    }
  }
}

module.exports = new TimelineEventService();
