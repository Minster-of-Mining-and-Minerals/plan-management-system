"use strict";

const ACCOUNT_TYPES = {
  INTERNAL: "INTERNAL",
  PATIENT: "PATIENT",
};

const ACCOUNT_TYPE_LIST = Object.values(ACCOUNT_TYPES);

/** Form field definitions target entity */
const PATIENT_MODEL_NAME = "Patient";

/** Legacy — do not use for new form configuration */
const LEGACY_USER_MODEL_NAME = "User";

module.exports = {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LIST,
  PATIENT_MODEL_NAME,
  LEGACY_USER_MODEL_NAME,
};
