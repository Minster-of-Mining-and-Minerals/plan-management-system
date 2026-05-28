"use strict";

const prescriptionDocumentTemplateService = require("../../services/prescriptionDocumentTemplateService");

const handle = async (res, fn, status = 200) => {
  try {
    const data = await fn();
    return res.status(status).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.list = (req, res) =>
  handle(res, () =>
    prescriptionDocumentTemplateService.list({
      status: req.query.status,
      category_id: req.query.category_id,
      search: req.query.search,
    })
  );

exports.getById = (req, res) =>
  handle(res, () =>
    prescriptionDocumentTemplateService.getById(req.params.documentTemplateId)
  );

exports.getPlaceholders = (_req, res) =>
  handle(res, () => prescriptionDocumentTemplateService.getPlaceholderCatalog());

exports.create = (req, res) =>
  handle(
    res,
    () => prescriptionDocumentTemplateService.create(req.body, req.user.user_id),
    201
  );

exports.update = (req, res) =>
  handle(res, () =>
    prescriptionDocumentTemplateService.update(
      req.params.documentTemplateId,
      req.body,
      req.user.user_id
    )
  );

exports.remove = (req, res) =>
  handle(res, () =>
    prescriptionDocumentTemplateService.remove(req.params.documentTemplateId)
  );
