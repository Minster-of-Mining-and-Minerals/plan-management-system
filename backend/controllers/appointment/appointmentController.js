"use strict";

const appointmentService = require("../../services/appointmentService");

const listMyAppointments = async (req, res) => {
  try {
    const canReceive = await appointmentService.userCanReceiveAppointments(
      req.user.user_id
    );
    if (!canReceive) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to receive appointments",
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
    const userId = req.user.user_id;
    const canReceiveAppointment = await appointmentService.userCanReceiveAppointments(
      userId
    );
    const canReceiveWorkflow = await appointmentService.userCanReceivePatients(
      userId
    );
    if (!canReceiveAppointment && !canReceiveWorkflow) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this appointment",
      });
    }

    const data = await appointmentService.getAppointmentForStaff(
      req.params.id,
      userId
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
