"use strict";

const { PATIENT_MODEL_NAME } = require("./accountTypes");

/** @deprecated Use PATIENT_MODEL_NAME */
const USER_MODEL_NAME = PATIENT_MODEL_NAME;

/** Fixed columns on `users` for patient accounts — never stored in patient_field_values. */
const CORE_PATIENT_COLUMNS = ["full_name", "email", "phone_number"];
const CORE_USER_COLUMNS = CORE_PATIENT_COLUMNS;

const CORE_USER_COLUMN_SET = new Set(CORE_USER_COLUMNS);

/**
 * Request keys handled outside FormField (not validated as dynamic).
 * Includes patient_profiles columns + create flags sent by the patient UI.
 */
const SYSTEM_USER_PAYLOAD_KEYS = [
  "role_ids",
  "custom_fields",
  "password",
  "enable_login",
  // patient_profiles columns (also applied via pickProfileData)
  "patient_status",
  "date_of_birth",
  "gender",
  "blood_group",
  "marital_status",
  "nationality",
  "preferred_language",
  "emergency_contacts",
  "insurance_profile",
  "medical_history_summary",
];

const PROTECTED_USER_COLUMNS = new Set([
  "user_id",
  "password",
  "otp",
  "otp_expiry",
  "last_login_at",
  "password_changed_at",
  "is_first_logged_in",
  "profile_image",
  "is_active",
  "created_at",
  "updated_at",
  "deleted_at",
]);

const STORAGE_TYPES = ["core", "custom"];

const DEFAULT_FIELD_CATEGORIES = [
  "Account",
  "Personal Information",
  "Demographics",
  "Emergency Contacts",
  "Insurance Information",
  "Medical Information",
  "Address Information",
  "Guardian Information",
  "General",
];

const FIELD_TYPES = [
  "input",
  "textarea",
  "select",
  "file",
  "checkbox",
  "date",
  "number",
];

const ETHIOPIAN_PHONE_REGEX = /^(\+251|0)(9|7)\d{8}$/;

const CUSTOM_FIELD_KEY_REGEX = /^[a-z][a-z0-9_]{0,63}$/;

function isCoreFieldKey(fieldKey) {
  return CORE_USER_COLUMN_SET.has(fieldKey);
}

function isValidCustomFieldKey(fieldKey) {
  if (!fieldKey || typeof fieldKey !== "string") return false;
  if (PROTECTED_USER_COLUMNS.has(fieldKey)) return false;
  if (CORE_USER_COLUMN_SET.has(fieldKey)) return false;
  if (SYSTEM_USER_PAYLOAD_KEYS.includes(fieldKey)) return false;
  return CUSTOM_FIELD_KEY_REGEX.test(fieldKey);
}

module.exports = {
  PATIENT_MODEL_NAME,
  USER_MODEL_NAME,
  CORE_PATIENT_COLUMNS,
  CORE_USER_COLUMNS,
  CORE_USER_COLUMN_SET,
  SYSTEM_USER_PAYLOAD_KEYS,
  PROTECTED_USER_COLUMNS,
  STORAGE_TYPES,
  DEFAULT_FIELD_CATEGORIES,
  FIELD_TYPES,
  ETHIOPIAN_PHONE_REGEX,
  CUSTOM_FIELD_KEY_REGEX,
  isCoreFieldKey,
  isValidCustomFieldKey,
};
