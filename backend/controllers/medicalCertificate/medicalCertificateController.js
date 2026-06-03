"use strict";

const medicalCertificateService = require("../../services/medicalCertificateService");

const handle = async (res, fn, status = 200) => {
  try {
    const data = await fn();
    return res.status(status).json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

exports.preview = (req, res) =>
  handle(res, () => medicalCertificateService.preview(req.body, req.user.user_id));

exports.issue = (req, res) =>
  handle(
    res,
    () => medicalCertificateService.issue(req.body, req.user.user_id),
    201
  );

exports.listBySchedule = (req, res) =>
  handle(res, () =>
    medicalCertificateService.listBySchedule(
      req.params.scheduleId,
      req.user.user_id
    )
  );

exports.getById = (req, res) =>
  handle(res, () =>
    medicalCertificateService.getById(
      req.params.certificateId,
      req.user.user_id
    )
  );
