"use strict";

/**
 * Decimal utility functions for production calculations.
 * Ensures safe decimal rounding and prevents floating point inaccuracies.
 */

function roundDecimal(val, decimals = 4) {
  if (val === null || val === undefined || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((Number(val) + Number.EPSILON) * factor) / factor;
}

function calculateAchievementPercentage(actual, target) {
  const numTarget = Number(target);
  const numActual = Number(actual);
  if (!numTarget || numTarget <= 0 || isNaN(numTarget)) {
    return null; // Return null if target is zero or negative or not defined
  }
  return roundDecimal((numActual / numTarget) * 100, 2);
}

function calculateRemaining(actual, target) {
  const numTarget = Number(target) || 0;
  const numActual = Number(actual) || 0;
  return roundDecimal(numTarget - numActual, 4);
}

module.exports = {
  roundDecimal,
  calculateAchievementPercentage,
  calculateRemaining,
};
