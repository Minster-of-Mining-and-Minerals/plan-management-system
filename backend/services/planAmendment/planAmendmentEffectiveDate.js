"use strict";

const {
  EFFECTIVE_MODE,
  normalizeEffectiveMode,
} = require("../../utils/planAmendmentActionUtils");
const { AMENDMENT_MESSAGES } = require("../../utils/planAmendmentMessages");

/**
 * Resolve how / when an amendment package becomes effective.
 * Handlers decide domain application; the framework only stores and validates mode/date.
 */
function resolveEffectiveContext(amendmentOrPayload = {}, options = {}) {
  const mode = normalizeEffectiveMode(
    amendmentOrPayload.effective_mode ??
      amendmentOrPayload.effectiveMode ??
      options.effectiveMode
  );

  if (!mode) {
    return {
      success: false,
      message: "Invalid effective mode. Use immediate, next_period, or custom_date.",
    };
  }

  const rawDate =
    amendmentOrPayload.effective_date ??
    amendmentOrPayload.effectiveDate ??
    options.effectiveDate ??
    null;

  if (mode === EFFECTIVE_MODE.CUSTOM_DATE) {
    if (!rawDate) {
      return {
        success: false,
        message: "Effective date is required when effective mode is custom_date.",
      };
    }
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return { success: false, message: "Effective date is invalid." };
    }
    return {
      success: true,
      data: {
        mode,
        effectiveDate: String(rawDate).slice(0, 10),
        applyImmediately: false,
        applyNextPeriod: false,
        label: `Effective ${String(rawDate).slice(0, 10)}`,
      },
    };
  }

  if (mode === EFFECTIVE_MODE.NEXT_PERIOD) {
    return {
      success: true,
      data: {
        mode,
        effectiveDate: rawDate ? String(rawDate).slice(0, 10) : null,
        applyImmediately: false,
        applyNextPeriod: true,
        label: "Effective next period",
      },
    };
  }

  return {
    success: true,
    data: {
      mode: EFFECTIVE_MODE.IMMEDIATE,
      effectiveDate: rawDate ? String(rawDate).slice(0, 10) : null,
      applyImmediately: true,
      applyNextPeriod: false,
      label: "Effective immediately",
    },
  };
}

function validateEffectiveDateForCreate(payload = {}) {
  const resolved = resolveEffectiveContext(payload);
  if (!resolved.success) {
    return { valid: false, message: resolved.message || AMENDMENT_MESSAGES.VALIDATION_FAILED };
  }
  return { valid: true, effective: resolved.data };
}

module.exports = {
  EFFECTIVE_MODE,
  resolveEffectiveContext,
  validateEffectiveDateForCreate,
};
