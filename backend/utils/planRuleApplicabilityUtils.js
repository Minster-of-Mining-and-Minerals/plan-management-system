"use strict";

const { collectAncestorIds } = require("./structureLifecycleUtils");

function isPlanRuleApplicableToSector(rule, sectorId, structureIndex) {
  if (!rule || rule.is_active === false) {
    return false;
  }

  if (!rule.government_structure_id) {
    return true;
  }

  if (!sectorId) {
    return false;
  }

  if (rule.inherit_to_descendants) {
    const ancestors = collectAncestorIds(
      sectorId,
      structureIndex,
      "government_structure_id",
      "parent_id"
    );
    return ancestors.includes(rule.government_structure_id);
  }

  return rule.government_structure_id === sectorId;
}

function filterApplicablePlanRules(rules, sectorId, structureIndex) {
  if (!Array.isArray(rules) || !sectorId) {
    return (rules || []).filter((rule) => !rule.government_structure_id);
  }

  return rules.filter((rule) =>
    isPlanRuleApplicableToSector(rule, sectorId, structureIndex)
  );
}

function assertPlanRuleApplicableToSector(rule, sectorId, structureIndex) {
  if (!rule) {
    const error = new Error("Plan rule not found.");
    error.status = 404;
    throw error;
  }

  if (!isPlanRuleApplicableToSector(rule, sectorId, structureIndex)) {
    const error = new Error(
      "Selected plan rule does not apply to the chosen sector."
    );
    error.status = 400;
    throw error;
  }
}

module.exports = {
  isPlanRuleApplicableToSector,
  filterApplicablePlanRules,
  assertPlanRuleApplicableToSector,
};
