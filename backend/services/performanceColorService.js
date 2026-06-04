"use strict";

function normalizeThresholds(thresholds = []) {
  return thresholds
    .filter((t) => t.is_active !== false)
    .slice()
    .sort((a, b) => {
      const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.min_percentage - b.min_percentage;
    });
}

function resolveThresholdForPercentage(thresholds, percentage) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  const active = normalizeThresholds(thresholds);

  for (const threshold of active) {
    if (value >= threshold.min_percentage && value <= threshold.max_percentage) {
      return threshold;
    }
  }

  return active[active.length - 1] ?? null;
}

function resolveColorForPercentage(thresholds, percentage) {
  const match = resolveThresholdForPercentage(thresholds, percentage);
  return match?.color_hex ?? "#6B7280";
}

module.exports = {
  normalizeThresholds,
  resolveThresholdForPercentage,
  resolveColorForPercentage,
};
