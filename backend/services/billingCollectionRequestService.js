"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const notificationService = require("./notificationService");
const { listUsersWithPermission } = require("./userPermissionService");
const { roundMoney } = require("../utils/billingPricing");
const {
  OPEN_COLLECTION_STATUSES,
  COLLECTION_REQUEST_SOURCES,
} = require("../config/billingCollectionConstants");

const {
  BillingCollectionRequest,
  AppointmentBillingAccount,
  AppointmentBillingEntry,
  User,
  PatientProfile,
} = db;

function formatRequest(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    request_id: plain.request_id,
    account_id: plain.account_id,
    appointment_id: plain.appointment_id,
    patient_id: plain.patient_id,
    requested_by: plain.requested_by,
    requested_at: plain.requested_at,
    amount_due_at_request: Number(plain.amount_due_at_request),
    status: plain.status,
    source: plain.source,
    note: plain.note,
    collected_at: plain.collected_at,
    requester_name: plain.requester?.full_name || null,
  };
}

async function listForAppointment(appointmentId) {
  const rows = await BillingCollectionRequest.findAll({
    where: { appointment_id: appointmentId },
    include: [
      {
        model: User,
        as: "requester",
        attributes: ["user_id", "full_name"],
      },
    ],
    order: [["requested_at", "DESC"]],
    limit: 20,
  });
  return rows.map(formatRequest);
}

async function getLatestOpenForAccount(accountId) {
  const row = await BillingCollectionRequest.findOne({
    where: {
      account_id: accountId,
      status: { [Op.in]: OPEN_COLLECTION_STATUSES },
    },
    include: [
      {
        model: User,
        as: "requester",
        attributes: ["user_id", "full_name"],
      },
    ],
    order: [["requested_at", "DESC"]],
  });
  return row ? formatRequest(row) : null;
}

async function notifyCashiers({
  accountId,
  appointmentId,
  patientName,
  balanceDue,
  currency,
  requesterName,
}) {
  const cashiers = await listUsersWithPermission("cashier_queue", "view");
  const amountLabel = `${currency} ${Number(balanceDue).toFixed(2)}`;
  const title = "Patient sent to cashier";
  const message = `${requesterName || "Staff"} sent ${patientName || "a patient"} to the cashier desk · ${amountLabel} due.`;

  for (const cashier of cashiers) {
    await notificationService.notifyInternalUser(cashier.user_id, {
      title,
      message,
      category: "finance",
      relatedType: "billing_collection",
      relatedId: accountId,
    });
  }
}

async function sendToCashier(appointmentId, actor, payload = {}) {
  const source = COLLECTION_REQUEST_SOURCES.includes(payload.source)
    ? payload.source
    : "manual";

  const account = await AppointmentBillingAccount.findOne({
    where: { appointment_id: appointmentId },
    include: [
      {
        model: User,
        as: "patient",
        attributes: ["user_id", "full_name"],
        include: [
          {
            model: PatientProfile,
            as: "patientProfile",
            attributes: ["patient_code"],
          },
        ],
      },
    ],
  });

  if (!account) {
    const err = new Error("No billing account for this visit");
    err.status = 400;
    throw err;
  }

  const activeEntries = await AppointmentBillingEntry.count({
    where: { account_id: account.account_id, status: "active" },
  });

  if (!activeEntries) {
    const err = new Error("Add billing entries before sending to cashier");
    err.status = 400;
    throw err;
  }

  const balanceDue = roundMoney(Number(account.balance_due));
  if (balanceDue <= 0) {
    const err = new Error("Nothing due on this bill — patient is already settled");
    err.status = 400;
    throw err;
  }

  const t = await db.sequelize.transaction();
  try {
    await BillingCollectionRequest.update(
      { status: "superseded" },
      {
        where: {
          account_id: account.account_id,
          status: { [Op.in]: OPEN_COLLECTION_STATUSES },
        },
        transaction: t,
      }
    );

    const request = await BillingCollectionRequest.create(
      {
        account_id: account.account_id,
        appointment_id: appointmentId,
        patient_id: account.patient_id,
        requested_by: actor.user_id,
        requested_at: new Date(),
        amount_due_at_request: balanceDue,
        status: "pending",
        source,
        note: payload.note?.trim() || null,
      },
      { transaction: t }
    );

    if (["draft"].includes(account.status)) {
      await account.update({ status: "pending_payment" }, { transaction: t });
    }

    await t.commit();

    const requester = await User.findByPk(actor.user_id, {
      attributes: ["full_name"],
    });

    await notifyCashiers({
      accountId: account.account_id,
      appointmentId,
      patientName: account.patient?.full_name,
      balanceDue,
      currency: account.currency,
      requesterName: requester?.full_name,
    });

    const created = await BillingCollectionRequest.findByPk(request.request_id, {
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["user_id", "full_name"],
        },
      ],
    });

    return formatRequest(created);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function syncAfterPayment(accountId, { balanceDue, accountStatus }) {
  const openRows = await BillingCollectionRequest.findAll({
    where: {
      account_id: accountId,
      status: { [Op.in]: OPEN_COLLECTION_STATUSES },
    },
    order: [["requested_at", "DESC"]],
  });

  if (!openRows.length) return;

  const balance = roundMoney(balanceDue);
  const now = new Date();

  if (balance <= 0 || accountStatus === "paid") {
    for (const row of openRows) {
      await row.update({ status: "collected", collected_at: now });
    }
    return;
  }

  for (const row of openRows) {
    if (row.status === "pending") {
      await row.update({ status: "partially_collected" });
    }
  }
}

module.exports = {
  listForAppointment,
  getLatestOpenForAccount,
  sendToCashier,
  syncAfterPayment,
  formatRequest,
};
