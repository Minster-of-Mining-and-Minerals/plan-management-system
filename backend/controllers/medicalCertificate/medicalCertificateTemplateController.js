"use strict";

const medicalCertificateTemplateService = require("../../services/medicalCertificateTemplateService");

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
    medicalCertificateTemplateService.list({
      status: req.query.status,
      search: req.query.search,
    })
  );

exports.getById = (req, res) =>
  handle(res, () =>
    medicalCertificateTemplateService.getById(req.params.templateId)
  );

exports.getPlaceholders = (_req, res) =>
  handle(res, () => medicalCertificateTemplateService.getPlaceholderCatalog());

exports.create = (req, res) =>
  handle(
    res,
    () =>
      medicalCertificateTemplateService.create(req.body, req.user.user_id),
    201
  );

exports.update = (req, res) =>
  handle(res, () =>
    medicalCertificateTemplateService.update(
      req.params.templateId,
      req.body,
      req.user.user_id
    )
  );

exports.remove = (req, res) =>
  handle(res, () =>
    medicalCertificateTemplateService.remove(req.params.templateId)
  );
