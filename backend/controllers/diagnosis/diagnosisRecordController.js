"use strict";

const diagnosisRecordService = require("../../services/diagnosisRecordService");
const appointmentService = require("../../services/appointmentService");

const ensureClinicalStaff = async (req, res, next) => {
  try {
    const userId = req.user.user_id;
    const canWork =
      (await appointmentService.userCanReceiveAppointments(userId)) ||
      (await appointmentService.userCanReceivePatients(userId));
    if (!canWork) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access clinical records",
      });
    }
    return next();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getForAppointment = async (req, res) => {
  try {
    const data = await diagnosisRecordService.getRecordByAppointment(
      req.params.appointmentId,
      req.user.user_id
    );
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const saveForAppointment = async (req, res) => {
  try {
    const record = await diagnosisRecordService.saveRecord(
      req.params.appointmentId,
      req.user.user_id,
      req.body
    );
    return res.json({ success: true, data: record });
  } catch (e) {
    return res.status(e.status || 500).json({
      success: false,
      message: e.message,
      errors: e.details,
    });
  }
};

module.exports = {
  ensureClinicalStaff,
  getForAppointment,
  saveForAppointment,
};
