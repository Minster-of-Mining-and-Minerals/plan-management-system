"use strict";

const receiptTemplateService = require("../../services/receiptTemplateService");

const handle = async (res, fn) => {
  try {
    const data = await fn();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

const handleCreate = async (res, fn) => {
  try {
    const data = await fn();
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  list: (req, res) =>
    handle(res, () => receiptTemplateService.list(req.query)),

  getById: (req, res) =>
    handle(res, () => receiptTemplateService.getById(req.params.templateId)),

  getPlaceholders: (_req, res) =>
    handle(res, () => receiptTemplateService.getPlaceholderCatalog()),

  create: (req, res) =>
    handleCreate(res, () =>
      receiptTemplateService.create(req.body, req.user.user_id)
    ),

  update: (req, res) =>
    handle(res, () =>
      receiptTemplateService.update(
        req.params.templateId,
        req.body,
        req.user.user_id
      )
    ),

  remove: (req, res) =>
    handle(res, () => receiptTemplateService.remove(req.params.templateId)),
};
