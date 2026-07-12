"use strict";

const service = require("../../services/billingServiceCatalogService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const auditCtx = (req) => ({ ipAddress: req.ip });

const list = async (req, res) => {
  try {
    const data = await service.list(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listActive = async (req, res) => {
  try {
    const data = await service.listActive(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    const data = await service.getById(req.params.serviceId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const create = async (req, res) => {
  try {
    const data = await service.create(req.body, req.user.user_id, auditCtx(req));
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const update = async (req, res) => {
  try {
    const data = await service.update(
      req.params.serviceId,
      req.body,
      req.user.user_id,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const activate = async (req, res) => {
  try {
    const data = await service.setStatus(
      req.params.serviceId,
      "active",
      req.user.user_id,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const deactivate = async (req, res) => {
  try {
    const data = await service.setStatus(
      req.params.serviceId,
      "inactive",
      req.user.user_id,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    const data = await service.remove(
      req.params.serviceId,
      req.user.user_id,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  list,
  listActive,
  getById,
  create,
  update,
  activate,
  deactivate,
  remove,
};
