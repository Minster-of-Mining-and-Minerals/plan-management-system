"use strict";

const patientPortalService = require("../../services/patientPortalService");
const notificationService = require("../../services/notificationService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const getMe = async (req, res) => {
  try {
    const data = await patientPortalService.getMe(req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateMe = async (req, res) => {
  try {
    const data = await patientPortalService.updateMe(req.user.user_id, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getDashboard = async (req, res) => {
  try {
    const data = await patientPortalService.getDashboard(req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listSchedules = async (req, res) => {
  try {
    const data = await patientPortalService.listMySchedules(req.user.user_id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listDoctors = async (req, res) => {
  try {
    const data = await patientPortalService.listEligibleDoctors();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getAvailability = async (req, res) => {
  try {
    const data = await patientPortalService.getAvailability(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const bookSchedule = async (req, res) => {
  try {
    const data = await patientPortalService.bookSchedule(req.user.user_id, req.body);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const rescheduleSchedule = async (req, res) => {
  try {
    const data = await patientPortalService.rescheduleSchedule(
      req.user.user_id,
      req.params.id,
      req.body
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const cancelSchedule = async (req, res) => {
  try {
    const data = await patientPortalService.cancelSchedule(
      req.user.user_id,
      req.params.id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listPrescriptions = async (req, res) => {
  try {
    const data = await patientPortalService.listMyPrescriptions(req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listMedicalHistory = async (req, res) => {
  try {
    const data = await patientPortalService.listMedicalHistory(req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listNotifications = async (req, res) => {
  try {
    const data = await notificationService.listForUser(req.user.user_id, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.unreadCount(req.user.user_id);
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    return handleError(res, error);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const data = await notificationService.markRead(req.params.id, req.user.user_id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user.user_id);
    return res.status(200).json({ success: true, message: "All marked as read" });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getMe,
  updateMe,
  getDashboard,
  listSchedules,
  listDoctors,
  getAvailability,
  bookSchedule,
  rescheduleSchedule,
  cancelSchedule,
  listPrescriptions,
  listMedicalHistory,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
