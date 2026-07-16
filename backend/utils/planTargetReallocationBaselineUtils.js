"use strict";

/**
 * Baseline helpers for Target Reallocation reporting.
 * Original targets are captured at process start and never mutate.
 */

function resolveOriginalTargetFromBaseline(baselineRow, fallbackCurrentTarget = null) {
  if (baselineRow?.original_target != null) {
    return Number(baselineRow.original_target);
  }
  if (fallbackCurrentTarget != null) {
    return Number(fallbackCurrentTarget);
  }
  return null;
}

function computeReallocationReportingFields({
  originalTarget,
  currentTarget,
  reallocatedOut = 0,
  reallocatedIn = 0,
}) {
  const original = originalTarget != null ? Number(originalTarget) : null;
  const current = currentTarget != null ? Number(currentTarget) : null;
  const out = Number(reallocatedOut) || 0;
  const inAmount = Number(reallocatedIn) || 0;
  const netAdjustment =
    original != null && current != null ? current - original : inAmount - out;

  return {
    original_target: original,
    current_target: current,
    reallocated_out: out,
    reallocated_in: inAmount,
    net_adjustment: netAdjustment,
  };
}

module.exports = {
  resolveOriginalTargetFromBaseline,
  computeReallocationReportingFields,
};
