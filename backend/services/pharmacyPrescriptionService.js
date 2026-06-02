"use strict";

const { Op } = require("sequelize");
const {
  Prescription,
  PrescriptionItem,
  PharmacyPrescription,
  PharmacyPrescriptionItem,
  PharmacyPrescriptionVersion,
  PrescriptionFulfillment,
  PrescriptionPharmacyForward,
  PrescriptionPharmacyForwardAudit,
  PrescriptionPharmacyForwardFile,
  Attachment,
  PharmacyUserProfile,
  PatientSchedule,
  StaffAppointment,
  User,
  PatientProfile,
  InternalUserProfile,
  Pharmacy,
} = require("../models");
const {
  PHARMACY_PRESCRIPTION_STATUS,
  PHARMACY_ITEM_STATUS,
  PHARMACY_STATUS,
  PHARMACY_FORWARD_STATUS,
  PHARMACY_FORWARD_ACTION,
} = require("../config/pharmacyConstants");
const notificationService = require("./notificationService");
const { getPagination, getPagingData } = require("../utils/pagination");

const pharmacyRxInclude = [
  {
    model: User,
    as: "patient",
    attributes: ["user_id", "full_name", "email"],
    include: [
      { model: PatientProfile, as: "patientProfile", attributes: ["patient_code"] },
    ],
  },
  {
    model: User,
    as: "prescriber",
    attributes: ["user_id", "full_name", "email"],
    include: [{ model: InternalUserProfile, as: "internalProfile" }],
  },
  { model: Pharmacy, as: "pharmacy", attributes: ["pharmacy_id", "pharmacy_name", "pharmacy_code"] },
  {
    model: PharmacyPrescriptionItem,
    as: "items",
    separate: true,
    order: [["sort_order", "ASC"]],
  },
];

function formatPharmacyPrescription(record) {
  const plain = record?.toJSON ? record.toJSON() : record;
  if (!plain) return null;
  return {
    ...plain,
    patient_name:
      plain.patient_snapshot?.full_name || plain.patient?.full_name || null,
    prescriber_name:
      plain.prescriber_snapshot?.full_name || plain.prescriber?.full_name || null,
    pharmacy_name: plain.pharmacy?.pharmacy_name || null,
  };
}

function buildPatientSnapshot(patient) {
  const profile = patient?.patientProfile;
  return {
    user_id: patient?.user_id,
    full_name: patient?.full_name,
    email: patient?.email,
    patient_code: profile?.patient_code || null,
  };
}

function buildPrescriberSnapshot(prescriber) {
  return {
    user_id: prescriber?.user_id,
    full_name: prescriber?.full_name,
    email: prescriber?.email,
    department: prescriber?.internalProfile?.departmentRef?.name || null,
    title: prescriber?.internalProfile?.titleRef?.name || null,
  };
}

async function getOriginalPrescription(prescriptionId) {
  const rx = await Prescription.findByPk(prescriptionId, {
    include: [
      {
        model: PrescriptionItem,
        as: "items",
        separate: true,
        order: [["sort_order", "ASC"]],
      },
      {
        model: User,
        as: "patient",
        attributes: ["user_id", "full_name", "email"],
        include: [{ model: PatientProfile, as: "patientProfile" }],
      },
      {
        model: User,
        as: "prescriber",
        attributes: ["user_id", "full_name", "email"],
        include: [{ model: InternalUserProfile, as: "internalProfile" }],
      },
    ],
  });
  if (!rx) {
    const err = new Error("Prescription not found");
    err.status = 404;
    throw err;
  }
  if (rx.status === "cancelled") {
    const err = new Error("Cannot send a cancelled prescription");
    err.status = 400;
    throw err;
  }
  return rx;
}

async function resolveScheduleAppointment(scheduleId) {
  const schedule = await PatientSchedule.findByPk(scheduleId, {
    attributes: ["schedule_id", "patient_id"],
  });
  if (!schedule) {
    const err = new Error("Schedule not found");
    err.status = 404;
    throw err;
  }
  const appointment = await StaffAppointment.findOne({
    where: { schedule_id: scheduleId },
    attributes: ["appointment_id"],
  });
  if (!appointment) {
    const err = new Error("No visit appointment for this schedule");
    err.status = 400;
    throw err;
  }
  return { schedule, appointmentId: appointment.appointment_id };
}

async function assertPrescriptionOnSchedule(prescription, scheduleId, appointmentId) {
  if (prescription.appointment_id !== appointmentId) {
    const err = new Error("Prescription does not belong to this schedule visit");
    err.status = 400;
    throw err;
  }
  if (prescription.status !== "issued") {
    const err = new Error("Only issued prescriptions can be forwarded");
    err.status = 400;
    throw err;
  }
}

const forwardDetailInclude = [
  { model: Pharmacy, as: "pharmacy", attributes: ["pharmacy_id", "pharmacy_name", "pharmacy_code"] },
  { model: User, as: "sender", attributes: ["user_id", "full_name"] },
  {
    model: PharmacyPrescription,
    as: "pharmacyPrescription",
    attributes: [
      "pharmacy_prescription_id",
      "pharmacy_id",
      "pharmacy_status",
      "sent_at",
      "received_at",
    ],
  },
  {
    model: PrescriptionPharmacyForwardFile,
    as: "files",
    include: [
      {
        model: Attachment,
        as: "attachment",
        attributes: ["attachment_id", "file_name", "file_path"],
      },
    ],
  },
];

function formatForwardSummary(forward) {
  if (!forward) return null;
  const plain = forward.get ? forward.get({ plain: true }) : forward;
  return {
    forward_id: plain.forward_id,
    prescription_id: plain.prescription_id,
    pharmacy_id: plain.pharmacy_id,
    pharmacy_name: plain.pharmacy?.pharmacy_name ?? null,
    pharmacy_code: plain.pharmacy?.pharmacy_code ?? null,
    forward_status: plain.forward_status,
    sent_at: plain.sent_at,
    sent_by_name: plain.sender?.full_name ?? null,
    pharmacy_status: plain.pharmacyPrescription?.pharmacy_status ?? null,
    pharmacy_prescription_id: plain.pharmacy_prescription_id,
    is_forwarded: true,
    files: (plain.files || []).map((f) => ({
      forward_file_id: f.forward_file_id,
      attachment_id: f.attachment_id,
      file_name: f.attachment?.file_name,
      file_path: f.attachment?.file_path,
      added_at: f.added_at,
    })),
  };
}

async function recordForwardAudit(
  t,
  { forward_id, action, changed_by, previous_values, new_values }
) {
  await PrescriptionPharmacyForwardAudit.create(
    {
      forward_id,
      action,
      changed_by,
      changed_at: new Date(),
      previous_values: previous_values ?? null,
      new_values: new_values ?? null,
    },
    { transaction: t }
  );
}

function buildItemRowsFromOriginal(pharmacyRxId, original) {
  return (original.items || []).map((item, index) => ({
    pharmacy_prescription_id: pharmacyRxId,
    source_prescription_item_id: item.prescription_item_id,
    item_name: item.item_name,
    strength: item.strength,
    route: item.route,
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    quantity: item.quantity,
    notes: item.notes,
    sort_order: item.sort_order ?? index,
    pharmacy_item_status: PHARMACY_ITEM_STATUS.PENDING,
  }));
}

async function notifyPharmacyUsers(pharmacyId, { title, message, relatedId }) {
  const profiles = await PharmacyUserProfile.findAll({
    where: { pharmacy_id: pharmacyId, is_active: true },
    attributes: ["user_id"],
  });
  for (const p of profiles) {
    await notificationService.notifyInternalUser(p.user_id, {
      title,
      message,
      category: "pharmacy",
      relatedType: "pharmacy_prescription",
      relatedId,
    });
  }
}

async function appendForwardFiles(t, forwardId, attachmentIds, userId) {
  if (!attachmentIds?.length) return [];
  const uniqueIds = [...new Set(attachmentIds)];
  const existing = await PrescriptionPharmacyForwardFile.findAll({
    where: {
      forward_id: forwardId,
      attachment_id: { [Op.in]: uniqueIds },
    },
    transaction: t,
  });
  const existingSet = new Set(existing.map((e) => e.attachment_id));
  const now = new Date();
  const added = [];
  for (const attachment_id of uniqueIds) {
    if (existingSet.has(attachment_id)) continue;
    const row = await PrescriptionPharmacyForwardFile.create(
      {
        forward_id: forwardId,
        attachment_id,
        added_by: userId,
        added_at: now,
      },
      { transaction: t }
    );
    added.push(row);
  }
  return added;
}

async function syncPharmacyPrescriptionFromOriginal(
  pharmacyRx,
  original,
  senderUserId,
  t,
  changeSummary
) {
  const statusBefore = pharmacyRx.pharmacy_status;
  const itemRows = buildItemRowsFromOriginal(
    pharmacyRx.pharmacy_prescription_id,
    original
  );

  const earlyWorkflow = [
    PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
    PHARMACY_PRESCRIPTION_STATUS.REVIEWING,
    PHARMACY_PRESCRIPTION_STATUS.PREPARING,
  ].includes(statusBefore);

  if (earlyWorkflow) {
    await PharmacyPrescriptionItem.destroy({
      where: { pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id },
      transaction: t,
    });
    if (itemRows.length) {
      await PharmacyPrescriptionItem.bulkCreate(itemRows, { transaction: t });
    }
  }

  const nextVersion = (pharmacyRx.current_version || 1) + 1;
  await pharmacyRx.update(
    {
      source_rendered_html: original.rendered_html,
      source_notes: original.notes,
      source_header_title: original.header_title,
      patient_snapshot: buildPatientSnapshot(original.patient),
      prescriber_snapshot: buildPrescriberSnapshot(original.prescriber),
      current_version: nextVersion,
      updated_by: senderUserId,
    },
    { transaction: t }
  );

  await PharmacyPrescriptionVersion.create(
    {
      pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
      version_number: nextVersion,
      status_before: statusBefore,
      status_after: statusBefore,
      change_summary: changeSummary,
      items_snapshot: itemRows,
      created_by: senderUserId,
      created_at: new Date(),
    },
    { transaction: t }
  );

  return itemRows;
}

async function getActiveForwardForPrescription(prescriptionId, transaction) {
  return PrescriptionPharmacyForward.findOne({
    where: { prescription_id: prescriptionId },
    include: forwardDetailInclude,
    transaction,
  });
}

async function listPrescriptionsForSchedule(scheduleId) {
  const { schedule, appointmentId } = await resolveScheduleAppointment(scheduleId);

  const prescriptions = await Prescription.findAll({
    where: { appointment_id: appointmentId, status: "issued" },
    attributes: [
      "prescription_id",
      "header_title",
      "issued_at",
      "created_at",
      "notes",
      "status",
    ],
    include: [
      {
        model: PrescriptionItem,
        as: "items",
        separate: true,
        order: [["sort_order", "ASC"]],
      },
      {
        model: User,
        as: "prescriber",
        attributes: ["user_id", "full_name"],
      },
    ],
    order: [["issued_at", "ASC"]],
  });

  const rxIds = prescriptions.map((rx) => rx.prescription_id);
  const forwards =
    rxIds.length > 0
      ? await PrescriptionPharmacyForward.findAll({
          where: { prescription_id: { [Op.in]: rxIds } },
          include: forwardDetailInclude,
        })
      : [];

  const forwardByRx = new Map(
    forwards.map((f) => [f.prescription_id, f])
  );

  const forwardedCount = forwards.length;

  return {
    schedule_id: scheduleId,
    patient_id: schedule.patient_id,
    appointment_id: appointmentId,
    has_any_forwarded: forwardedCount > 0,
    prescriptions: prescriptions.map((rx) => {
      const plain = rx.toJSON();
      const forward = forwardByRx.get(plain.prescription_id);
      return {
        ...plain,
        item_count: plain.items?.length ?? 0,
        prescriber_name: plain.prescriber?.full_name ?? null,
        pharmacy_forward: formatForwardSummary(forward),
      };
    }),
  };
}

async function forwardPrescriptionsFromSchedule(
  { prescription_ids, pharmacy_id, schedule_id, attachment_ids },
  senderUserId
) {
  const uniqueIds = [...new Set(prescription_ids)];
  const forwarded = [];
  const failed = [];

  for (const prescription_id of uniqueIds) {
    try {
      const data = await sendPrescriptionToPharmacy(
        {
          prescription_id,
          pharmacy_id,
          schedule_id,
          attachment_ids,
        },
        senderUserId
      );
      forwarded.push({
        prescription_id,
        data,
        updated: Boolean(data?.forward?.updated),
      });
    } catch (error) {
      failed.push({
        prescription_id,
        message: error.message || "Forward failed",
      });
    }
  }

  if (forwarded.length === 0) {
    const err = new Error(
      failed[0]?.message || "Failed to forward prescriptions"
    );
    err.status = 400;
    err.details = failed;
    throw err;
  }

  return { forwarded, failed };
}

async function updateExistingPharmacyForward(
  existingForward,
  { pharmacy_id, schedule_id, attachment_ids, original, senderUserId }
) {
  const pharmacy = await Pharmacy.findByPk(pharmacy_id);
  if (!pharmacy || pharmacy.status !== PHARMACY_STATUS.ACTIVE) {
    const err = new Error("Pharmacy not found or inactive");
    err.status = 400;
    throw err;
  }

  const t = await PharmacyPrescription.sequelize.transaction();
  const previousPharmacyId = existingForward.pharmacy_id;
  const pharmacyChanged = previousPharmacyId !== pharmacy_id;

  try {
    const pharmacyRx = await PharmacyPrescription.findByPk(
      existingForward.pharmacy_prescription_id,
      { transaction: t, lock: t.LOCK.UPDATE }
    );
    if (!pharmacyRx) {
      const err = new Error("Linked pharmacy prescription not found");
      err.status = 404;
      throw err;
    }

    if (pharmacyChanged) {
      const prevPharmacy = await Pharmacy.findByPk(previousPharmacyId, {
        attributes: ["pharmacy_id", "pharmacy_name"],
        transaction: t,
      });
      await pharmacyRx.update(
        { pharmacy_id, updated_by: senderUserId },
        { transaction: t }
      );
      await existingForward.update(
        {
          pharmacy_id,
          schedule_id: schedule_id ?? existingForward.schedule_id,
          forward_status: PHARMACY_FORWARD_STATUS.FORWARDED,
        },
        { transaction: t }
      );
      await recordForwardAudit(t, {
        forward_id: existingForward.forward_id,
        action: PHARMACY_FORWARD_ACTION.PHARMACY_CHANGED,
        changed_by: senderUserId,
        previous_values: {
          pharmacy_id: previousPharmacyId,
          pharmacy_name: prevPharmacy?.pharmacy_name,
        },
        new_values: {
          pharmacy_id,
          pharmacy_name: pharmacy.pharmacy_name,
        },
      });
    } else if (schedule_id && existingForward.schedule_id !== schedule_id) {
      await existingForward.update({ schedule_id }, { transaction: t });
    }

    await syncPharmacyPrescriptionFromOriginal(
      pharmacyRx,
      original,
      senderUserId,
      t,
      pharmacyChanged
        ? "Prescription reassigned to another pharmacy with updated content"
        : "Prescription content synchronized from hospital"
    );

    await recordForwardAudit(t, {
      forward_id: existingForward.forward_id,
      action: PHARMACY_FORWARD_ACTION.CONTENT_SYNCED,
      changed_by: senderUserId,
      previous_values: null,
      new_values: {
        header_title: original.header_title,
        item_count: original.items?.length ?? 0,
      },
    });

    const addedFiles = await appendForwardFiles(
      t,
      existingForward.forward_id,
      attachment_ids,
      senderUserId
    );
    if (addedFiles.length) {
      await recordForwardAudit(t, {
        forward_id: existingForward.forward_id,
        action: PHARMACY_FORWARD_ACTION.FILES_ADDED,
        changed_by: senderUserId,
        previous_values: null,
        new_values: {
          attachment_ids: addedFiles.map((f) => f.attachment_id),
        },
      });
    }

    await t.commit();

    if (pharmacyChanged) {
      await notifyPharmacyUsers(pharmacy_id, {
        title: "Prescription assigned to your pharmacy",
        message: `Prescription for ${original.patient?.full_name || "patient"} has been forwarded to your pharmacy.`,
        relatedId: pharmacyRx.pharmacy_prescription_id,
      });
    } else {
      await notifyPharmacyUsers(pharmacy_id, {
        title: "Prescription updated",
        message: `Forwarded prescription for ${original.patient?.full_name || "patient"} has been updated.`,
        relatedId: pharmacyRx.pharmacy_prescription_id,
      });
    }

    const refreshed = await getActiveForwardForPrescription(
      existingForward.prescription_id
    );
    const result = await getPharmacyPrescriptionById(
      pharmacyRx.pharmacy_prescription_id
    );
    result.forward = {
      ...formatForwardSummary(refreshed),
      updated: true,
    };
    return result;
  } catch (error) {
    if (!t.finished) await t.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error(
        "Duplicate pharmacy forwarding is not allowed for this prescription"
      );
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

async function sendPrescriptionToPharmacy(
  { prescription_id, pharmacy_id, schedule_id, attachment_ids },
  senderUserId
) {
  const pharmacy = await Pharmacy.findByPk(pharmacy_id);
  if (!pharmacy || pharmacy.status !== PHARMACY_STATUS.ACTIVE) {
    const err = new Error("Pharmacy not found or inactive");
    err.status = 400;
    throw err;
  }

  const original = await getOriginalPrescription(prescription_id);

  if (schedule_id) {
    const scheduleContext = await resolveScheduleAppointment(schedule_id);
    assertPrescriptionOnSchedule(
      original,
      schedule_id,
      scheduleContext.appointmentId
    );
    if (original.patient_id !== scheduleContext.schedule.patient_id) {
      const err = new Error("Prescription patient does not match schedule");
      err.status = 400;
      throw err;
    }
  }

  const existingForward = await getActiveForwardForPrescription(prescription_id);
  if (existingForward) {
    return updateExistingPharmacyForward(existingForward, {
      pharmacy_id,
      schedule_id,
      attachment_ids,
      original,
      senderUserId,
    });
  }

  const orphanRx = await PharmacyPrescription.findOne({
    where: { original_prescription_id: prescription_id },
  });
  if (orphanRx) {
    const err = new Error(
      "Prescription already has a pharmacy copy; use update forwarding instead"
    );
    err.status = 409;
    throw err;
  }

  const now = new Date();
  const t = await PharmacyPrescription.sequelize.transaction();

  try {
    const pharmacyRx = await PharmacyPrescription.create(
      {
        original_prescription_id: prescription_id,
        pharmacy_id,
        patient_id: original.patient_id,
        prescriber_id: original.prescriber_id,
        source_rendered_html: original.rendered_html,
        source_notes: original.notes,
        source_header_title: original.header_title,
        patient_snapshot: buildPatientSnapshot(original.patient),
        prescriber_snapshot: buildPrescriberSnapshot(original.prescriber),
        pharmacy_status: PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
        sent_by: senderUserId,
        sent_at: now,
        received_at: now,
        current_version: 1,
        created_by: senderUserId,
        updated_by: senderUserId,
      },
      { transaction: t }
    );

    const itemRows = buildItemRowsFromOriginal(
      pharmacyRx.pharmacy_prescription_id,
      original
    );

    if (itemRows.length) {
      await PharmacyPrescriptionItem.bulkCreate(itemRows, { transaction: t });
    }

    await PharmacyPrescriptionVersion.create(
      {
        pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
        version_number: 1,
        status_before: null,
        status_after: PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
        change_summary: schedule_id
          ? "Prescription forwarded from hospital schedule"
          : "Prescription received from hospital",
        items_snapshot: itemRows,
        created_by: senderUserId,
        created_at: now,
      },
      { transaction: t }
    );

    const forwardRecord = await PrescriptionPharmacyForward.create(
      {
        prescription_id,
        patient_id: original.patient_id,
        schedule_id: schedule_id ?? null,
        pharmacy_id,
        pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
        sent_by: senderUserId,
        sent_at: now,
        forward_status: PHARMACY_FORWARD_STATUS.FORWARDED,
      },
      { transaction: t }
    );

    await recordForwardAudit(t, {
      forward_id: forwardRecord.forward_id,
      action: PHARMACY_FORWARD_ACTION.CREATED,
      changed_by: senderUserId,
      previous_values: null,
      new_values: {
        pharmacy_id,
        pharmacy_name: pharmacy.pharmacy_name,
        schedule_id: schedule_id ?? null,
      },
    });

    const addedFiles = await appendForwardFiles(
      t,
      forwardRecord.forward_id,
      attachment_ids,
      senderUserId
    );
    if (addedFiles.length) {
      await recordForwardAudit(t, {
        forward_id: forwardRecord.forward_id,
        action: PHARMACY_FORWARD_ACTION.FILES_ADDED,
        changed_by: senderUserId,
        previous_values: null,
        new_values: {
          attachment_ids: addedFiles.map((f) => f.attachment_id),
        },
      });
    }

    await t.commit();

    await notifyPharmacyUsers(pharmacy_id, {
      title: "New prescription received",
      message: `Prescription for ${original.patient?.full_name || "patient"} has been sent to your pharmacy.`,
      relatedId: pharmacyRx.pharmacy_prescription_id,
    });

    const result = await getPharmacyPrescriptionById(
      pharmacyRx.pharmacy_prescription_id
    );
    const refreshed = await getActiveForwardForPrescription(prescription_id);
    result.forward = {
      ...formatForwardSummary(refreshed),
      updated: false,
    };
    return result;
  } catch (error) {
    if (!t.finished) await t.rollback();
    if (error.name === "SequelizeUniqueConstraintError") {
      const err = new Error(
        "This prescription already has an active pharmacy forwarding record"
      );
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

async function getPharmacyPrescriptionById(id, pharmacyIdFilter) {
  const where = { pharmacy_prescription_id: id };
  if (pharmacyIdFilter) where.pharmacy_id = pharmacyIdFilter;

  const record = await PharmacyPrescription.findOne({
    where,
    include: pharmacyRxInclude,
  });
  if (!record) {
    const err = new Error("Pharmacy prescription not found");
    err.status = 404;
    throw err;
  }
  return formatPharmacyPrescription(record);
}

async function listPharmacyPrescriptionsForHospital(query = {}) {
  const where = {};
  if (query.patient_id) where.patient_id = query.patient_id;
  if (query.pharmacy_id) where.pharmacy_id = query.pharmacy_id;
  if (query.pharmacy_status) where.pharmacy_status = query.pharmacy_status;

  const rows = await PharmacyPrescription.findAll({
    where,
    include: pharmacyRxInclude,
    order: [["sent_at", "DESC"]],
    limit: query.limit ? Number(query.limit) : 50,
  });
  return rows.map(formatPharmacyPrescription);
}

async function listForPharmacyPortal(pharmacyId, query = {}) {
  const { pharmacy_status, search, page, limit, paginate, queue } = query;
  const where = { pharmacy_id: pharmacyId };

  const isQueue =
    queue === true ||
    queue === "true" ||
    queue === "1";

  if (isQueue) {
    where.pharmacy_status = {
      [Op.in]: [
        PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
        PHARMACY_PRESCRIPTION_STATUS.REVIEWING,
        PHARMACY_PRESCRIPTION_STATUS.PREPARING,
        PHARMACY_PRESCRIPTION_STATUS.PARTIALLY_DISPENSED,
      ],
    };
  } else if (pharmacy_status) {
    where.pharmacy_status = pharmacy_status;
  }

  if (search) {
    const term = `%${String(search).trim()}%`;
    where[Op.or] = [
      { "$patient.full_name$": { [Op.iLike]: term } },
      { source_header_title: { [Op.iLike]: term } },
    ];
  }

  const findOpts = {
    where,
    include: pharmacyRxInclude,
    order: [["received_at", "DESC"]],
    distinct: true,
  };

  if (paginate === "true" || paginate === true) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const { limit: take, offset } = getPagination(pageNum, limitNum);

    const result = await PharmacyPrescription.findAndCountAll({
      ...findOpts,
      limit: take,
      offset,
    });

    const paging = getPagingData(result, pageNum, limitNum);
    return {
      paginated: true,
      count: paging.total,
      totalPages: paging.totalPages,
      currentPage: paging.currentPage,
      limit: paging.limit,
      data: paging.results.map(formatPharmacyPrescription),
    };
  }

  const rows = await PharmacyPrescription.findAll(findOpts);
  return { count: rows.length, data: rows.map(formatPharmacyPrescription) };
}

async function recordVersion(
  pharmacyRx,
  { status_before, status_after, change_summary, items_snapshot },
  actorUserId,
  transaction
) {
  const nextVersion = (pharmacyRx.current_version || 0) + 1;
  await PharmacyPrescriptionVersion.create(
    {
      pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
      version_number: nextVersion,
      status_before,
      status_after,
      change_summary,
      items_snapshot,
      created_by: actorUserId,
      created_at: new Date(),
    },
    { transaction }
  );
  await pharmacyRx.update(
    { current_version: nextVersion, updated_by: actorUserId },
    { transaction }
  );
}

async function updatePharmacyPrescriptionWorkflow(
  pharmacyPrescriptionId,
  pharmacyId,
  payload,
  actorUserId
) {
  const pharmacyRx = await PharmacyPrescription.findOne({
    where: { pharmacy_prescription_id: pharmacyPrescriptionId, pharmacy_id: pharmacyId },
    include: [{ model: PharmacyPrescriptionItem, as: "items" }],
  });

  if (!pharmacyRx) {
    const err = new Error("Pharmacy prescription not found");
    err.status = 404;
    throw err;
  }

  const statusBefore = pharmacyRx.pharmacy_status;
  const t = await PharmacyPrescription.sequelize.transaction();

  try {
    if (payload.pharmacy_status) {
      pharmacyRx.pharmacy_status = payload.pharmacy_status;
      if (payload.pharmacy_status === PHARMACY_PRESCRIPTION_STATUS.COMPLETED) {
        pharmacyRx.completed_at = new Date();
      }
    }
    if (payload.pharmacy_notes !== undefined) {
      pharmacyRx.pharmacy_notes = payload.pharmacy_notes;
    }

    if (Array.isArray(payload.items)) {
      for (const itemUpdate of payload.items) {
        const item = pharmacyRx.items.find(
          (i) => i.pharmacy_prescription_item_id === itemUpdate.pharmacy_prescription_item_id
        );
        if (!item) continue;
        await item.update(
          {
            dispensed_quantity: itemUpdate.dispensed_quantity ?? item.dispensed_quantity,
            pharmacy_item_status:
              itemUpdate.pharmacy_item_status ?? item.pharmacy_item_status,
            substitution_notes:
              itemUpdate.substitution_notes ?? item.substitution_notes,
            pharmacy_notes: itemUpdate.pharmacy_notes ?? item.pharmacy_notes,
          },
          { transaction: t }
        );
      }
    }

    await pharmacyRx.save({ transaction: t });

    const itemsSnapshot = (await PharmacyPrescriptionItem.findAll({
      where: { pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id },
      transaction: t,
    })).map((i) => i.toJSON());

    await recordVersion(
      pharmacyRx,
      {
        status_before: statusBefore,
        status_after: pharmacyRx.pharmacy_status,
        change_summary: payload.change_summary || "Workflow updated",
        items_snapshot: itemsSnapshot,
      },
      actorUserId,
      t
    );

    if (payload.create_fulfillment) {
      await PrescriptionFulfillment.create(
        {
          pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
          fulfilled_by: actorUserId,
          fulfillment_status: payload.fulfillment_status || "completed",
          notes: payload.fulfillment_notes || null,
          items_detail: itemsSnapshot,
          dispensed_at: new Date(),
          created_by: actorUserId,
        },
        { transaction: t }
      );
    }

    await t.commit();

    if (pharmacyRx.sent_by && payload.pharmacy_status === PHARMACY_PRESCRIPTION_STATUS.COMPLETED) {
      await notificationService.notifyInternalUser(pharmacyRx.sent_by, {
        title: "Prescription fulfilled",
        message: `Pharmacy fulfillment completed for ${pharmacyRx.patient_snapshot?.full_name || "patient"}.`,
        category: "pharmacy",
        relatedType: "pharmacy_prescription",
        relatedId: pharmacyRx.pharmacy_prescription_id,
      });
    }

    return getPharmacyPrescriptionById(pharmacyPrescriptionId, pharmacyId);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function getPharmacyDashboardStats(pharmacyId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const statusKeys = Object.values(PHARMACY_PRESCRIPTION_STATUS);
  const statusCounts = await Promise.all(
    statusKeys.map((status) =>
      PharmacyPrescription.count({
        where: { pharmacy_id: pharmacyId, pharmacy_status: status },
      })
    )
  );
  const byStatus = statusKeys.reduce((acc, status, i) => {
    acc[status] = statusCounts[i];
    return acc;
  }, {});

  const [total, receivedToday, completedToday, unavailableItems] =
    await Promise.all([
      PharmacyPrescription.count({ where: { pharmacy_id: pharmacyId } }),
      PharmacyPrescription.count({
        where: {
          pharmacy_id: pharmacyId,
          received_at: { [Op.gte]: today },
        },
      }),
      PharmacyPrescription.count({
        where: {
          pharmacy_id: pharmacyId,
          pharmacy_status: PHARMACY_PRESCRIPTION_STATUS.COMPLETED,
          completed_at: { [Op.gte]: today },
        },
      }),
      PharmacyPrescriptionItem.count({
        include: [
          {
            model: PharmacyPrescription,
            as: "pharmacyPrescription",
            where: { pharmacy_id: pharmacyId },
            required: true,
          },
        ],
        where: { pharmacy_item_status: PHARMACY_ITEM_STATUS.UNAVAILABLE },
      }),
    ]);

  const teamProfiles = await PharmacyUserProfile.findAll({
    where: { pharmacy_id: pharmacyId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "full_name", "email", "is_active"],
      },
    ],
    order: [[{ model: User, as: "user" }, "full_name", "ASC"]],
  });

  const byUser = await Promise.all(
    teamProfiles.map(async (profile) => {
      const userId = profile.user_id;
      const [workflowUpdates, fulfillmentsCompleted, prescriptionsCompleted] =
        await Promise.all([
          PharmacyPrescriptionVersion.count({
            where: { created_by: userId },
            include: [
              {
                model: PharmacyPrescription,
                as: "pharmacyPrescription",
                where: { pharmacy_id: pharmacyId },
                required: true,
                attributes: [],
              },
            ],
          }),
          PrescriptionFulfillment.count({
            where: { fulfilled_by: userId },
            include: [
              {
                model: PharmacyPrescription,
                as: "pharmacyPrescription",
                where: { pharmacy_id: pharmacyId },
                required: true,
                attributes: [],
              },
            ],
          }),
          PharmacyPrescription.count({
            where: {
              pharmacy_id: pharmacyId,
              pharmacy_status: PHARMACY_PRESCRIPTION_STATUS.COMPLETED,
              updated_by: userId,
            },
          }),
        ]);

      return {
        user_id: userId,
        full_name: profile.user?.full_name || "",
        email: profile.user?.email || "",
        portal_role: profile.portal_role,
        is_active: profile.user?.is_active ?? profile.is_active,
        workflow_updates: workflowUpdates,
        fulfillments: fulfillmentsCompleted,
        prescriptions_completed: prescriptionsCompleted,
      };
    })
  );

  const activeTeam = byUser.filter((u) => u.is_active).length;

  return {
    summary: {
      total,
      receivedToday,
      completedToday,
      unavailableItems,
      teamTotal: byUser.length,
      teamActive: activeTeam,
    },
    byStatus,
    byUser,
    pending: byStatus.received ?? 0,
    queue:
      (byStatus.reviewing ?? 0) +
      (byStatus.preparing ?? 0) +
      (byStatus.partially_dispensed ?? 0),
    completedToday,
    unavailable: unavailableItems,
  };
}

async function listPatientPrescriptionsForSend(patientId) {
  const prescriptions = await Prescription.findAll({
    where: { patient_id: patientId, status: "issued" },
    attributes: [
      "prescription_id",
      "header_title",
      "issued_at",
      "created_at",
      "notes",
    ],
    order: [["issued_at", "DESC"]],
  });

  const rxIds = prescriptions.map((r) => r.prescription_id);
  const forwards =
    rxIds.length > 0
      ? await PrescriptionPharmacyForward.findAll({
          where: { prescription_id: { [Op.in]: rxIds } },
          include: forwardDetailInclude,
        })
      : [];
  const forwardByRx = new Map(forwards.map((f) => [f.prescription_id, f]));

  return prescriptions.map((rx) => {
    const plain = rx.toJSON();
    const forward = forwardByRx.get(plain.prescription_id);
    return {
      ...plain,
      pharmacy_forward: formatForwardSummary(forward),
      pharmacy_sends: forward
        ? [
            {
              pharmacy_id: forward.pharmacy_id,
              pharmacy_status:
                forward.pharmacyPrescription?.pharmacy_status ?? "received",
              original_prescription_id: plain.prescription_id,
            },
          ]
        : [],
    };
  });
}

module.exports = {
  sendPrescriptionToPharmacy,
  forwardPrescriptionsFromSchedule,
  listPrescriptionsForSchedule,
  getPharmacyPrescriptionById,
  listPharmacyPrescriptionsForHospital,
  listForPharmacyPortal,
  updatePharmacyPrescriptionWorkflow,
  getPharmacyDashboardStats,
  listPatientPrescriptionsForSend,
  formatPharmacyPrescription,
};
