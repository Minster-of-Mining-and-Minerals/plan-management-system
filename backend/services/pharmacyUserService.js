"use strict";

const bcrypt = require("bcrypt");
const { User, PharmacyUserProfile, Pharmacy } = require("../models");
const { ACCOUNT_TYPES } = require("../config/accountTypes");
const { PHARMACY_USER_ROLES } = require("../config/pharmacyConstants");

async function createPharmacyUser(pharmacyId, payload, actorUserId) {
  const pharmacy = await Pharmacy.findByPk(pharmacyId);
  if (!pharmacy) {
    const err = new Error("Pharmacy not found");
    err.status = 404;
    throw err;
  }

  const email = payload.email?.trim().toLowerCase();
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = new Error("Email already in use");
    err.status = 400;
    throw err;
  }

  const password = payload.password || "Pharmacy@123";
  const hashed = await bcrypt.hash(password, 10);

  const t = await User.sequelize.transaction();
  try {
    const user = await User.create(
      {
        full_name: payload.full_name?.trim(),
        email,
        password: hashed,
        phone_number: payload.phone_number?.trim() || null,
        account_type: ACCOUNT_TYPES.PHARMACY,
        is_active: payload.is_active !== false,
        is_first_logged_in: true,
      },
      { transaction: t }
    );

    await PharmacyUserProfile.create(
      {
        user_id: user.user_id,
        pharmacy_id: pharmacyId,
        portal_role: payload.portal_role === PHARMACY_USER_ROLES.ADMIN
          ? PHARMACY_USER_ROLES.ADMIN
          : PHARMACY_USER_ROLES.STAFF,
        is_active: true,
        created_by: actorUserId,
        updated_by: actorUserId,
      },
      { transaction: t }
    );

    await t.commit();
    return getPharmacyUserById(user.user_id);
  } catch (error) {
    if (!t.finished) await t.rollback();
    throw error;
  }
}

async function getPharmacyUserById(userId) {
  const profile = await PharmacyUserProfile.findOne({
    where: { user_id: userId },
    include: [
      {
        model: User,
        as: "user",
        attributes: { exclude: ["password", "otp", "otp_expiry"] },
      },
      { model: Pharmacy, as: "pharmacy" },
    ],
  });
  if (!profile) {
    const err = new Error("Pharmacy user not found");
    err.status = 404;
    throw err;
  }
  const plain = profile.toJSON();
  return {
    ...plain.user,
    pharmacy_user_profile_id: plain.pharmacy_user_profile_id,
    pharmacy_id: plain.pharmacy_id,
    portal_role: plain.portal_role,
    pharmacy: plain.pharmacy,
  };
}

async function updatePharmacyUser(userId, payload, actorUserId) {
  const profile = await PharmacyUserProfile.findOne({ where: { user_id: userId } });
  if (!profile) {
    const err = new Error("Pharmacy user not found");
    err.status = 404;
    throw err;
  }

  const user = await User.findByPk(userId);
  if (!user || user.account_type !== ACCOUNT_TYPES.PHARMACY) {
    const err = new Error("Pharmacy user not found");
    err.status = 404;
    throw err;
  }

  if (payload.email && payload.email !== user.email) {
    const dup = await User.findOne({ where: { email: payload.email.trim() } });
    if (dup) {
      const err = new Error("Email already in use");
      err.status = 400;
      throw err;
    }
  }

  await user.update({
    full_name: payload.full_name?.trim() ?? user.full_name,
    email: payload.email?.trim() ?? user.email,
    phone_number: payload.phone_number ?? user.phone_number,
    is_active: payload.is_active ?? user.is_active,
  });

  await profile.update({
    portal_role: payload.portal_role ?? profile.portal_role,
    is_active: payload.is_active ?? profile.is_active,
    updated_by: actorUserId,
  });

  return getPharmacyUserById(userId);
}

async function togglePharmacyUserStatus(userId, actorUserId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error("Pharmacy user not found");
    err.status = 404;
    throw err;
  }
  await user.update({ is_active: !user.is_active });
  const profile = await PharmacyUserProfile.findOne({ where: { user_id: userId } });
  if (profile) {
    await profile.update({
      is_active: user.is_active,
      updated_by: actorUserId,
    });
  }
  return getPharmacyUserById(userId);
}

module.exports = {
  createPharmacyUser,
  getPharmacyUserById,
  updatePharmacyUser,
  togglePharmacyUserStatus,
};
