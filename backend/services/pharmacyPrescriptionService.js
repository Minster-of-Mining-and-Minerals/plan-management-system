"use strict";

const { Op } = require("sequelize");
const {
  Prescription,
  PrescriptionItem,
  PharmacyPrescription,
  PharmacyPrescriptionItem,
  PharmacyPrescriptionVersion,
  PrescriptionFulfillment,
  User,
  PatientProfile,
  InternalUserProfile,
  Pharmacy,
} = require("../models");
const {
  PHARMACY_PRESCRIPTION_STATUS,
  PHARMACY_ITEM_STATUS,
  PHARMACY_STATUS,
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

async function sendPrescriptionToPharmacy(
  { prescription_id, pharmacy_id },
  senderUserId
) {
  const pharmacy = await Pharmacy.findByPk(pharmacy_id);
  if (!pharmacy || pharmacy.status !== PHARMACY_STATUS.ACTIVE) {
    const err = new Error("Pharmacy not found or inactive");
    err.status = 400;
    throw err;
  }

  const original = await getOriginalPrescription(prescription_id);

  const existing = await PharmacyPrescription.findOne({
    where: { original_prescription_id: prescription_id, pharmacy_id },
  });
  if (existing) {
    const err = new Error("Prescription already sent to this pharmacy");
    err.status = 400;
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

    const itemRows = (original.items || []).map((item, index) => ({
      pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
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

    if (itemRows.length) {
      await PharmacyPrescriptionItem.bulkCreate(itemRows, { transaction: t });
    }

    await PharmacyPrescriptionVersion.create(
      {
        pharmacy_prescription_id: pharmacyRx.pharmacy_prescription_id,
        version_number: 1,
        status_before: null,
        status_after: PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
        change_summary: "Prescription received from hospital",
        items_snapshot: itemRows,
        created_by: senderUserId,
        created_at: now,
      },
      { transaction: t }
    );

    await t.commit();

    const profiles = await require("../models").PharmacyUserProfile.findAll({
      where: { pharmacy_id, is_active: true },
      attributes: ["user_id"],
    });

    for (const p of profiles) {
      await notificationService.notifyInternalUser(p.user_id, {
        title: "New prescription received",
        message: `Prescription for ${original.patient?.full_name || "patient"} has been sent to your pharmacy.`,
        category: "pharmacy",
        relatedType: "pharmacy_prescription",
        relatedId: pharmacyRx.pharmacy_prescription_id,
      });
    }

    return getPharmacyPrescriptionById(pharmacyRx.pharmacy_prescription_id);
  } catch (error) {
    if (!t.finished) await t.rollback();
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

  const [pending, queue, completedToday, unavailable] = await Promise.all([
    PharmacyPrescription.count({
      where: {
        pharmacy_id: pharmacyId,
        pharmacy_status: PHARMACY_PRESCRIPTION_STATUS.RECEIVED,
      },
    }),
    PharmacyPrescription.count({
      where: {
        pharmacy_id: pharmacyId,
        pharmacy_status: {
          [Op.in]: [
            PHARMACY_PRESCRIPTION_STATUS.REVIEWING,
            PHARMACY_PRESCRIPTION_STATUS.PREPARING,
            PHARMACY_PRESCRIPTION_STATUS.PARTIALLY_DISPENSED,
          ],
        },
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

  return { pending, queue, completedToday, unavailable };
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

  const sent = await PharmacyPrescription.findAll({
    where: { patient_id: patientId },
    attributes: ["original_prescription_id", "pharmacy_id", "pharmacy_status"],
  });

  return prescriptions.map((rx) => ({
    ...rx.toJSON(),
    pharmacy_sends: sent.filter((s) => s.original_prescription_id === rx.prescription_id),
  }));
}

module.exports = {
  sendPrescriptionToPharmacy,
  getPharmacyPrescriptionById,
  listPharmacyPrescriptionsForHospital,
  listForPharmacyPortal,
  updatePharmacyPrescriptionWorkflow,
  getPharmacyDashboardStats,
  listPatientPrescriptionsForSend,
  formatPharmacyPrescription,
};
