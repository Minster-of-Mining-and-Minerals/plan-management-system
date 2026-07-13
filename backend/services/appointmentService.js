"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const notificationService = require("./notificationService");

const APPOINTMENT_STATUSES = ["admitted", "completed", "cancelled"];

const appointmentIncludes = [
  {
    model: db.User,
    as: "patient",
    attributes: ["user_id", "full_name", "email", "phone_number"],
    include: [
      {
        model: db.PatientProfile,
        as: "patientProfile",
        attributes: ["patient_code", "patient_status"],
      },
    ],
  },
  {
    model: db.User,
    as: "staff",
    attributes: ["user_id", "full_name", "email"],
  },
  {
    model: db.PatientSchedule,
    as: "schedule",
    attributes: [
      "schedule_id",
      "schedule_date",
      "start_time",
      "end_time",
      "status",
      "appointment_type",
      "notes",
    ],
  },
  {
    model: db.User,
    as: "admittedByUser",
    attributes: ["user_id", "full_name"],
  },
];

async function syncFromScheduleAdmission(scheduleRow, admittedByUserId) {
  if (!scheduleRow || scheduleRow.status !== "admitted") {
    return null;
  }

  let appointment = await db.StaffAppointment.findOne({
    where: { schedule_id: scheduleRow.schedule_id },
  });

  const admittedAt = new Date();

  if (appointment) {
    await appointment.update({
      status: "admitted",
      admitted_at: admittedAt,
      admitted_by: admittedByUserId,
      assigned_staff_id: scheduleRow.assigned_staff_id,
      patient_id: scheduleRow.patient_id,
      notes: scheduleRow.notes ?? appointment.notes,
    });
  } else {
    appointment = await db.StaffAppointment.create({
      appointment_id: uuidv4(),
      schedule_id: scheduleRow.schedule_id,
      patient_id: scheduleRow.patient_id,
      assigned_staff_id: scheduleRow.assigned_staff_id,
      admitted_by: admittedByUserId,
      admitted_at: admittedAt,
      status: "admitted",
      notes: scheduleRow.notes || null,
    });

    const patient = await db.User.findByPk(scheduleRow.patient_id, {
      include: [{ model: db.PatientProfile, as: "patientProfile" }],
    });
    const patientName = patient?.full_name || "Patient";
    const code = patient?.patientProfile?.patient_code || "";

    await notificationService.notifyInternalUser(scheduleRow.assigned_staff_id, {
      title: "New patient appointment assigned",
      message: `${patientName}${code ? ` (${code})` : ""} has been admitted and is waiting for you.`,
      category: "appointments",
      relatedType: "appointment",
      relatedId: appointment.appointment_id,
    });
  }

  return appointment;
}

async function syncFromScheduleStatusChange(previousStatus, scheduleRow, actorId) {
  if (scheduleRow.status === "admitted") {
    return syncFromScheduleAdmission(scheduleRow, actorId);
  }

  const appointment = await db.StaffAppointment.findOne({
    where: { schedule_id: scheduleRow.schedule_id },
  });

  if (!appointment) {
    return null;
  }

  if (scheduleRow.status === "cancelled") {
    await appointment.update({ status: "cancelled" });
  } else if (scheduleRow.status === "completed") {
    await appointment.update({ status: "completed" });
  }

  return appointment;
}

async function getPendingForwardAppointmentIds(staffId) {
  const tasks = await db.WorkflowTask.findAll({
    where: { assignee_staff_id: staffId, status: "pending" },
    attributes: ["appointment_id"],
    raw: true,
  });
  return new Set(tasks.map((t) => t.appointment_id).filter(Boolean));
}

function attachWorkflowAccess(plain, staffId, pendingForwardIds) {
  const isAssigned = plain.assigned_staff_id === staffId;
  const isForwarded =
    !isAssigned && pendingForwardIds.has(plain.appointment_id);
  return {
    ...plain,
    workflow_access: {
      is_assigned_to_me: isAssigned,
      is_forwarded_to_me: isForwarded,
    },
  };
}

function filterAppointmentsBySearch(rows, search) {
  if (!search?.trim()) return rows;
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    const plain = row.get({ plain: true });
    const name = plain.patient?.full_name?.toLowerCase() || "";
    const code =
      plain.patient?.patientProfile?.patient_code?.toLowerCase() || "";
    const email = plain.patient?.email?.toLowerCase() || "";
    const phone = plain.patient?.phone_number?.toLowerCase() || "";
    return (
      name.includes(q) ||
      code.includes(q) ||
      email.includes(q) ||
      phone.includes(q)
    );
  });
}

async function listAppointmentsForStaff(
  staffId,
  { search, status, sort = "admitted_at", order = "DESC", schedule_date } = {}
) {
  const statusWhere = status
    ? { status }
    : { status: { [Op.ne]: "cancelled" } };

  const includes = appointmentIncludes.map((inc) => {
    if (inc.as === "schedule" && schedule_date) {
      return { ...inc, where: { schedule_date }, required: true };
    }
    return inc;
  });

  // Appointments list is reception-admitted visits assigned to this staff only.
  // Forwards from other clinicians appear in the workflow inbox, not here.
  const rows = await db.StaffAppointment.findAll({
    where: { assigned_staff_id: staffId, ...statusWhere },
    include: includes,
    order: [[sort, order]],
  });

  return filterAppointmentsBySearch(rows, search);
}

async function getAppointmentById(appointmentId, { staffId } = {}) {
  if (staffId) {
    const { canAccessAppointment } = require("./medicalWorkflowService");
    return canAccessAppointment(appointmentId, staffId);
  }

  const row = await db.StaffAppointment.findOne({
    where: { appointment_id: appointmentId },
    include: appointmentIncludes,
  });

  if (!row) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }

  return row;
}

async function getAppointmentForStaff(appointmentId, staffId) {
  const row = await getAppointmentById(appointmentId, { staffId });
  const pendingForwardIds = await getPendingForwardAppointmentIds(staffId);
  return attachWorkflowAccess(row.get({ plain: true }), staffId, pendingForwardIds);
}

async function listAppointmentsForStaffWithAccess(staffId, options = {}) {
  const rows = await listAppointmentsForStaff(staffId, options);
  const pendingForwardIds = await getPendingForwardAppointmentIds(staffId);
  const withAccess = rows.map((row) =>
    attachWorkflowAccess(row.get({ plain: true }), staffId, pendingForwardIds)
  );

  const appointmentIds = withAccess.map((row) => row.appointment_id);
  const {
    getBillingSummariesForAppointments,
  } = require("./cashierPaymentService");
  const billingMap = await getBillingSummariesForAppointments(appointmentIds);

  return withAccess.map((row) => ({
    ...row,
    billing_summary: billingMap.get(row.appointment_id) || null,
  }));
}

async function userCanReceiveAppointments(userId) {
  const scheduleService = require("./patientScheduleService");
  return scheduleService.staffHasReceiveAppointmentPermission(userId);
}

async function userCanReceivePatients(userId) {
  const scheduleService = require("./patientScheduleService");
  return scheduleService.staffHasReceivePatientPermission(userId);
}

module.exports = {
  APPOINTMENT_STATUSES,
  syncFromScheduleAdmission,
  syncFromScheduleStatusChange,
  listAppointmentsForStaff,
  listAppointmentsForStaffWithAccess,
  getAppointmentById,
  getAppointmentForStaff,
  userCanReceiveAppointments,
  userCanReceivePatients,
};
