"use strict";

const patientLocationService = require("../../services/patientLocationService");

const listLocations = async (req, res) => {
  try {
    const data = await patientLocationService.listLocations();
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const assignLocation = async (req, res) => {
  try {
    const history = await patientLocationService.assignLocation(req.body, req.user.user_id);
    return res.json({ success: true, data: history });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

const getLocationHistory = async (req, res) => {
  try {
    const history = await patientLocationService.getLocationHistory(req.params.appointmentId);
    return res.json({ success: true, data: history });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  listLocations,
  assignLocation,
  getLocationHistory,
};
