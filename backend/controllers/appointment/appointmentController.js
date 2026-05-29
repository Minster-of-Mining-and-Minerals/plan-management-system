"use strict";

const appointmentService = require("../../services/appointmentService");

const listMyAppointments = async (req, res) => {
  try {
    const canReceive = await appointmentService.userCanReceivePatients(
      req.user.user_id
    );
    if (!canReceive) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to receive patients",
      });
    }

    const { search, status, sort, order, schedule_date } = req.query;
    const rows = await appointmentService.listAppointmentsForStaffWithAccess(
      req.user.user_id,
      { search, status, sort, order, schedule_date }
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getAppointment = async (req, res) => {
  try {
    const canReceive = await appointmentService.userCanReceivePatients(
      req.user.user_id
    );
    if (!canReceive) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to receive patients",
      });
    }

    const data = await appointmentService.getAppointmentForStaff(
      req.params.id,
      req.user.user_id
    );

    return res.json({ success: true, data });
  } catch (e) {
    return res.status(e.status || 500).json({ success: false, message: e.message });
  }
};

module.exports = {
  listMyAppointments,
  getAppointment,
};
