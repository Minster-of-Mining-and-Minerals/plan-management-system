"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { LOG_ACTION_TYPES } = require("../config/medicalWorkflowConstants");
const { validateDiagnosisFormData } = require("./dynamicDiagnosisValidationService");
const diagnosisFormConfigService = require("./diagnosisFormConfigService");
const appointmentService = require("./appointmentService");
const notificationService = require("./notificationService");
const {
  userHasPermission,
  listUsersWithPermission,
} = require("./userPermissionService");
const clinicalSuggestionService = require("./clinicalSuggestionService");

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
  return userHasPermission(userId, "patients", "receive_patient");
}

async function userCanReceiveAppointments(userId) {
  return userHasPermission(userId, "patients", "receive_appointment");
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

  if (
    appointment.assigned_staff_id === userId &&
    (await userCanReceiveAppointments(userId))
  ) {
    return appointment;
  }

  const pendingTask = await db.WorkflowTask.findOne({
    where: {
      appointment_id: appointmentId,
      assignee_staff_id: userId,
      status: "pending",
    },
  });
  if (pendingTask && (await userCanReceivePatients(userId))) {
    return appointment;
  }

  const inHistory = await db.MedicalHistoryLog.findOne({
    where: {
      appointment_id: appointmentId,
      [Op.or]: [{ sender_staff_id: userId }, { receiver_staff_id: userId }],
    },
  });
  if (inHistory) return appointment;

  if (appointment.admitted_by === userId) return appointment;

  if (
    (await userHasPermission(userId, "patients", "schedule")) &&
    (await userHasPermission(userId, "workflow", "read"))
  ) {
    return appointment;
  }

  const err = new Error("You do not have access to this appointment workflow");
  err.status = 403;
  throw err;
}

async function resolveFormPayload(staffId, { form_config_id, form_data, partial }) {
  const staffForms = await diagnosisFormConfigService.getConfigsForStaff(staffId);
  if (!staffForms.length) {
    const err = new Error(
      "No diagnosis form assigned to your staff account. Configure a template first."
    );
    err.status = 400;
    throw err;
  }

  let configId = form_config_id;
  if (!configId) {
    if (staffForms.length > 1) {
      const err = new Error(
        "Select which diagnosis form to use for this report (form_config_id is required)"
      );
      err.status = 400;
      throw err;
    }
    configId = staffForms[0].config.config_id;
  } else {
    await diagnosisFormConfigService.assertConfigBelongsToStaff(configId, staffId);
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

  if (needsReceiver) {
    const receiverCanReceive = await userHasPermission(
      receiver_staff_id,
      "patients",
      "receive_patient"
    );
    if (!receiverCanReceive) {
      const err = new Error(
        "Selected staff cannot receive patients in the workflow"
      );
      err.status = 400;
      throw err;
    }
  }

  const isRoutingAction = action_type === "forward" || action_type === "return";
  const { configId, normalized } = await resolveFormPayload(staffId, {
    form_config_id,
    form_data,
    partial: partial || isRoutingAction || action_type === "prescribe",
  });

  const prescribeMeta =
    action_type === "prescribe" && form_data?.prescription_id
      ? {
          prescription_id: form_data.prescription_id,
          template_name: form_data.template_name || null,
          category_name: form_data.category_name || null,
          items_summary: form_data.items_summary || null,
        }
      : null;
  const logFormData = prescribeMeta ? { ...normalized, ...prescribeMeta } : normalized;

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
        form_data: logFormData,
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

    if (prescribeMeta?.prescription_id && db.Prescription) {
      await db.Prescription.update(
        { workflow_log_id: log.log_id, updated_at: new Date() },
        {
          where: { prescription_id: prescribeMeta.prescription_id },
          transaction: t,
        }
      );
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

    if (logFormData && typeof logFormData === "object") {
      clinicalSuggestionService
        .learnFromFormData({
          formData: logFormData,
          userId: staffId,
          defaultCategory: "general",
        })
        .catch(() => {});
    }

    const full = await db.MedicalHistoryLog.findByPk(log.log_id, {
      include: logIncludes,
    });

    return full.get({ plain: true });
  } catch (e) {
    if (!t.finished) await t.rollback();
    throw e;
  }
}

async function listTimeline({ appointmentId, patientId, scheduleId, staffId }) {
  let resolvedAppointmentId = appointmentId || null;

  if (scheduleId && !resolvedAppointmentId) {
    const schedule = await db.PatientSchedule.findByPk(scheduleId, {
      attributes: ["schedule_id", "patient_id"],
    });
    if (!schedule) {
      const err = new Error("Schedule not found");
      err.status = 404;
      throw err;
    }

    const appointment = await db.StaffAppointment.findOne({
      where: { schedule_id: scheduleId },
      attributes: ["appointment_id"],
    });

    if (appointment) {
      resolvedAppointmentId = appointment.appointment_id;
    } else {
      return [];
    }
  }

  if (resolvedAppointmentId) {
    await canAccessAppointment(resolvedAppointmentId, staffId);
  }

  const where = {};
  if (resolvedAppointmentId) where.appointment_id = resolvedAppointmentId;
  if (patientId) where.patient_id = patientId;

  if (!resolvedAppointmentId && patientId) {
    const canReceive =
      (await userCanReceivePatients(staffId)) ||
      (await userCanReceiveAppointments(staffId)) ||
      (await userHasPermission(staffId, "patients", "schedule"));
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

  const plain = rows.map((r) => r.get({ plain: true }));
  const configIds = [
    ...new Set(plain.map((log) => log.form_config_id).filter(Boolean)),
  ];
  const schemaByConfigId = {};
  await Promise.all(
    configIds.map(async (configId) => {
      schemaByConfigId[configId] =
        await diagnosisFormConfigService.getGroupedFormConfigForConfig(configId, {
          visibleOnly: false,
        });
    })
  );

  const withSchema = plain.map((log) => ({
    ...log,
    formSchema: log.form_config_id
      ? schemaByConfigId[log.form_config_id] ?? null
      : null,
  }));

  return attachPrescriptionsToTimeline(withSchema, resolvedAppointmentId);
}

const timelinePrescriptionInclude = [
  {
    model: db.PrescriptionCategory,
    as: "category",
    attributes: ["category_id", "name", "code"],
    required: false,
  },
  {
    model: db.PrescriptionTemplate,
    as: "template",
    attributes: ["template_id", "name", "code"],
    required: false,
  },
  {
    model: db.PrescriptionItem,
    as: "items",
    separate: true,
    order: [["sort_order", "ASC"]],
  },
  {
    model: db.User,
    as: "prescriber",
    attributes: ["user_id", "full_name"],
    required: false,
  },
];

function matchPrescriptionToLog(log, prescriptions, usedIds) {
  const available = prescriptions.filter((p) => !usedIds.has(p.prescription_id));
  const formData = log.form_data || {};

  if (formData.prescription_id) {
    const byId = prescriptions.find(
      (p) => p.prescription_id === formData.prescription_id
    );
    if (byId) return byId;
  }

  const byWorkflowLog = prescriptions.find(
    (p) => p.workflow_log_id && p.workflow_log_id === log.log_id
  );
  if (byWorkflowLog) return byWorkflowLog;

  const logTitle = String(log.header_title || "")
    .trim()
    .toLowerCase();
  if (logTitle) {
    const byTitle = available.find(
      (p) =>
        String(p.header_title || "")
          .trim()
          .toLowerCase() === logTitle
    );
    if (byTitle) return byTitle;
  }

  const logTime = new Date(log.created_at).getTime();
  let best = null;
  let bestDelta = Infinity;
  for (const p of available) {
    const rxTime = new Date(p.issued_at || p.created_at).getTime();
    const delta = Math.abs(rxTime - logTime);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = p;
    }
  }
  if (best && bestDelta <= 15 * 60 * 1000) return best;

  if (available.length === 1) return available[0];

  return null;
}

async function attachPrescriptionsToTimeline(logs, appointmentId) {
  if (!appointmentId || !db.Prescription) return logs;

  const rows = await db.Prescription.findAll({
    where: { appointment_id: appointmentId },
    include: timelinePrescriptionInclude,
    order: [["created_at", "ASC"]],
  });
  const prescriptions = rows.map((r) => r.get({ plain: true }));
  if (!prescriptions.length) return logs;

  const usedIds = new Set();

  return logs.map((log) => {
    if (log.action_type !== "prescribe") return log;

    const rx = matchPrescriptionToLog(log, prescriptions, usedIds);
    if (!rx) return log;

    usedIds.add(rx.prescription_id);
    const formData = log.form_data || {};

    return {
      ...log,
      prescription: rx,
      form_data: {
        ...formData,
        prescription_id: rx.prescription_id,
        template_name: formData.template_name || rx.template?.name || null,
        category_name: formData.category_name || rx.category?.name || null,
        items_summary:
          formData.items_summary ||
          (rx.items || []).map((i) => i.item_name).filter(Boolean).join(", ") ||
          null,
      },
    };
  });
}

async function getWorkflowContext(appointmentId, staffId) {
  const appointment = await canAccessAppointment(appointmentId, staffId);
  const timeline = await listTimeline({ appointmentId, staffId });
  const formOptions = await diagnosisFormConfigService.getConfigsForStaff(staffId);
  const primary = formOptions[0] ?? null;

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
    formConfig: primary?.config ?? null,
    form: primary?.form ?? null,
    formOptions,
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
