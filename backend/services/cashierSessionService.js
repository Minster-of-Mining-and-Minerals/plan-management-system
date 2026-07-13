"use strict";

const db = require("../models");
const { logAudit } = require("./auditService");
const { roundMoney } = require("../utils/billingPricing");
const { CASHIER_SESSION_STATUSES } = require("../config/cashierConstants");

const { CashierSession, CashierPayment, PaymentTender, User } = db;

function formatSession(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    ...plain,
    opening_float: Number(plain.opening_float),
    expected_cash_total:
      plain.expected_cash_total != null ? Number(plain.expected_cash_total) : null,
    counted_cash_total:
      plain.counted_cash_total != null ? Number(plain.counted_cash_total) : null,
    variance: plain.variance != null ? Number(plain.variance) : null,
    cashier_name: plain.cashier?.full_name || null,
  };
}

async function getOpenSessionForUser(userId) {
  const row = await CashierSession.findOne({
    where: { cashier_user_id: userId, status: "open" },
    include: [
      {
        model: User,
        as: "cashier",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["opened_at", "DESC"]],
  });
  return row ? formatSession(row) : null;
}

async function openSession(userId, payload = {}, auditContext = {}) {
  const existing = await getOpenSessionForUser(userId);
  if (existing) {
    const err = new Error("You already have an open cashier session");
    err.status = 409;
    throw err;
  }

  const openingFloat = roundMoney(payload.opening_float ?? 0);
  if (openingFloat < 0) {
    const err = new Error("Opening float cannot be negative");
    err.status = 400;
    throw err;
  }

  const row = await CashierSession.create({
    cashier_user_id: userId,
    status: "open",
    opening_float: openingFloat,
    opened_at: new Date(),
  });

  await logAudit({
    actorUserId: userId,
    action: "open",
    resourceType: "cashier_session",
    resourceId: row.session_id,
    details: { opening_float: openingFloat },
    ipAddress: auditContext.ipAddress,
  });

  return getOpenSessionForUser(userId);
}

async function getSessionSummary(sessionId) {
  const session = await CashierSession.findByPk(sessionId, {
    include: [
      {
        model: User,
        as: "cashier",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
  });

  if (!session) {
    const err = new Error("Cashier session not found");
    err.status = 404;
    throw err;
  }

  const payments = await CashierPayment.findAll({
    where: { session_id: sessionId },
    include: [{ model: PaymentTender, as: "tenders" }],
    order: [["created_at", "ASC"]],
  });

  const completed = payments.filter((p) => p.status === "completed");
  const voided = payments.filter((p) => p.status === "voided");

  const byMethod = {};
  let collectedTotal = 0;
  for (const payment of completed) {
    collectedTotal = roundMoney(collectedTotal + Number(payment.amount));
    for (const tender of payment.tenders || []) {
      byMethod[tender.method] = roundMoney(
        (byMethod[tender.method] || 0) + Number(tender.amount)
      );
    }
  }

  const cashCollected = byMethod.cash || 0;
  const openingFloat = Number(session.opening_float);
  const expectedCashInDrawer = roundMoney(openingFloat + cashCollected);

  return {
    session: formatSession(session),
    payment_count: completed.length,
    void_count: voided.length,
    collected_total: collectedTotal,
    voided_total: roundMoney(
      voided.reduce((sum, p) => sum + Number(p.amount), 0)
    ),
    by_method: byMethod,
    cash_collected: cashCollected,
    opening_float: openingFloat,
    expected_cash_in_drawer: expectedCashInDrawer,
    currency: completed[0]?.currency || "ETB",
  };
}

async function closeSession(sessionId, userId, payload = {}, auditContext = {}) {
  const { releaseAllForCashier } = require("./cashierServingClaimService");

  const row = await CashierSession.findByPk(sessionId);
  if (!row || row.status !== "open") {
    const err = new Error("Open cashier session not found");
    err.status = 404;
    throw err;
  }

  if (row.cashier_user_id !== userId) {
    const err = new Error("You can only close your own cashier session");
    err.status = 403;
    throw err;
  }

  const countedCash = roundMoney(payload.counted_cash_total ?? 0);
  if (countedCash < 0) {
    const err = new Error("Counted cash cannot be negative");
    err.status = 400;
    throw err;
  }

  const summary = await getSessionSummary(sessionId);
  const expectedCashTotal = summary.expected_cash_in_drawer;
  const variance = roundMoney(countedCash - expectedCashTotal);

  await row.update({
    status: "closed",
    closed_at: new Date(),
    expected_cash_total: expectedCashTotal,
    counted_cash_total: countedCash,
    variance,
    close_notes: payload.close_notes?.trim() || null,
  });

  // Free any patients this cashier was still holding when the shift ends.
  await releaseAllForCashier(userId);

  await logAudit({
    actorUserId: userId,
    action: "close",
    resourceType: "cashier_session",
    resourceId: sessionId,
    details: {
      expected_cash_total: expectedCashTotal,
      counted_cash_total: countedCash,
      variance,
      payment_count: summary.payment_count,
      collected_total: summary.collected_total,
      by_method: summary.by_method,
    },
    ipAddress: auditContext.ipAddress,
  });

  const closedSummary = await getSessionSummary(sessionId);
  return {
    ...closedSummary.session,
    summary: closedSummary,
  };
}

async function requireOpenSession(userId) {
  const session = await getOpenSessionForUser(userId);
  if (!session) {
    const err = new Error("Open a cashier session before taking payments");
    err.status = 400;
    throw err;
  }
  return session;
}

module.exports = {
  getOpenSessionForUser,
  getSessionSummary,
  openSession,
  closeSession,
  requireOpenSession,
  CASHIER_SESSION_STATUSES,
};
