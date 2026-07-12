"use strict";

const service = require("../../services/billingServiceCategoryService");

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

const getById = async (req, res) => {
  try {
    const data = await service.getById(req.params.categoryId);
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
      req.params.categoryId,
      req.body,
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
      req.params.categoryId,
      req.user.user_id,
      auditCtx(req)
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = { list, getById, create, update, remove };
