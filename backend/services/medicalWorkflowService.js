"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { LOG_ACTION_TYPES } = require("../config/medicalWorkflowConstants");
const { validateDiagnosisFormData } = require("./dynamicDiagnosisValidationService");
const diagnosisFormConfigService = require("./diagnosisFormConfigService");
const appointmentService = require("./appointmentService");
const notificationService = require("./notificationService");
const { listUsersWithPermission } = require("./userPermissionService");

const logIncludes = [
  {
    model: db.User,
    as: "sender",
    attributes: ["user_id", "full_name", "email"],
    include: [
      {
        model: db.InternalUserProfile,
        as: "internalProfile",
        required: false,
        include: [
          { model: db.Department, as: "departmentRef", attributes: ["department_id", "name"] },
          { model: db.UserTitle, as: "titleRef", attributes: ["title_id", "name"] },
        ],
      },
    ],
  },
  {
    model: db.User,
    as: "receiver",
    attributes: ["user_id", "full_name", "email"],
    include: [
      {
        model: db.InternalUserProfile,
        as: "internalProfile",
        required: false,
        include: [
          { model: db.Department, as: "departmentRef", attributes: ["department_id", "name"] },
        ],
      },
    ],
  },
  {
    model: db.DiagnosisFormConfig,
    as: "formConfig",
    attributes: ["config_id", "title"],
    required: false,
  },
];

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
    attributes: ["user_id", "full_name"],
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
    ],
  },
];

async function userCanReceivePatients(userId) {
  return appointmentService.userCanReceivePatients(userId);
}

async function getAppointmentRow(appointmentId) {
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

async function canAccessAppointment(appointmentId, userId) {
  const appointment = await getAppointmentRow(appointmentId);
  if (appointment.assigned_staff_id === userId) return appointment;

  const pendingTask = await db.WorkflowTask.findOne({
    where: {
      appointment_id: appointmentId,
      assignee_staff_id: userId,
      status: "pending",
    },
  });
  if (pendingTask) return appointment;

  const inHistory = await db.MedicalHistoryLog.findOne({
    where: {
      appointment_id: appointmentId,
      [Op.or]: [{ sender_staff_id: userId }, { receiver_staff_id: userId }],
    },
  });
  if (inHistory) return appointment;

  if (!(await userCanReceivePatients(userId))) {
    const err = new Error("You do not have access to this appointment workflow");
    err.status = 403;
    throw err;
  }

  return appointment;
}

async function resolveFormPayload(staffId, { form_config_id, form_data, partial }) {
  let configId = form_config_id;
  if (!configId) {
    const { config } = await diagnosisFormConfigService.getConfigForStaff(staffId);
    if (!config) {
      const err = new Error(
        "No diagnosis form assigned to your staff account. Configure a template first."
      );
      err.status = 400;
      throw err;
    }
    configId = config.config_id;
  }

  const normalized = await validateDiagnosisFormData(configId, form_data || {}, {
    partial: Boolean(partial),
  });

  return { configId, normalized };
}

function mapLogStatus(actionType) {
  switch (actionType) {
    case "forward":
      return "forwarded";
    case "return":
      return "returned";
    case "prescribe":
      return "prescribed";
    case "complete":
      return "completed";
    default:
      return "submitted";
  }
}

async function closePendingTasksForStaff(appointmentId, staffId, transaction) {
  await db.WorkflowTask.update(
    { status: "done" },
    {
      where: {
        appointment_id: appointmentId,
        assignee_staff_id: staffId,
        status: "pending",
      },
      transaction,
    }
  );
}

async function createWorkflowTask(
  {
    appointmentId,
    patientId,
    assigneeStaffId,
    assignedByStaffId,
    medicalLogId,
  },
  transaction
) {
  return db.WorkflowTask.create(
    {
      task_id: uuidv4(),
      appointment_id: appointmentId,
      patient_id: patientId,
      assignee_staff_id: assigneeStaffId,
      assigned_by_staff_id: assignedByStaffId,
      medical_log_id: medicalLogId,
      status: "pending",
    },
    { transaction }
  );
}

async function notifyForward({
  receiverStaffId,
  senderStaffId,
  appointmentId,
  headerTitle,
  patientName,
}) {
  const sender = await db.User.findByPk(senderStaffId, {
    attributes: ["full_name"],
  });
  await notificationService.notifyInternalUser(receiverStaffId, {
    title: "Patient forwarded to you",
    message: `${sender?.full_name || "Staff"} forwarded "${headerTitle}" for ${patientName || "patient"}.`,
    category: notificationService.NOTIFICATION_CATEGORIES.WORKFLOW,
    relatedType: "workflow_task",
    relatedId: appointmentId,
  });
}

async function submitWorkflowEntry(staffId, payload) {
  const {
    appointment_id,
    header_title,
    action_type = "submit",
    receiver_staff_id,
    form_data = {},
    form_config_id,
    attachment_ids = [],
    notes,
    partial = false,
  } = payload;

  if (!header_title?.trim()) {
    const err = new Error("Header title is required");
    err.status = 400;
    throw err;
  }

  if (!LOG_ACTION_TYPES.includes(action_type)) {
    const err = new Error("Invalid action type");
    err.status = 400;
    throw err;
  }

  const appointment = await canAccessAppointment(appointment_id, staffId);

  if (appointment.workflow_status === "completed" && action_type !== "complete") {
    const err = new Error("Workflow is already completed for this appointment");
    err.status = 400;
    throw err;
  }

  const needsReceiver = action_type === "forward" || action_type === "return";
  if (needsReceiver && !receiver_staff_id) {
    const err = new Error("Receiving staff is required for this action");
    err.status = 400;
    throw err;
  }

  if (receiver_staff_id === staffId && needsReceiver) {
    const err = new Error("Cannot forward to yourself");
    err.status = 400;
    throw err;
  }

  const { configId, normalized } = await resolveFormPayload(staffId, {
    form_config_id,
    form_data,
    partial,
  });

  const t = await db.sequelize.transaction();

  try {
    const log = await db.MedicalHistoryLog.create(
      {
        log_id: uuidv4(),
        patient_id: appointment.patient_id,
        appointment_id: appointment.appointment_id,
        sender_staff_id: staffId,
        receiver_staff_id: needsReceiver ? receiver_staff_id : null,
        action_type,
        header_title: header_title.trim(),
        form_config_id: configId,
        form_data: normalized,
        attachment_ids: Array.isArray(attachment_ids) ? attachment_ids : [],
        notes: notes || null,
        status: mapLogStatus(action_type),
      },
      { transaction: t }
    );

    await closePendingTasksForStaff(appointment.appointment_id, staffId, t);

    if (needsReceiver) {
      await createWorkflowTask(
        {
          appointmentId: appointment.appointment_id,
          patientId: appointment.patient_id,
          assigneeStaffId: receiver_staff_id,
          assignedByStaffId: staffId,
          medicalLogId: log.log_id,
        },
        t
      );

      const patientName = appointment.patient?.full_name;
      await notifyForward({
        receiverStaffId: receiver_staff_id,
        senderStaffId: staffId,
        appointmentId: appointment.appointment_id,
        headerTitle: header_title.trim(),
        patientName,
      });
    }

    if (action_type === "complete") {
      await appointment.update(
        {
          workflow_status: "completed",
          workflow_completed_at: new Date(),
        },
        { transaction: t }
      );
      await db.WorkflowTask.update(
        { status: "cancelled" },
        {
          where: {
            appointment_id: appointment.appointment_id,
            status: "pending",
          },
          transaction: t,
        }
      );
    }

    await t.commit();

    const full = await db.MedicalHistoryLog.findByPk(log.log_id, {
      include: logIncludes,
    });

    return full.get({ plain: true });
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function listTimeline({ appointmentId, patientId, staffId }) {
  if (appointmentId) {
    await canAccessAppointment(appointmentId, staffId);
  }

  const where = {};
  if (appointmentId) where.appointment_id = appointmentId;
  if (patientId) where.patient_id = patientId;

  if (!appointmentId && patientId) {
    const canReceive = await userCanReceivePatients(staffId);
    if (!canReceive) {
      const err = new Error("Access denied");
      err.status = 403;
      throw err;
    }
  }

  const rows = await db.MedicalHistoryLog.findAll({
    where,
    include: [
      ...logIncludes,
      {
        model: db.StaffAppointment,
        as: "appointment",
        attributes: ["appointment_id", "workflow_status"],
        required: false,
      },
    ],
    order: [["created_at", "ASC"]],
  });

  return rows.map((r) => r.get({ plain: true }));
}

async function getWorkflowContext(appointmentId, staffId) {
  const appointment = await canAccessAppointment(appointmentId, staffId);
  const timeline = await listTimeline({ appointmentId, staffId });
  const { config, form } = await diagnosisFormConfigService.getConfigForStaff(staffId);

  const pendingTask = await db.WorkflowTask.findOne({
    where: {
      appointment_id: appointmentId,
      assignee_staff_id: staffId,
      status: "pending",
    },
  });

  const previousLogs = await db.MedicalHistoryLog.findAll({
    where: {
      appointment_id: appointmentId,
      sender_staff_id: { [Op.ne]: staffId },
    },
    attributes: ["sender_staff_id"],
    raw: true,
  });

  const staffIds = [
    ...new Set(
      previousLogs
        .map((r) => r.sender_staff_id)
        .filter((id) => id && id !== staffId)
    ),
  ];

  let returnCandidates = [];
  if (staffIds.length) {
    returnCandidates = await db.User.findAll({
      where: { user_id: { [Op.in]: staffIds } },
      attributes: ["user_id", "full_name"],
    });
  }

  return {
    appointment: appointment.get({ plain: true }),
    timeline,
    formConfig: config,
    form,
    pendingTask: pendingTask ? pendingTask.get({ plain: true }) : null,
    workflowActive: appointment.workflow_status === "active",
    returnCandidates: returnCandidates.map((u) => u.get({ plain: true })),
  };
}

async function listInbox(staffId, { status = "pending" } = {}) {
  const where = { assignee_staff_id: staffId };
  if (status && status !== "all") where.status = status;

  const rows = await db.WorkflowTask.findAll({
    where,
    include: [
      {
        model: db.StaffAppointment,
        as: "appointment",
        include: appointmentIncludes,
      },
      {
        model: db.User,
        as: "assignedBy",
        attributes: ["user_id", "full_name"],
      },
      {
        model: db.MedicalHistoryLog,
        as: "medicalLog",
        attributes: ["log_id", "header_title", "action_type", "created_at"],
        required: false,
      },
    ],
    order: [["created_at", "DESC"]],
  });

  return rows.map((r) => r.get({ plain: true }));
}

async function listEligibleReceivers(excludeStaffId = null) {
  const users = await listUsersWithPermission("patients", "receive_patient", {
    extraIncludes: [
      {
        model: db.InternalUserProfile,
        as: "internalProfile",
        required: false,
        include: [
          { model: db.Department, as: "departmentRef", attributes: ["name"] },
          { model: db.UserTitle, as: "titleRef", attributes: ["name"] },
        ],
      },
    ],
  });
  return users
    .filter((u) => !excludeStaffId || u.user_id !== excludeStaffId)
    .map((u) => u.get({ plain: true }));
}

module.exports = {
  submitWorkflowEntry,
  listTimeline,
  getWorkflowContext,
  listInbox,
  listEligibleReceivers,
  canAccessAppointment,
};
