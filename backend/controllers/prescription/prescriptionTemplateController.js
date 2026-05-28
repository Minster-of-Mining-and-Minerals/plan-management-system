"use strict";

const prescriptionTemplateService = require("../../services/prescriptionTemplateService");

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
    prescriptionTemplateService.list({
      status: req.query.status,
      category_id: req.query.category_id,
      search: req.query.search,
      include_archived: req.query.include_archived === "true",
    })
  );

exports.getById = (req, res) =>
  handle(res, () => prescriptionTemplateService.getById(req.params.templateId));

exports.create = (req, res) =>
  handle(res, () => prescriptionTemplateService.create(req.body, req.user.user_id), 201);

exports.update = (req, res) =>
  handle(res, () =>
    prescriptionTemplateService.update(req.params.templateId, req.body, req.user.user_id)
  );

exports.archive = (req, res) =>
  handle(res, () =>
    prescriptionTemplateService.archive(req.params.templateId, req.user.user_id)
  );
