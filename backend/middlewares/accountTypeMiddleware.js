"use strict";

const { ACCOUNT_TYPES } = require("../config/accountTypes");

const requireInternalAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (req.user.account_type !== ACCOUNT_TYPES.INTERNAL) {
    return res.status(403).json({
      success: false,
      message: "Access denied: internal staff account required",
    });
  }
  next();
};

const requirePatientAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (req.user.account_type !== ACCOUNT_TYPES.PATIENT) {
    return res.status(403).json({
      success: false,
      message: "Access denied: patient account required",
    });
  }
  next();
};

const requirePharmacyAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  if (req.user.account_type !== ACCOUNT_TYPES.PHARMACY) {
    return res.status(403).json({
      success: false,
      message: "Access denied: pharmacy account required",
    });
  }
  next();
};

module.exports = {
  requireInternalAccount,
  requirePatientAccount,
  requirePharmacyAccount,
};
