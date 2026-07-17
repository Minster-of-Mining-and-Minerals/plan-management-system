"use strict";

/**
 * Canonical amendment type identifiers (lowercase DB / API values).
 * Spec names like TARGET_REALLOCATION map 1:1 via normalizeAmendmentType.
 */
const AMENDMENT_TYPE = Object.freeze({
  TARGET_REALLOCATION: "target_reallocation",
  ANNUAL_TARGET_REVISION: "annual_target_revision",
  BUDGET_INCREASE: "budget_increase",
  BUDGET_REDUCTION: "budget_reduction",
  KPI_ADDITION: "kpi_addition",
  KPI_REMOVAL: "kpi_removal",
  OWNER_TRANSFER: "owner_transfer",
  TIMELINE_EXTENSION: "timeline_extension",
  PLAN_CORRECTION: "plan_correction",
  CUSTOM: "custom",
});

const AMENDMENT_TYPE_VALUES = Object.freeze(Object.values(AMENDMENT_TYPE));

/**
 * Types that may be created once a handler marks itself available.
 * Step 1: only target_reallocation is intended to become available (Step 4).
 */
const AMENDMENT_TYPE_AVAILABILITY = Object.freeze({
  [AMENDMENT_TYPE.TARGET_REALLOCATION]: true,
  [AMENDMENT_TYPE.ANNUAL_TARGET_REVISION]: true,
  [AMENDMENT_TYPE.BUDGET_INCREASE]: false,
  [AMENDMENT_TYPE.BUDGET_REDUCTION]: false,
  [AMENDMENT_TYPE.KPI_ADDITION]: true,
  [AMENDMENT_TYPE.KPI_REMOVAL]: false,
  [AMENDMENT_TYPE.OWNER_TRANSFER]: false,
  [AMENDMENT_TYPE.TIMELINE_EXTENSION]: false,
  [AMENDMENT_TYPE.PLAN_CORRECTION]: false,
  [AMENDMENT_TYPE.CUSTOM]: false,
});

function normalizeAmendmentType(type) {
  if (type == null || type === "") return null;
  const raw = String(type).trim();
  const asKey = raw.toUpperCase().replace(/[\s-]+/g, "_");
  if (AMENDMENT_TYPE[asKey]) {
    return AMENDMENT_TYPE[asKey];
  }
  const lower = raw.toLowerCase();
  return AMENDMENT_TYPE_VALUES.includes(lower) ? lower : null;
}

function isKnownAmendmentType(type) {
  return normalizeAmendmentType(type) != null;
}

function isAmendmentTypeMarkedAvailable(type) {
  const normalized = normalizeAmendmentType(type);
  if (!normalized) return false;
  return Boolean(AMENDMENT_TYPE_AVAILABILITY[normalized]);
}

function amendmentTypeLabel(type) {
  const normalized = normalizeAmendmentType(type);
  switch (normalized) {
    case AMENDMENT_TYPE.TARGET_REALLOCATION:
      return "Target Reallocation";
    case AMENDMENT_TYPE.ANNUAL_TARGET_REVISION:
      return "Annual Target Revision";
    case AMENDMENT_TYPE.BUDGET_INCREASE:
      return "Budget Increase";
    case AMENDMENT_TYPE.BUDGET_REDUCTION:
      return "Budget Reduction";
    case AMENDMENT_TYPE.KPI_ADDITION:
      return "KPI Addition";
    case AMENDMENT_TYPE.KPI_REMOVAL:
      return "KPI Removal";
    case AMENDMENT_TYPE.OWNER_TRANSFER:
      return "Owner Transfer";
    case AMENDMENT_TYPE.TIMELINE_EXTENSION:
      return "Timeline Extension";
    case AMENDMENT_TYPE.PLAN_CORRECTION:
      return "Plan Correction";
    case AMENDMENT_TYPE.CUSTOM:
      return "Custom";
    default:
      return "Amendment";
  }
}

module.exports = {
  AMENDMENT_TYPE,
  AMENDMENT_TYPE_VALUES,
  AMENDMENT_TYPE_AVAILABILITY,
  normalizeAmendmentType,
  isKnownAmendmentType,
  isAmendmentTypeMarkedAvailable,
  amendmentTypeLabel,
};
