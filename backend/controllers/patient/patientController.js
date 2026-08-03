"use strict";

const {
  User,
  PatientProfile,
  sequelize,
} = require("../../models");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const bcrypt = require("bcrypt");
const { ACCOUNT_TYPES } = require("../../config/accountTypes");
const { generatePatientCode } = require("../../services/patientIdService");
const { assignPatientCodes } = require("../../services/qrBarcodeService");
const {
  savePatientFieldValues,
  getCustomValuesMap,
  enrichPatientResponse,
} = require("../../services/patientFieldValueService");
const { getFormFieldsByModel } = require("../../services/formFieldService");
const { PATIENT_MODEL_NAME } = require("../../config/userFormConstants");
const { logAudit, auditContextFromReq } = require("../../services/auditService");
const { generateRandomPassword } = require("../../utils/password");

const PROFILE_ATTRS = [
  "date_of_birth",
  "gender",
  "blood_group",
  "marital_status",
  "nationality",
  "preferred_language",
  "emergency_contacts",
  "insurance_profile",
  "medical_history_summary",
  "patient_status",
];

function pickProfileData(body) {
  const data = {};
  for (const key of PROFILE_ATTRS) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  return data;
}

const createPatient = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userData = req.validatedUserData || {};
    const customValues = req.validatedCustomValues || {};
    const formFields = req.validatedFormFields || [];
    const profileData = pickProfileData(req.body);
    const { email, full_name, phone_number } = userData;
    const enable_login = req.body.enable_login !== false;

    if (email) {
      const existing = await User.findOne({ where: { email }, transaction: t });
      if (existing) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Email already in use." });
      }
    }

    const isAnalyticsPatient = email && email.startsWith("analytics_patient_") && email.endsWith("@novacure.com");
    const password = isAnalyticsPatient ? "password" : (req.body.password || generateRandomPassword());
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const patientCode = await generatePatientCode(t);
    const codes = assignPatientCodes(patientCode, userId);

    const user = await User.create(
      {
        user_id: userId,
        full_name,
        email: email || `${patientCode.toLowerCase()}@patient.local`,
        password: hashedPassword,
        phone_number: phone_number ?? null,
        account_type: ACCOUNT_TYPES.PATIENT,
        is_active: true,
        is_first_logged_in: isAnalyticsPatient ? false : enable_login,
      },
      { transaction: t }
    );

    await PatientProfile.create(
      {
        patient_profile_id: uuidv4(),
        user_id: userId,
        patient_code: patientCode,
        qr_code: codes.qr_code,
        barcode: codes.barcode,
        registered_by: req.user?.user_id || null,
        registered_at: new Date(),
        ...profileData,
      },
      { transaction: t }
    );

    await savePatientFieldValues(userId, customValues, formFields, t);
    await t.commit();

    const profile = await PatientProfile.findOne({ where: { user_id: userId } });
    const custom_fields = await getCustomValuesMap(userId, formFields);

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "create",
      resourceType: "patient",
      resourceId: userId,
      details: {
        ...auditContextFromReq(req, {
          module: "patients",
          outcome: "success",
          patient_code: patientCode,
        }).details,
      },
      ipAddress: req.ip || req.headers?.["x-forwarded-for"] || null,
    });

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: enrichPatientResponse(user, profile, custom_fields),
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("createPatient:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePatient = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id: user_id } = req.params;
    const userData = req.validatedUserData || {};
    const customValues = req.validatedCustomValues || {};
    const formFields = req.validatedFormFields || [];
    const profileData = pickProfileData(req.body);

    const user = await User.findOne({
      where: { user_id, account_type: ACCOUNT_TYPES.PATIENT },
      transaction: t,
    });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    const updates = { updated_at: new Date() };
    if (userData.full_name !== undefined) updates.full_name = userData.full_name;
    if (userData.email !== undefined) updates.email = userData.email;
    if (userData.phone_number !== undefined) updates.phone_number = userData.phone_number;
    await user.update(updates, { transaction: t });

    const profile = await PatientProfile.findOne({
      where: { user_id },
      transaction: t,
    });
    if (profile && Object.keys(profileData).length) {
      await profile.update({ ...profileData, updated_at: new Date() }, { transaction: t });
    }

    if (Object.keys(customValues).length) {
      await savePatientFieldValues(user_id, customValues, formFields, t);
    }

    await t.commit();

    const refreshedProfile = await PatientProfile.findOne({ where: { user_id } });
    const custom_fields = await getCustomValuesMap(user_id, formFields);

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "update",
      resourceType: "patient",
      resourceId: user_id,
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: enrichPatientResponse(user, refreshedProfile, custom_fields),
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPatients = async (req, res) => {
  try {
    const { search, patient_status, is_active } = req.query;
    const {
      getPagination,
      getPagingData,
      parsePageLimit,
      wantsPagination,
    } = require("../../utils/pagination");

    const userWhere = { account_type: ACCOUNT_TYPES.PATIENT };
    if (is_active !== undefined) userWhere.is_active = is_active === "true";

    const profileWhere = {};
    if (patient_status) profileWhere.patient_status = patient_status;

    if (search) {
      const term = `%${search}%`;
      userWhere[Op.or] = [
        { full_name: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone_number: { [Op.iLike]: term } },
        { "$patientProfile.patient_code$": { [Op.iLike]: term } },
      ];
    }

    const include = [
      {
        model: PatientProfile,
        as: "patientProfile",
        where: Object.keys(profileWhere).length ? profileWhere : undefined,
        required: Object.keys(profileWhere).length > 0,
      },
    ];

    const mapPatient = (u) => {
      const plain = u.toJSON ? u.toJSON() : u;
      return {
        ...plain,
        profile: plain.patientProfile ?? plain.profile,
      };
    };

    const paginate = wantsPagination(req.query);
    if (paginate) {
      const { page, limit } = parsePageLimit(req.query, {
        page: 1,
        limit: 20,
        maxLimit: 100,
      });
      const { limit: take, offset } = getPagination(page, limit);
      const result = await User.findAndCountAll({
        where: userWhere,
        include,
        subQuery: false,
        distinct: true,
        order: [["created_at", "DESC"]],
        attributes: { exclude: ["password", "otp", "otp_expiry"] },
        limit: take,
        offset,
      });
      const paging = getPagingData(
        {
          count: Array.isArray(result.count) ? result.count.length : result.count,
          rows: result.rows,
        },
        page,
        limit
      );
      return res.status(200).json({
        success: true,
        data: paging.results.map(mapPatient),
        pagination: {
          total: paging.total,
          totalPages: paging.totalPages,
          currentPage: paging.currentPage,
          limit: paging.limit,
        },
      });
    }

    const patients = await User.findAll({
      where: userWhere,
      include,
      subQuery: false,
      order: [["created_at", "DESC"]],
      attributes: { exclude: ["password", "otp", "otp_expiry"] },
    });

    return res.status(200).json({
      success: true,
      data: patients.map(mapPatient),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPatientById = async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const user = await User.findOne({
      where: { user_id, account_type: ACCOUNT_TYPES.PATIENT },
      attributes: { exclude: ["password", "otp", "otp_expiry"] },
      include: [{ model: PatientProfile, as: "patientProfile" }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    const formFields = await getFormFieldsByModel(PATIENT_MODEL_NAME);
    const custom_fields = await getCustomValuesMap(user_id, formFields);

    return res.status(200).json({
      success: true,
      data: enrichPatientResponse(
        user,
        user.patientProfile || user.profile,
        custom_fields
      ),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyPatientProfile = async (req, res) => {
  return getPatientById(
    { ...req, params: { id: req.user.user_id } },
    res
  );
};

const deletePatient = async (req, res) => {
  try {
    const { id: user_id } = req.params;
    const user = await User.findOne({
      where: { user_id, account_type: ACCOUNT_TYPES.PATIENT },
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "Patient not found." });
    }

    await user.update({ is_active: false });
    const profile = await PatientProfile.findOne({ where: { user_id } });
    if (profile) {
      await profile.update({ patient_status: "archived" });
    }

    await logAudit({
      actorUserId: req.user?.user_id,
      action: "deactivate",
      resourceType: "patient",
      resourceId: user_id,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: "Patient deactivated." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPatient,
  updatePatient,
  getPatients,
  getPatientById,
  getMyPatientProfile,
  deletePatient,
};
