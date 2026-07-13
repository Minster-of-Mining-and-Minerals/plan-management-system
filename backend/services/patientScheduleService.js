"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { DEFAULT_SCHEDULE_SETTINGS, SCHEDULE_STATUSES } = require("../config/defaultScheduleSettings");
const {
  generateSlotsForDay,
  getEndTimeFromStart,
  timesOverlap,
  formatDateOnly,
  addDaysToDate,
} = require("../utils/scheduleSlots");
const {
  computeShiftedDateTime,
  rowMatchesShiftRange,
} = require("../utils/scheduleShift");
const {
  userHasPermission,
  listUsersWithPermission,
} = require("./userPermissionService");

const ACTIVE_STATUSES = ["scheduled", "pending", "admitted", "updated", "rescheduled", "completed"];

function assertAdmissionDateIsToday(scheduleDate) {
  const today = formatDateOnly(new Date());
  if (scheduleDate !== today) {
    const err = new Error(
      "Patients can only be admitted on the day of their appointment (today)"
    );
    err.status = 400;
    throw err;
  }
}

async function getSettings() {
  let row = await db.ScheduleSetting.findOne({ order: [["created_at", "ASC"]] });
  if (!row) {
    row = await db.ScheduleSetting.create({
      schedule_setting_id: uuidv4(),
      ...DEFAULT_SCHEDULE_SETTINGS,
      days_config: DEFAULT_SCHEDULE_SETTINGS.days_config,
    });
  }
  const plain = row.get({ plain: true });
  if (typeof plain.days_config === "string") {
    plain.days_config = JSON.parse(plain.days_config);
  }
  return plain;
}

async function updateSettings(payload, userId) {
  const row = await db.ScheduleSetting.findOne({ order: [["created_at", "ASC"]] });
  if (!row) throw new Error("Schedule settings not initialized");

  await row.update({
    slot_interval_minutes: payload.slot_interval_minutes ?? row.slot_interval_minutes,
    horizon_days: payload.horizon_days ?? row.horizon_days,
    days_config: payload.days_config ?? row.days_config,
    updated_by: userId,
  });

  return getSettings();
}

function getDayOfWeek(dateStr) {
  return String(new Date(`${dateStr}T12:00:00`).getDay());
}

function isDateInHorizon(dateStr, settings) {
  const today = formatDateOnly(new Date());
  const max = addDaysToDate(today, settings.horizon_days || 365);
  return dateStr >= today && dateStr <= max;
}

function isDayActive(dateStr, settings) {
  const dow = getDayOfWeek(dateStr);
  const dayCfg = settings.days_config?.[dow];
  return Boolean(dayCfg?.active);
}

function getSlotsForDate(dateStr, settings) {
  if (!isDateInHorizon(dateStr, settings)) return [];
  if (!isDayActive(dateStr, settings)) return [];
  const dow = getDayOfWeek(dateStr);
  const dayCfg = settings.days_config[dow];
  return generateSlotsForDay(dayCfg, settings.slot_interval_minutes);
}

async function staffHasReceivePatientPermission(staffId) {
  return userHasPermission(staffId, "patients", "receive_patient");
}

async function staffHasReceiveAppointmentPermission(staffId) {
  return userHasPermission(staffId, "patients", "receive_appointment");
}

/** @deprecated Use staffHasReceivePatientPermission or staffHasReceiveAppointmentPermission */
async function staffHasReceivePermission(staffId) {
  return staffHasReceivePatientPermission(staffId);
}

async function getEligibleStaff() {
  return listUsersWithPermission("patients", "receive_appointment", {
    extraIncludes: [
      {
        model: db.InternalUserProfile,
        as: "internalProfile",
        required: false,
        include: [
          { model: db.Department, as: "departmentRef", attributes: ["name", "code"] },
          { model: db.UserTitle, as: "titleRef", attributes: ["name", "code"] },
        ],
      },
    ],
  });
}

async function findOverlapping(staffId, date, startTime, endTime, excludeId, transaction) {
  const rows = await db.PatientSchedule.findAll({
    where: {
      assigned_staff_id: staffId,
      schedule_date: date,
      status: { [Op.in]: ACTIVE_STATUSES.filter((s) => s !== "cancelled") },
      ...(excludeId ? { schedule_id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  });

  return rows.filter((r) => {
    if (r.status === "cancelled") return false;
    return timesOverlap(startTime, endTime, r.start_time, r.end_time);
  });
}

async function getStaffScheduleCounts({ from, to }) {
  const today = formatDateOnly(new Date());
  const fromDate = from || today;
  const toDate = to || addDaysToDate(fromDate, 6);

  const blockingStatuses = ACTIVE_STATUSES.filter((s) => s !== "cancelled");

  const rows = await db.PatientSchedule.findAll({
    attributes: [
      "assigned_staff_id",
      [db.sequelize.fn("COUNT", db.sequelize.col("schedule_id")), "count"],
    ],
    where: {
      schedule_date: { [Op.between]: [fromDate, toDate] },
      status: { [Op.in]: blockingStatuses },
    },
    group: ["assigned_staff_id"],
    raw: true,
  });

  const counts = {};
  for (const row of rows) {
    counts[row.assigned_staff_id] = Number(row.count) || 0;
  }
  return { from: fromDate, to: toDate, counts };
}

async function listSchedules({ staff_id, from, to, patient_id, status }) {
  const where = {};
  if (staff_id) where.assigned_staff_id = staff_id;
  if (patient_id) where.patient_id = patient_id;
  if (from && to) {
    where.schedule_date = { [Op.between]: [from, to] };
  } else if (from) {
    where.schedule_date = { [Op.gte]: from };
  }
  if (status) where.status = status;

  return db.PatientSchedule.findAll({
    where,
    include: [
      {
        model: db.User,
        as: "patient",
        attributes: ["user_id", "full_name", "email", "phone_number"],
        include: [
          {
            model: db.PatientProfile,
            as: "patientProfile",
            attributes: ["patient_code"],
          },
        ],
      },
      {
        model: db.User,
        as: "staff",
        attributes: ["user_id", "full_name", "email"],
      },
      {
        model: db.StaffAppointment,
        as: "staffAppointment",
        attributes: ["appointment_id", "status", "workflow_status"],
        required: false,
      },
    ],
    order: [
      ["schedule_date", "ASC"],
      ["start_time", "ASC"],
    ],
  });
}

async function createSchedule(payload, actorId) {
  const settings = await getSettings();
  const {
    patient_id,
    assigned_staff_id,
    schedule_date,
    start_time,
    appointment_type,
    notes,
    status = "scheduled",
  } = payload;

  if (!SCHEDULE_STATUSES.includes(status)) {
    const err = new Error(`Invalid status. Allowed: ${SCHEDULE_STATUSES.join(", ")}`);
    err.status = 400;
    throw err;
  }

  if (status === "admitted") {
    assertAdmissionDateIsToday(schedule_date);
  }

  if (!isDateInHorizon(schedule_date, settings)) {
    const err = new Error("Schedule date is outside allowed range");
    err.status = 400;
    throw err;
  }

  if (!isDayActive(schedule_date, settings)) {
    const err = new Error("Scheduling is not allowed on this day of week");
    err.status = 400;
    throw err;
  }

  const slots = getSlotsForDate(schedule_date, settings);
  if (!slots.includes(start_time)) {
    const err = new Error("Invalid or unavailable time slot");
    err.status = 400;
    throw err;
  }

  const canReceive = await staffHasReceiveAppointmentPermission(assigned_staff_id);
  if (!canReceive) {
    const err = new Error("Selected staff cannot receive appointments");
    err.status = 400;
    throw err;
  }

  const end_time = getEndTimeFromStart(start_time, settings.slot_interval_minutes);

  const t = await db.sequelize.transaction();
  try {
    const overlaps = await findOverlapping(
      assigned_staff_id,
      schedule_date,
      start_time,
      end_time,
      null,
      t
    );
    if (overlaps.length) {
      const err = new Error("Time slot is already booked");
      err.status = 409;
      throw err;
    }

    const schedule = await db.PatientSchedule.create(
      {
        schedule_id: uuidv4(),
        patient_id,
        assigned_staff_id,
        schedule_date,
        start_time,
        end_time,
        status,
        appointment_type: appointment_type || null,
        notes: notes || null,
        created_by: actorId,
        updated_by: actorId,
      },
      { transaction: t }
    );

    await t.commit();
    return listSchedules({
      staff_id: assigned_staff_id,
      from: schedule_date,
      to: schedule_date,
    }).then((rows) => rows.find((r) => r.schedule_id === schedule.schedule_id) || schedule);
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function updateSchedule(scheduleId, payload, actorId) {
  const settings = await getSettings();
  const row = await db.PatientSchedule.findByPk(scheduleId);
  if (!row) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }

  const previousStatus = row.status;

  const schedule_date = payload.schedule_date ?? row.schedule_date;
  const start_time = payload.start_time ?? row.start_time;
  const assigned_staff_id = payload.assigned_staff_id ?? row.assigned_staff_id;
  const status = payload.status ?? row.status;

  if (status && !SCHEDULE_STATUSES.includes(status)) {
    const err = new Error("Invalid status");
    err.status = 400;
    throw err;
  }

  if (status === "admitted" && previousStatus !== "admitted") {
    assertAdmissionDateIsToday(schedule_date);
  }

  if (status === "cancelled") {
    if (row.status !== "scheduled") {
      const err = new Error(
        "Only scheduled appointments can be cancelled"
      );
      err.status = 400;
      throw err;
    }
    const today = formatDateOnly(new Date());
    if (schedule_date < today) {
      const err = new Error("Cannot cancel appointments in the past");
      err.status = 400;
      throw err;
    }
  }

  const dateTimeChanged =
    schedule_date !== row.schedule_date || start_time !== row.start_time;

  if (dateTimeChanged) {
    if (["admitted", "cancelled"].includes(row.status)) {
      const err = new Error(
        "Admitted or cancelled appointments cannot be rescheduled"
      );
      err.status = 400;
      throw err;
    }
    const today = formatDateOnly(new Date());
    if (schedule_date < today) {
      const err = new Error("Cannot reschedule to a past date");
      err.status = 400;
      throw err;
    }
  }

  let resolvedStatus = status;
  if (
    dateTimeChanged &&
    ["scheduled", "pending", "updated", "rescheduled"].includes(row.status)
  ) {
    resolvedStatus = "rescheduled";
  }

  const end_time = getEndTimeFromStart(start_time, settings.slot_interval_minutes);

  if (resolvedStatus !== "cancelled") {
    if (!isDateInHorizon(schedule_date, settings)) {
      const err = new Error("Schedule date is outside allowed range");
      err.status = 400;
      throw err;
    }
    if (!isDayActive(schedule_date, settings)) {
      const err = new Error("Scheduling is not allowed on this day");
      err.status = 400;
      throw err;
    }
    const slots = getSlotsForDate(schedule_date, settings);
    if (!slots.includes(start_time)) {
      const err = new Error("Invalid time slot");
      err.status = 400;
      throw err;
    }
  }

  const t = await db.sequelize.transaction();
  try {
    if (resolvedStatus !== "cancelled") {
      const overlaps = await findOverlapping(
        assigned_staff_id,
        schedule_date,
        start_time,
        end_time,
        scheduleId,
        t
      );
      if (overlaps.length) {
        const err = new Error("Time slot conflict");
        err.status = 409;
        throw err;
      }
    }

    await row.update(
      {
        patient_id: payload.patient_id ?? row.patient_id,
        assigned_staff_id,
        schedule_date,
        start_time,
        end_time,
        status: resolvedStatus,
        appointment_type:
          payload.appointment_type !== undefined
            ? payload.appointment_type
            : row.appointment_type,
        notes: payload.notes !== undefined ? payload.notes : row.notes,
        updated_by: actorId,
      },
      { transaction: t }
    );

    await t.commit();

    const updated = await db.PatientSchedule.findByPk(scheduleId, {
      include: [
        {
          model: db.User,
          as: "patient",
          attributes: ["user_id", "full_name", "email"],
          include: [
            {
              model: db.PatientProfile,
              as: "patientProfile",
              attributes: ["patient_code"],
            },
          ],
        },
        { model: db.User, as: "staff", attributes: ["user_id", "full_name"] },
      ],
    });

    if (resolvedStatus === "admitted" && previousStatus !== "admitted") {
      const appointmentService = require("./appointmentService");
      await appointmentService.syncFromScheduleAdmission(updated, actorId);
    } else if (previousStatus === "admitted" || resolvedStatus !== previousStatus) {
      const appointmentService = require("./appointmentService");
      await appointmentService.syncFromScheduleStatusChange(
        previousStatus,
        updated,
        actorId
      );
    }

    return updated;
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function shiftSchedules({
  assigned_staff_id,
  from_date,
  to_date,
  shift_minutes = 0,
  shift_days = 0,
  anchor_date,
  anchor_time,
  end_date,
  end_time,
  range_mode = "from_start_to_end",
}) {
  if (!shift_minutes && !shift_days) {
    const err = new Error("Specify shift_minutes and/or shift_days");
    err.status = 400;
    throw err;
  }

  const settings = await getSettings();
  if (!settings) {
    const err = new Error("Schedule settings are not configured");
    err.status = 500;
    throw err;
  }

  const normalizedMinutes =
    shift_minutes != null && shift_minutes !== 0
      ? Math.round(Number(shift_minutes) / 5) * 5
      : 0;

  if (shift_minutes && normalizedMinutes === 0) {
    const err = new Error(
      "Time shift must be a non-zero multiple of 5 minutes (e.g. 5, 10, -15)"
    );
    err.status = 400;
    throw err;
  }

  const shiftHelpers = {
    getSlotsForDate: (dateStr) => getSlotsForDate(dateStr, settings),
    isDateInHorizon: (dateStr) => isDateInHorizon(dateStr, settings),
    isDayActive: (dateStr) => isDayActive(dateStr, settings),
  };

  const where = {
    assigned_staff_id,
    status: { [Op.in]: ACTIVE_STATUSES.filter((s) => s !== "cancelled") },
  };
  if (from_date && to_date) {
    where.schedule_date = { [Op.between]: [from_date, to_date] };
  } else if (from_date) {
    where.schedule_date = { [Op.gte]: from_date };
  }

  const rows = await db.PatientSchedule.findAll({
    where,
    order: [
      ["schedule_date", "ASC"],
      ["start_time", "ASC"],
    ],
  });

  const t = await db.sequelize.transaction();
  const updates = [];

  try {
    for (const row of rows) {
      if (
        !rowMatchesShiftRange(row, {
          anchor_date,
          anchor_time,
          end_date,
          end_time,
          range_mode,
        })
      ) {
        continue;
      }

      const { date: newDate, time: newStart } = computeShiftedDateTime(
        row.schedule_date,
        row.start_time,
        normalizedMinutes,
        shift_days,
        settings,
        shiftHelpers
      );

      const newEnd = getEndTimeFromStart(newStart, settings.slot_interval_minutes);

      const overlaps = await findOverlapping(
        assigned_staff_id,
        newDate,
        newStart,
        newEnd,
        row.schedule_id,
        t
      );
      if (overlaps.length) {
        const err = new Error("Shift causes overlapping appointments");
        err.status = 409;
        throw err;
      }

      updates.push({ row, newDate, newStart, newEnd });
    }

    for (const { row, newDate, newStart, newEnd } of updates) {
      await row.update(
        {
          schedule_date: newDate,
          start_time: newStart,
          end_time: newEnd,
          status: row.status === "scheduled" ? "rescheduled" : row.status,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return { shifted: updates.length };
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

function buildMatrixMeta(fromDate, toDate, settings) {
  const dates = [];
  let d = fromDate;
  while (d <= toDate) {
    dates.push({
      date: d,
      dayOfWeek: getDayOfWeek(d),
      active: isDayActive(d, settings),
      slots: getSlotsForDate(d, settings),
    });
    d = addDaysToDate(d, 1);
  }
  return { dates, settings };
}

module.exports = {
  SCHEDULE_STATUSES,
  getSettings,
  updateSettings,
  getEligibleStaff,
  listSchedules,
  getStaffScheduleCounts,
  createSchedule,
  updateSchedule,
  getSlotsForDate,
  buildMatrixMeta,
  shiftSchedules,
  staffHasReceivePermission,
  staffHasReceivePatientPermission,
  staffHasReceiveAppointmentPermission,
};
