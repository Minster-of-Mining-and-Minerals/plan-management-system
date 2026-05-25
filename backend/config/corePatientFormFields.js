"use strict";

const { PATIENT_MODEL_NAME } = require("./accountTypes");

/** System-managed form field definitions for patient auth/profile core. */
const CORE_PATIENT_FORM_FIELD_DEFS = [
  {
    field_key: "full_name",
    label: "Full Name",
    field_type: "input",
    storage_type: "core",
    category: "Account",
    is_required: true,
    is_visible: true,
    sort_order: 0,
    config: { min_length: 2 },
  },
  {
    field_key: "email",
    label: "Email",
    field_type: "input",
    storage_type: "core",
    category: "Account",
    is_required: false,
    is_visible: true,
    sort_order: 1,
    config: { pattern: "email" },
  },
  {
    field_key: "phone_number",
    label: "Phone Number",
    field_type: "input",
    storage_type: "core",
    category: "Account",
    is_required: true,
    is_visible: true,
    sort_order: 2,
    config: { pattern: "phone" },
  },
];

const CORE_FIELD_KEY_SET = new Set(
  CORE_PATIENT_FORM_FIELD_DEFS.map((d) => d.field_key)
);

function isCoreFormField(field) {
  return (
    field?.storage_type === "core" ||
    CORE_FIELD_KEY_SET.has(field?.field_key)
  );
}

module.exports = {
  PATIENT_MODEL_NAME,
  CORE_PATIENT_FORM_FIELD_DEFS,
  CORE_USER_FORM_FIELD_DEFS: CORE_PATIENT_FORM_FIELD_DEFS,
  CORE_FIELD_KEY_SET,
  isCoreFormField,
};
