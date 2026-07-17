"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const notificationService = require("./notificationService");
const prescriptionService = require("./prescriptionService");
const timelineEventService = require("./timelineEventService");
const {
  getSettings,
  getEligibleStaff,
  listSchedules,
  createSchedule,
  updateSchedule,
  getSlotsForDate,
} = require("./patientScheduleService");
const { parseTimeToMinutes, minutesToTime } = require("../utils/scheduleSlots");

function normalizeSlotTime(timeStr) {
  if (!timeStr) return "";
  return minutesToTime(parseTimeToMinutes(timeStr));
}
const {
  getCustomValuesMap,
  enrichPatientResponse,
} = require("./patientFieldValueService");
const { getFormFieldsByModel } = require("./formFieldService");
const { PATIENT_MODEL_NAME } = require("../config/userFormConstants");
const { ACCOUNT_TYPES } = require("../config/accountTypes");

const UPCOMING_STATUSES = ["scheduled", "pending", "updated", "rescheduled", "admitted"];

function formatDateOnly(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function mapScheduleRow(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    schedule_id: plain.schedule_id,
    schedule_date: plain.schedule_date,
    start_time: plain.start_time,
    end_time: plain.end_time,
    status: plain.status,
    appointment_type: plain.appointment_type,
    notes: plain.notes,
    doctor: plain.staff
      ? {
          id: plain.staff.user_id,
          name: plain.staff.full_name,
          email: plain.staff.email,
        }
      : null,
    visit: plain.staffAppointment
      ? {
          appointment_id: plain.staffAppointment.appointment_id,
          status: plain.staffAppointment.status,
          workflow_status: plain.staffAppointment.workflow_status,
        }
      : null,
  };
}

async function assertOwnSchedule(scheduleId, patientId) {
  const row = await db.PatientSchedule.findByPk(scheduleId);
  if (!row || row.patient_id !== patientId) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }
  return row;
}

async function getMe(patientId) {
  const user = await db.User.findOne({
    where: { user_id: patientId, account_type: ACCOUNT_TYPES.PATIENT },
    attributes: { exclude: ["password", "otp", "otp_expiry"] },
    include: [{ model: db.PatientProfile, as: "patientProfile" }],
  });
  if (!user) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }
  const formFields = await getFormFieldsByModel(PATIENT_MODEL_NAME);
  const custom_fields = await getCustomValuesMap(patientId, formFields);
  return enrichPatientResponse(
    user,
    user.patientProfile || user.profile,
    custom_fields
  );
}

async function updateMe(patientId, body = {}) {
  const user = await db.User.findByPk(patientId);
  if (!user || user.account_type !== ACCOUNT_TYPES.PATIENT) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }

  if (body.phone_number !== undefined) {
    await user.update({ phone_number: body.phone_number || null });
  }

  const profile = await db.PatientProfile.findOne({ where: { user_id: patientId } });
  if (profile) {
    const profilePatch = {};
    if (body.emergency_contacts !== undefined) {
      profilePatch.emergency_contacts = body.emergency_contacts;
    }
    if (body.insurance_profile !== undefined) {
      profilePatch.insurance_profile = body.insurance_profile;
    }
    if (body.preferred_language !== undefined) {
      profilePatch.preferred_language = body.preferred_language;
    }
    if (Object.keys(profilePatch).length) {
      await profile.update(profilePatch);
    }
  }

  return getMe(patientId);
}

async function listMySchedules(patientId, { from, to, status } = {}) {
  const rows = await listSchedules({ patient_id: patientId, from, to, status });
  return rows.map(mapScheduleRow);
}

async function listEligibleDoctors() {
  const staff = await getEligibleStaff();
  return staff.map((u) => {
    const plain = u.get ? u.get({ plain: true }) : u;
    const dept = plain.internalProfile?.departmentRef;
    return {
      id: plain.user_id,
      name: plain.full_name,
      department: dept?.name || null,
      department_code: dept?.code || null,
    };
  });
}

async function getAvailability({ date, staff_id, exclude_schedule_id }) {
  if (!date) {
    const err = new Error("date is required");
    err.status = 400;
    throw err;
  }
  const settings = await getSettings();
  const allSlots = getSlotsForDate(date, settings);
  let slots = allSlots;

  if (staff_id) {
    const booked = await db.PatientSchedule.findAll({
      where: {
        assigned_staff_id: staff_id,
        schedule_date: date,
        status: { [Op.notIn]: ["cancelled", "completed"] },
        ...(exclude_schedule_id
          ? { schedule_id: { [Op.ne]: exclude_schedule_id } }
          : {}),
      },
      attributes: ["start_time"],
    });
    const taken = new Set(booked.map((b) => normalizeSlotTime(b.start_time)));
    slots = allSlots.filter((s) => !taken.has(s));
  }

  return { date, staff_id: staff_id || null, slots };
}

async function bookSchedule(patientId, payload) {
  const { assigned_staff_id, schedule_date, start_time, appointment_type, notes } =
    payload;
  if (!assigned_staff_id || !schedule_date || !start_time) {
    const err = new Error("Doctor, date, and time are required");
    err.status = 400;
    throw err;
  }

  const row = await createSchedule(
    {
      patient_id: patientId,
      assigned_staff_id,
      schedule_date,
      start_time,
      appointment_type: appointment_type || "Outpatient visit",
      notes: notes || null,
      status: "scheduled",
    },
    patientId
  );

  return mapScheduleRow(row);
}

async function rescheduleSchedule(patientId, scheduleId, payload) {
  await assertOwnSchedule(scheduleId, patientId);
  const row = await updateSchedule(
    scheduleId,
    {
      schedule_date: payload.schedule_date,
      start_time: payload.start_time,
      assigned_staff_id: payload.assigned_staff_id,
    },
    patientId
  );
  return mapScheduleRow(row);
}

async function cancelSchedule(patientId, scheduleId) {
  await assertOwnSchedule(scheduleId, patientId);
  const row = await updateSchedule(
    scheduleId,
    { status: "cancelled" },
    patientId
  );
  return mapScheduleRow(row);
}

async function listMyPrescriptions(patientId) {
  const rows = await prescriptionService.list({ patient_id: patientId });
  return rows.map((rx) => ({
    prescription_id: rx.prescription_id,
    status: rx.status,
    created_at: rx.created_at,
    notes: rx.notes,
    category: rx.category?.name || rx.template?.category?.name || null,
    template_name: rx.template?.name || null,
    prescriber: rx.prescriber
      ? { id: rx.prescriber.user_id, name: rx.prescriber.full_name }
      : null,
    item_count: Array.isArray(rx.items) ? rx.items.length : 0,
  }));
}

async function listMedicalHistory(patientId) {
  const events = await timelineEventService.listForPatient(patientId, { isPatientPortal: true });
  return events.map((e) => {
    let type = "visit";
    const eType = String(e.event_type).toLowerCase();
    if (eType.includes("prescription") || eType.includes("medication") || eType.includes("treatment")) {
      type = "treatment";
    } else if (eType.includes("allergy")) {
      type = "allergy";
    } else if (eType.includes("vitals") || eType.includes("nursing")) {
      type = "condition";
    } else if (eType.includes("diagnosis")) {
      type = "diagnosis";
    }
    return {
      id: e.event_id,
      date: e.event_date,
      title: e.title,
      type,
      action_type: e.metadata?.action_type || "emit",
      status: e.metadata?.status || "final",
      provider: e.actor?.full_name || null,
      summary: e.description || null,
      appointment_id: e.appointment_id || undefined,
    };
  });
}

async function getDashboard(patientId) {
  const today = formatDateOnly();
  const schedules = await listMySchedules(patientId, { from: today });
  const upcoming = schedules.filter((s) => UPCOMING_STATUSES.includes(s.status));
  const prescriptions = await listMyPrescriptions(patientId);
  const unread = await notificationService.unreadCount(patientId);

  const activeRx = prescriptions.filter(
    (p) => p.status === "active" || p.status === "finalized"
  );

  return {
    next_appointment: upcoming[0] || null,
    upcoming_count: upcoming.length,
    active_prescriptions_count: activeRx.length,
    unread_notifications_count: unread,
    recent_prescriptions: prescriptions.slice(0, 3),
    upcoming_appointments: upcoming.slice(0, 5),
  };
}

module.exports = {
  getMe,
  updateMe,
  getDashboard,
  listMySchedules,
  listEligibleDoctors,
  getAvailability,
  bookSchedule,
  rescheduleSchedule,
  cancelSchedule,
  listMyPrescriptions,
  listMedicalHistory,
};
