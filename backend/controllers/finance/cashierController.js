"use strict";

const sessionService = require("../../services/cashierSessionService");
const paymentService = require("../../services/cashierPaymentService");
const servingClaimService = require("../../services/cashierServingClaimService");
const { logAudit, auditContextFromReq } = require("../../services/auditService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const auditCtx = (req) => ({
  ipAddress: req.ip,
  reason: req.body?.reason || null,
});

const getCurrentSession = async (req, res) => {
  try {
    const data = await sessionService.getOpenSessionForUser(req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const openSession = async (req, res) => {
  try {
    const data = await sessionService.openSession(
      req.user.user_id,
      req.body,
      auditCtx(req)
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const closeSession = async (req, res) => {
  try {
    const data = await sessionService.closeSession(
      req.params.sessionId,
      req.user.user_id,
      req.body,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getSessionSummary = async (req, res) => {
  try {
    const data = await sessionService.getSessionSummary(req.params.sessionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listQueue = async (req, res) => {
  try {
    const data = await paymentService.listQueue({
      ...req.query,
      viewerUserId: req.user.user_id,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listPaymentsToday = async (req, res) => {
  try {
    const data = await paymentService.listPaymentsToday(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listPaymentHistory = async (req, res) => {
  try {
    const data = await paymentService.listPaymentHistory(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const exportCollections = async (req, res) => {
  try {
    const { csv, count } = await paymentService.exportCollectionsCsv(req.query);
    const fromDate = req.query.from_date || "all";
    const toDate = req.query.to_date || "all";
    const filename = `collections_${fromDate}_to_${toDate}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Export-Row-Count", String(count));
    return res.status(200).send(csv);
  } catch (error) {
    return handleError(res, error);
  }
};

const getAccount = async (req, res) => {
  try {
    const data = await paymentService.getAccountDetail(
      req.params.accountId,
      req.user.user_id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const takeAccount = async (req, res) => {
  try {
    const data = await servingClaimService.takeAccount(
      req.params.accountId,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const releaseAccount = async (req, res) => {
  try {
    const data = await servingClaimService.releaseAccount(
      req.params.accountId,
      req.user,
      { force: false }
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const forceReleaseAccount = async (req, res) => {
  try {
    const data = await servingClaimService.releaseAccount(
      req.params.accountId,
      req.user,
      { force: true }
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const recordPayment = async (req, res) => {
  try {
    const data = await paymentService.recordPayment(
      req.params.accountId,
      req.body,
      req.user,
      auditCtx(req)
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const voidPayment = async (req, res) => {
  try {
    const data = await paymentService.voidPayment(
      req.params.paymentId,
      req.user,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getReceipt = async (req, res) => {
  try {
    const data = await paymentService.getPaymentReceipt(req.params.paymentId);
    const ctx = auditContextFromReq(req, {
      payment_id: req.params.paymentId,
      receipt_number: data?.receipt_number || data?.payment?.receipt_number,
    });
    await logAudit({
      actorUserId: req.user?.user_id,
      action: "reprint",
      resourceType: "cashier_payment",
      resourceId: req.params.paymentId,
      details: ctx.details,
      ipAddress: ctx.ipAddress,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getCurrentSession,
  openSession,
  closeSession,
  getSessionSummary,
  listQueue,
  listPaymentsToday,
  listPaymentHistory,
  exportCollections,
  getAccount,
  takeAccount,
  releaseAccount,
  forceReleaseAccount,
  recordPayment,
  voidPayment,
  getReceipt,
};
