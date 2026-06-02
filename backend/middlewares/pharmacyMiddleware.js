"use strict";

const { PharmacyUserProfile, Pharmacy } = require("../models");
const { PHARMACY_STATUS } = require("../config/pharmacyConstants");

async function attachPharmacyContext(req, res, next) {
  try {
    const profile = await PharmacyUserProfile.findOne({
      where: { user_id: req.user.user_id, is_active: true },
      include: [
        {
          model: Pharmacy,
          as: "pharmacy",
          where: { status: PHARMACY_STATUS.ACTIVE },
          required: true,
        },
      ],
    });

    if (!profile?.pharmacy) {
      return res.status(403).json({
        success: false,
        message: "Pharmacy account is inactive or not linked to a pharmacy",
      });
    }

    req.pharmacyUser = {
      pharmacy_user_profile_id: profile.pharmacy_user_profile_id,
      pharmacy_id: profile.pharmacy_id,
      portal_role: profile.portal_role,
      pharmacy: profile.pharmacy,
    };
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to resolve pharmacy context",
    });
  }
}

module.exports = { attachPharmacyContext };
