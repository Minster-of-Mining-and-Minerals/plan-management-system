"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("./auditService");
const { requireOpenSession } = require("./cashierSessionService");
const { roundMoney, summarizeLines } = require("../utils/billingPricing");
const {
  deriveAccountStatus,
  accountIsLockedForCharges,
} = require("../utils/billingAccountStatus");
const { buildReceiptHtml } = require("../utils/cashierReceipt");
const {
  PAYABLE_ACCOUNT_STATUSES,
  PAYMENT_METHODS,
  CASHIER_PAYMENT_STATUSES,
} = require("../config/cashierConstants");

const {
  AppointmentBillingAccount,
  AppointmentBillingEntry,
  CashierPayment,
  PaymentTender,
  ReceiptSequence,
  StaffAppointment,
  User,
  PatientProfile,
  PatientSchedule,
} = db;

const patientInclude = {
  model: User,
  as: "patient",
  attributes: ["user_id", "full_name", "email", "phone_number"],
  include: [
    {
      model: PatientProfile,
      as: "patientProfile",
      attributes: ["patient_code"],
    },
  ],
};

const appointmentInclude = {
  model: StaffAppointment,
  as: "appointment",
  attributes: [
    "appointment_id",
    "admitted_at",
    "status",
    "workflow_status",
    "assigned_staff_id",
  ],
  include: [
    {
      model: PatientSchedule,
      as: "schedule",
      attributes: ["schedule_date", "start_time", "end_time", "appointment_type"],
    },
    {
      model: User,
      as: "staff",
      attributes: ["user_id", "full_name"],
    },
  ],
};

function formatMoneyFields(obj, fields) {
  const out = { ...obj };
  for (const field of fields) {
    if (out[field] != null) out[field] = Number(out[field]);
  }
  return out;
}

function formatQueueItem(accountRow) {
  const plain = accountRow.get ? accountRow.get({ plain: true }) : accountRow;
  return {
    account_id: plain.account_id,
    appointment_id: plain.appointment_id,
    patient_id: plain.patient_id,
    status: plain.status,
    grand_total: Number(plain.grand_total),
    amount_paid: Number(plain.amount_paid || 0),
    balance_due: Number(plain.balance_due || 0),
    currency: plain.currency,
    updated_at: plain.updated_at,
    patient_name: plain.patient?.full_name || null,
    patient_code: plain.patient?.patientProfile?.patient_code || null,
    phone_number: plain.patient?.phone_number || null,
    admitted_at: plain.appointment?.admitted_at || null,
    schedule_date: plain.appointment?.schedule?.schedule_date || null,
    schedule_time: plain.appointment?.schedule
      ? `${plain.appointment.schedule.start_time}–${plain.appointment.schedule.end_time}`
      : null,
    assigned_staff_name: plain.appointment?.staff?.full_name || null,
  };
}

async function nextReceiptNumber(transaction) {
  const year = new Date().getFullYear();
  let seq = await ReceiptSequence.findOne({
    where: { facility_key: "default", year },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!seq) {
    seq = await ReceiptSequence.create(
      { facility_key: "default", year, last_number: 0 },
      { transaction }
    );
  }
  const next = Number(seq.last_number) + 1;
  await seq.update({ last_number: next }, { transaction });
  return `RCP-${year}-${String(next).padStart(6, "0")}`;
}

async function listQueue({ search, schedule_date, page = 1, limit = 20 } = {}) {
  const where = { status: { [Op.in]: PAYABLE_ACCOUNT_STATUSES } };

  const scheduleInclude = {
    model: StaffAppointment,
    as: "appointment",
    required: true,
    include: [
      {
        model: PatientSchedule,
        as: "schedule",
        required: Boolean(schedule_date),
        ...(schedule_date ? { where: { schedule_date } } : {}),
      },
    ],
  };

  let rows = await AppointmentBillingAccount.findAll({
    where,
    include: [patientInclude, scheduleInclude],
    order: [["updated_at", "ASC"]],
  });

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter((row) => {
      const item = formatQueueItem(row);
      return (
        item.patient_name?.toLowerCase().includes(q) ||
        item.patient_code?.toLowerCase().includes(q) ||
        item.phone_number?.toLowerCase().includes(q) ||
        item.appointment_id?.toLowerCase().includes(q) ||
        item.account_id?.toLowerCase().includes(q)
      );
    });
  }

  const total = rows.length;
  const offset = (Math.max(Number(page), 1) - 1) * Math.max(Number(limit), 1);
  const results = rows.slice(offset, offset + limit).map(formatQueueItem);

  return {
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    currentPage: Number(page),
    limit: Number(limit),
    results,
  };
}

async function getAccountDetail(accountId) {
  const account = await AppointmentBillingAccount.findByPk(accountId, {
    include: [
      patientInclude,
      appointmentInclude,
      {
        model: AppointmentBillingEntry,
        as: "entries",
        where: { status: "active" },
        required: false,
      },
      {
        model: CashierPayment,
        as: "payments",
        where: { status: "completed" },
        required: false,
        include: [{ model: PaymentTender, as: "tenders" }],
        order: [["created_at", "ASC"]],
      },
    ],
  });

  if (!account) {
    const err = new Error("Billing account not found");
    err.status = 404;
    throw err;
  }

  const plain = account.get({ plain: true });
  const summary = summarizeLines(plain.entries || []);

  return {
    account: formatMoneyFields(plain, [
      "subtotal",
      "discount_total",
      "tax_total",
      "grand_total",
      "amount_paid",
      "balance_due",
    ]),
    entries: (plain.entries || []).map((entry) =>
      formatMoneyFields(entry, [
        "quantity",
        "unit_price",
        "line_subtotal",
        "discount_amount",
        "line_tax_amount",
        "line_total",
        "tax_percent",
      ])
    ),
    summary,
    payments: (plain.payments || [])
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((payment) => ({
      ...formatMoneyFields(payment, ["amount"]),
      tenders: (payment.tenders || []).map((t) =>
        formatMoneyFields(t, ["amount"])
      ),
    })),
  };
}

async function recordPayment(accountId, payload, actor, auditContext = {}) {
  const session = await requireOpenSession(actor.user_id);

  if (payload.client_reference) {
    const existing = await CashierPayment.findOne({
      where: { client_reference: payload.client_reference },
      include: [{ model: PaymentTender, as: "tenders" }],
    });
    if (existing) {
      return getPaymentReceipt(existing.payment_id);
    }
  }

  const tenders = payload.tenders || [];
  if (!tenders.length) {
    const err = new Error("At least one payment method is required");
    err.status = 400;
    throw err;
  }

  let totalTender = 0;
  for (const tender of tenders) {
    if (!PAYMENT_METHODS.includes(tender.method)) {
      const err = new Error(`Invalid payment method: ${tender.method}`);
      err.status = 400;
      throw err;
    }
    const amount = roundMoney(tender.amount);
    if (amount <= 0) {
      const err = new Error("Tender amount must be greater than zero");
      err.status = 400;
      throw err;
    }
    totalTender = roundMoney(totalTender + amount);
  }

  const paymentAmount = roundMoney(payload.amount ?? totalTender);
  if (paymentAmount !== totalTender) {
    const err = new Error("Payment amount must equal the sum of tenders");
    err.status = 400;
    throw err;
  }

  const t = await db.sequelize.transaction();
  try {
    const account = await AppointmentBillingAccount.findByPk(accountId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) {
      const err = new Error("Billing account not found");
      err.status = 404;
      throw err;
    }

    if (!PAYABLE_ACCOUNT_STATUSES.includes(account.status)) {
      const err = new Error("This account is not open for payment");
      err.status = 400;
      throw err;
    }

    const balanceDue = roundMoney(Number(account.balance_due));
    if (balanceDue <= 0) {
      const err = new Error("Nothing due on this account");
      err.status = 400;
      throw err;
    }

    if (paymentAmount > balanceDue) {
      const err = new Error("Payment exceeds balance due");
      err.status = 400;
      throw err;
    }

    const previouslyPaid = roundMoney(Number(account.amount_paid));
    const receiptNumber = await nextReceiptNumber(t);
    const now = new Date();

    const payment = await CashierPayment.create(
      {
        account_id: account.account_id,
        appointment_id: account.appointment_id,
        patient_id: account.patient_id,
        session_id: session.session_id,
        receipt_number: receiptNumber,
        amount: paymentAmount,
        currency: account.currency,
        status: "completed",
        reference_note: payload.reference_note?.trim() || null,
        client_reference: payload.client_reference || null,
        received_by: actor.user_id,
      },
      { transaction: t }
    );

    for (const tender of tenders) {
      await PaymentTender.create(
        {
          payment_id: payment.payment_id,
          method: tender.method,
          amount: roundMoney(tender.amount),
          reference: tender.reference?.trim() || null,
          provider: tender.provider?.trim() || null,
        },
        { transaction: t }
      );
    }

    const newAmountPaid = roundMoney(previouslyPaid + paymentAmount);
    const newBalanceDue = roundMoney(Number(account.grand_total) - newAmountPaid);
    const entries = await AppointmentBillingEntry.findAll({
      where: { account_id: account.account_id, status: "active" },
      transaction: t,
    });
    const entryCount = entries.length;
    const newStatus = deriveAccountStatus({
      entry_count: entryCount,
      amount_paid: newAmountPaid,
      grand_total: Number(account.grand_total),
      current_status: account.status,
    });

    await account.update(
      {
        amount_paid: newAmountPaid,
        balance_due: Math.max(newBalanceDue, 0),
        status: newStatus,
        last_payment_at: now,
        paid_at: newStatus === "paid" ? now : account.paid_at,
      },
      { transaction: t }
    );

    await t.commit();

    await logAudit({
      actorUserId: actor.user_id,
      action: "create",
      resourceType: "cashier_payment",
      resourceId: payment.payment_id,
      details: {
        account_id: accountId,
        amount: paymentAmount,
        receipt_number: receiptNumber,
        new_status: newStatus,
      },
      ipAddress: auditContext.ipAddress,
    });

    return getPaymentReceipt(payment.payment_id);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function voidPayment(paymentId, actor, auditContext = {}) {
  const reason = auditContext.reason?.trim();
  if (!reason) {
    const err = new Error("Void reason is required");
    err.status = 400;
    throw err;
  }

  const t = await db.sequelize.transaction();
  try {
    const payment = await CashierPayment.findByPk(paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment || payment.status !== "completed") {
      const err = new Error("Payment not found");
      err.status = 404;
      throw err;
    }

    const account = await AppointmentBillingAccount.findByPk(payment.account_id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!account) {
      const err = new Error("Billing account not found");
      err.status = 404;
      throw err;
    }

    const now = new Date();
    await payment.update(
      {
        status: "voided",
        voided_by: actor.user_id,
        void_reason: reason,
        voided_at: now,
      },
      { transaction: t }
    );

    const newAmountPaid = roundMoney(
      Math.max(Number(account.amount_paid) - Number(payment.amount), 0)
    );
    const newBalanceDue = roundMoney(Number(account.grand_total) - newAmountPaid);
    const entries = await AppointmentBillingEntry.findAll({
      where: { account_id: account.account_id, status: "active" },
      transaction: t,
    });
    const newStatus = deriveAccountStatus({
      entry_count: entries.length,
      amount_paid: newAmountPaid,
      grand_total: Number(account.grand_total),
      current_status: account.status,
    });

    await account.update(
      {
        amount_paid: newAmountPaid,
        balance_due: Math.max(newBalanceDue, 0),
        status: newStatus,
        paid_at: newStatus === "paid" ? account.paid_at : null,
        last_payment_at:
          newAmountPaid > 0 ? account.last_payment_at : null,
      },
      { transaction: t }
    );

    await t.commit();

    await logAudit({
      actorUserId: actor.user_id,
      action: "void",
      resourceType: "cashier_payment",
      resourceId: paymentId,
      details: { reason, account_id: account.account_id },
      ipAddress: auditContext.ipAddress,
    });

    return { payment_id: paymentId, voided: true };
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function getPaymentReceipt(paymentId) {
  const payment = await CashierPayment.findByPk(paymentId, {
    include: [
      { model: PaymentTender, as: "tenders" },
      {
        model: User,
        as: "receiver",
        attributes: ["user_id", "full_name"],
      },
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
      {
        model: AppointmentBillingAccount,
        as: "account",
        include: [
          {
            model: AppointmentBillingEntry,
            as: "entries",
            where: { status: "active" },
            required: false,
          },
          appointmentInclude,
        ],
      },
    ],
  });

  if (!payment) {
    const err = new Error("Payment not found");
    err.status = 404;
    throw err;
  }

  const plain = payment.get({ plain: true });
  const account = plain.account || {};
  const previouslyPaid = roundMoney(
    Math.max(Number(account.amount_paid || 0) - Number(plain.amount), 0)
  );

  const receipt = {
    payment_id: plain.payment_id,
    receipt_number: plain.receipt_number,
    status: plain.status,
    amount: Number(plain.amount),
    currency: plain.currency,
    paid_at: plain.created_at,
    reference_note: plain.reference_note,
    cashier_name: plain.receiver?.full_name || null,
    patient_name: plain.patient?.full_name || null,
    patient_code: plain.patient?.patientProfile?.patient_code || null,
    appointment_at: account.appointment?.admitted_at || null,
    account_grand_total: Number(account.grand_total || 0),
    previously_paid: previouslyPaid,
    balance_due: Number(account.balance_due || 0),
    entries: (account.entries || []).map((entry) => ({
      service_name: entry.service_name,
      quantity: Number(entry.quantity),
      unit_price: Number(entry.unit_price),
      line_total: Number(entry.line_total),
    })),
    tenders: (plain.tenders || []).map((tender) => ({
      method: tender.method,
      amount: Number(tender.amount),
      reference: tender.reference,
      provider: tender.provider,
    })),
  };

  return {
    ...receipt,
    html: buildReceiptHtml(receipt),
  };
}

async function getBillingSummariesForAppointments(appointmentIds = []) {
  if (!appointmentIds.length) return new Map();
  const rows = await AppointmentBillingAccount.findAll({
    where: { appointment_id: { [Op.in]: appointmentIds } },
    attributes: [
      "appointment_id",
      "account_id",
      "status",
      "grand_total",
      "amount_paid",
      "balance_due",
      "currency",
    ],
  });
  return new Map(
    rows.map((row) => {
      const plain = row.get({ plain: true });
      return [
        plain.appointment_id,
        {
          ...plain,
          grand_total: Number(plain.grand_total),
          amount_paid: Number(plain.amount_paid || 0),
          balance_due: Number(plain.balance_due || 0),
        },
      ];
    })
  );
}

module.exports = {
  listQueue,
  getAccountDetail,
  recordPayment,
  voidPayment,
  getPaymentReceipt,
  getBillingSummariesForAppointments,
  accountIsLockedForCharges,
  PAYABLE_ACCOUNT_STATUSES,
  PAYMENT_METHODS,
  CASHIER_PAYMENT_STATUSES,
};
