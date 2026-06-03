"use strict";

const MEDICAL_CERTIFICATE_TEMPLATE_STATUSES = ["active", "archived"];

const DEFAULT_CERTIFICATE_TEMPLATE_CODE = "default_medical_certificate";

const CERTIFICATE_SIGNATURE_TYPES = ["none", "user", "template"];

const DEFAULT_INCLUDE_OPTIONS = {
  diagnosis: true,
  treatment: true,
  prescription_reference: true,
  lab_results: false,
  procedure_notes: true,
  referral: true,
};

const INCLUDE_OPTION_KEYS = Object.keys(DEFAULT_INCLUDE_OPTIONS);

module.exports = {
  MEDICAL_CERTIFICATE_TEMPLATE_STATUSES,
  DEFAULT_CERTIFICATE_TEMPLATE_CODE,
  CERTIFICATE_SIGNATURE_TYPES,
  DEFAULT_INCLUDE_OPTIONS,
  INCLUDE_OPTION_KEYS,
};
