"use strict";

const {
  ACHIEVEMENT_MODE,
  normalizeAchievementMode,
  isAnnualAchievementMode,
} = require("../utils/planAchievementModeUtils");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  normalizeAchievementMode("ANNUAL") === ACHIEVEMENT_MODE.ANNUAL,
  "normalize annual"
);
assert(
  normalizeAchievementMode("other") === ACHIEVEMENT_MODE.PERIOD,
  "fallback period"
);
assert(isAnnualAchievementMode({ achievement_mode: "annual" }) === true, "node annual");
assert(isAnnualAchievementMode({ achievement_mode: "period" }) === false, "node period");
assert(isAnnualAchievementMode(null) === false, "null");

console.log("Annual achievement mode checks passed.");
