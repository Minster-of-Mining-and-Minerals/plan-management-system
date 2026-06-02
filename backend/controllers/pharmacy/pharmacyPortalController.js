"use strict";

const pharmacyPrescriptionService = require("../../services/pharmacyPrescriptionService");
const notificationService = require("../../services/notificationService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const getDashboard = async (req, res) => {
  try {
    const stats = await pharmacyPrescriptionService.getPharmacyDashboardStats(
      req.pharmacyUser.pharmacy_id
    );
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return handleError(res, error);
  }
};

const listPrescriptions = async (req, res) => {
  try {
    const result = await pharmacyPrescriptionService.listForPharmacyPortal(
      req.pharmacyUser.pharmacy_id,
      req.query
    );
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPrescription = async (req, res) => {
  try {
    const data = await pharmacyPrescriptionService.getPharmacyPrescriptionById(
      req.params.id,
      req.pharmacyUser.pharmacy_id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const data = await pharmacyPrescriptionService.updatePharmacyPrescriptionWorkflow(
      req.params.id,
      req.pharmacyUser.pharmacy_id,
      req.body,
      req.user.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Pharmacy prescription updated",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getMyPharmacyProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: {
          user_id: req.user.user_id,
          full_name: req.user.full_name,
          email: req.user.email,
          account_type: req.user.account_type,
        },
        pharmacy: req.pharmacyUser.pharmacy,
        portal_role: req.pharmacyUser.portal_role,
      },
    });
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
    const data = await notificationService.markRead(
      req.params.id,
      req.user.user_id
    );
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
  getDashboard,
  listPrescriptions,
  getPrescription,
  updateWorkflow,
  getMyPharmacyProfile,
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
