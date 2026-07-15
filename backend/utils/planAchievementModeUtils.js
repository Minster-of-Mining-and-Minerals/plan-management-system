"use strict";

const ACHIEVEMENT_MODE = Object.freeze({
  PERIOD: "period",
  ANNUAL: "annual",
});

function normalizeAchievementMode(value) {
  const normalized = String(value || ACHIEVEMENT_MODE.PERIOD)
    .trim()
    .toLowerCase();
  return normalized === ACHIEVEMENT_MODE.ANNUAL
    ? ACHIEVEMENT_MODE.ANNUAL
    : ACHIEVEMENT_MODE.PERIOD;
}

function isAnnualAchievementMode(nodeOrMode) {
  if (nodeOrMode == null) {
    return false;
  }
  if (typeof nodeOrMode === "string") {
    return normalizeAchievementMode(nodeOrMode) === ACHIEVEMENT_MODE.ANNUAL;
  }
  return (
    normalizeAchievementMode(nodeOrMode.achievement_mode) === ACHIEVEMENT_MODE.ANNUAL
  );
}

module.exports = {
  ACHIEVEMENT_MODE,
  normalizeAchievementMode,
  isAnnualAchievementMode,
};
