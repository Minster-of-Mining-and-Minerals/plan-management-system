"use strict";

const service = require("../../services/appointmentBillingService");
const { sendError } = require("../../utils/httpError");

const handleError = (res, error, req) => sendError(res, error, req);

const auditCtx = (req) => ({
  ipAddress: req.ip,
  reason: req.body?.reason || null,
});

const getContext = async (req, res) => {
  try {
    const data = await service.getBillingContext(
      req.params.appointmentId,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

const listActiveServices = async (req, res) => {
  try {
    const data = await service.listActiveServices(req.user, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

const createEntry = async (req, res) => {
  try {
    const data = await service.createEntry(
      req.params.appointmentId,
      req.body,
      req.user,
      auditCtx(req)
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

const updateEntry = async (req, res) => {
  try {
    const data = await service.updateEntry(
      req.params.entryId,
      req.body,
      req.user,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

const cancelEntry = async (req, res) => {
  try {
    const data = await service.cancelEntry(
      req.params.entryId,
      req.user,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

const sendToCashier = async (req, res) => {
  try {
    const data = await service.sendToCashier(
      req.params.appointmentId,
      req.user,
      req.body
    );
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, req);
  }
};

module.exports = {
  getContext,
  listActiveServices,
  createEntry,
  updateEntry,
  cancelEntry,
  sendToCashier,
};
