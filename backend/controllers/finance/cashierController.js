"use strict";

const sessionService = require("../../services/cashierSessionService");
const paymentService = require("../../services/cashierPaymentService");

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
    const data = await paymentService.listQueue(req.query);
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

const getAccount = async (req, res) => {
  try {
    const data = await paymentService.getAccountDetail(req.params.accountId);
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
  getAccount,
  recordPayment,
  voidPayment,
  getReceipt,
};
