"use strict";

const prescriptionService = require("../../services/prescriptionService");

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
    prescriptionService.list({
      patient_id: req.query.patient_id,
      appointment_id: req.query.appointment_id,
      prescriber_id: req.query.prescriber_id,
    })
  );

exports.getById = (req, res) =>
  handle(res, () => prescriptionService.getById(req.params.prescriptionId));

exports.create = (req, res) =>
  handle(res, () => prescriptionService.createPrescription(req.body, req.user.user_id), 201);

exports.preview = (req, res) =>
  handle(res, () => prescriptionService.preview(req.body, req.user.user_id));

exports.signatureCapabilities = (req, res) =>
  handle(res, () =>
    prescriptionService.getSignatureCapabilities(
      req.user.user_id,
      req.query.template_id
    )
  );
