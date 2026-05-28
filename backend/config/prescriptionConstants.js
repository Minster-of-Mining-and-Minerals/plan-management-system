"use strict";

const PRESCRIPTION_CATEGORY_STATUSES = ["active", "inactive"];
const PRESCRIPTION_TEMPLATE_STATUSES = ["active", "archived"];
const PRESCRIPTION_STATUSES = ["draft", "issued", "cancelled"];
const SIGNATURE_TYPES = ["template", "user", "none"];

const DEFAULT_DOCUMENT_TEMPLATE_CODE = "standard_rx";

module.exports = {
  PRESCRIPTION_CATEGORY_STATUSES,
  PRESCRIPTION_TEMPLATE_STATUSES,
  PRESCRIPTION_STATUSES,
  SIGNATURE_TYPES,
  DEFAULT_DOCUMENT_TEMPLATE_CODE,
};
