"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { DEFAULT_SCHEDULE_SETTINGS, SCHEDULE_STATUSES } = require("../config/defaultScheduleSettings");
const {
  generateSlotsForDay,
  getEndTimeFromStart,
  timesOverlap,
  addMinutesToTime,
  formatDateOnly,
  addDaysToDate,
  parseTimeToMinutes,
} = require("../utils/scheduleSlots");

const ACTIVE_STATUSES = ["scheduled", "pending", "admitted", "updated", "rescheduled", "completed"];

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

async function staffHasReceivePermission(staffId) {
  const user = await db.User.findOne({
    where: { user_id: staffId, account_type: "INTERNAL", is_active: true },
    include: [
      {
        model: db.Role,
        as: "roles",
        through: { attributes: [] },
        include: [
          {
            model: db.RolePermission,
            as: "rolePermissions",
            include: [
              {
                model: db.Permission,
                as: "permission",
                where: {
                  resource: "patients",
                  action: "receive_patient",
                  is_active: true,
                },
                required: true,
              },
            ],
          },
        ],
      },
    ],
  });

  if (!user) return false;
  const hasRolePerm = (user.roles || []).some((r) =>
    (r.rolePermissions || []).some((rp) => rp.permission)
  );
  if (hasRolePerm) return true;

  const superAdmin = await db.User.findByPk(staffId, {
    include: [
      {
        model: db.Role,
        as: "roles",
        where: { name: "Super Admin" },
        required: false,
      },
    ],
  });
  return (superAdmin?.roles || []).length > 0;
}

async function getEligibleStaff() {
  const users = await db.User.findAll({
    where: { account_type: "INTERNAL", is_active: true },
    attributes: ["user_id", "full_name", "email", "phone_number", "profile_image"],
    include: [
      {
        model: db.InternalUserProfile,
        as: "internalProfile",
        required: false,
        include: [
          { model: db.Department, as: "departmentRef", attributes: ["name", "code"] },
          { model: db.UserTitle, as: "titleRef", attributes: ["name", "code"] },
        ],
      },
      {
        model: db.Role,
        as: "roles",
        through: { attributes: [] },
        include: [
          {
            model: db.RolePermission,
            as: "rolePermissions",
            include: [{ model: db.Permission, as: "permission" }],
          },
        ],
      },
    ],
    order: [["full_name", "ASC"]],
  });

  return users.filter((u) => {
    const plain = u.get({ plain: true });
    if ((plain.roles || []).some((r) => r.name === "Super Admin")) return true;
    return (plain.roles || []).some((r) =>
      (r.rolePermissions || []).some(
        (rp) =>
          rp.permission?.resource === "patients" &&
          rp.permission?.action === "receive_patient"
      )
    );
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

  const canReceive = await staffHasReceivePermission(assigned_staff_id);
  if (!canReceive) {
    const err = new Error("Selected staff cannot receive patients");
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

  const schedule_date = payload.schedule_date ?? row.schedule_date;
  const start_time = payload.start_time ?? row.start_time;
  const assigned_staff_id = payload.assigned_staff_id ?? row.assigned_staff_id;
  const status = payload.status ?? row.status;

  if (status && !SCHEDULE_STATUSES.includes(status)) {
    const err = new Error("Invalid status");
    err.status = 400;
    throw err;
  }

  const end_time = getEndTimeFromStart(start_time, settings.slot_interval_minutes);

  if (status !== "cancelled") {
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
    if (status !== "cancelled") {
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
        status,
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
    return db.PatientSchedule.findByPk(scheduleId, {
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
}) {
  const settings = await getSettings();
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
      let newDate = row.schedule_date;
      let newStart = row.start_time;

      if (shift_days) {
        newDate = addDaysToDate(row.schedule_date, shift_days);
      }
      if (shift_minutes) {
        newStart = addMinutesToTime(row.start_time, shift_minutes);
      }

      const newEnd = getEndTimeFromStart(newStart, settings.slot_interval_minutes);

      if (!isDateInHorizon(newDate, settings) || !isDayActive(newDate, settings)) {
        const err = new Error(
          `Shift would place appointment on invalid date: ${newDate}`
        );
        err.status = 400;
        throw err;
      }

      const slots = getSlotsForDate(newDate, settings);
      if (!slots.includes(newStart)) {
        const err = new Error(
          `No valid slot at ${newDate} ${newStart} after shift`
        );
        err.status = 409;
        throw err;
      }

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
  createSchedule,
  updateSchedule,
  getSlotsForDate,
  buildMatrixMeta,
  shiftSchedules,
  staffHasReceivePermission,
};
