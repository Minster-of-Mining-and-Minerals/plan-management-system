"use strict";

const pharmacyService = require("../../services/pharmacyService");
const pharmacyUserService = require("../../services/pharmacyUserService");
const pharmacyPrescriptionService = require("../../services/pharmacyPrescriptionService");

const handleError = (res, error) => {
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    message: error.message || "Internal server error",
  });
};

const listPharmacies = async (req, res) => {
  try {
    const result = await pharmacyService.listPharmacies(req.query);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
};

const getPharmacy = async (req, res) => {
  try {
    const data = await pharmacyService.getPharmacyById(req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPharmacy = async (req, res) => {
  try {
    const data = await pharmacyService.createPharmacy(req.body, req.user.user_id);
    return res.status(201).json({
      success: true,
      message: "Pharmacy created successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePharmacy = async (req, res) => {
  try {
    const data = await pharmacyService.updatePharmacy(
      req.params.id,
      req.body,
      req.user.user_id
    );
    return res.status(200).json({
      success: true,
      message: "Pharmacy updated successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const togglePharmacyStatus = async (req, res) => {
  try {
    const data = await pharmacyService.togglePharmacyStatus(
      req.params.id,
      req.user.user_id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePharmacy = async (req, res) => {
  try {
    await pharmacyService.deletePharmacy(req.params.id);
    return res.status(200).json({ success: true, message: "Pharmacy deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};

const listActivePharmacies = async (req, res) => {
  try {
    const data = await pharmacyService.listActivePharmacies();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPharmacyUser = async (req, res) => {
  try {
    const data = await pharmacyUserService.createPharmacyUser(
      req.params.id,
      req.body,
      req.user.user_id
    );
    return res.status(201).json({
      success: true,
      message: "Pharmacy user created",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePharmacyUser = async (req, res) => {
  try {
    const data = await pharmacyUserService.updatePharmacyUser(
      req.params.userId,
      req.body,
      req.user.user_id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const togglePharmacyUserStatus = async (req, res) => {
  try {
    const data = await pharmacyUserService.togglePharmacyUserStatus(
      req.params.userId,
      req.user.user_id
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const sendPrescription = async (req, res) => {
  try {
    const data = await pharmacyPrescriptionService.sendPrescriptionToPharmacy(
      req.body,
      req.user.user_id
    );
    return res.status(201).json({
      success: true,
      message: "Prescription sent to pharmacy",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const listPatientPrescriptionsForSend = async (req, res) => {
  try {
    const data = await pharmacyPrescriptionService.listPatientPrescriptionsForSend(
      req.params.patientId
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

const listHospitalPharmacyPrescriptions = async (req, res) => {
  try {
    const data = await pharmacyPrescriptionService.listPharmacyPrescriptionsForHospital(
      req.query
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  listPharmacies,
  getPharmacy,
  createPharmacy,
  updatePharmacy,
  togglePharmacyStatus,
  deletePharmacy,
  listActivePharmacies,
  createPharmacyUser,
  updatePharmacyUser,
  togglePharmacyUserStatus,
  sendPrescription,
  listPatientPrescriptionsForSend,
  listHospitalPharmacyPrescriptions,
};
