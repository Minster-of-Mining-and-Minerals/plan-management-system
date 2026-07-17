"use strict";

const { PlanVersion } = require("../../models");
const { resolvePlanRuleForVersion } = require("../planRuleService");
const {
  getWeightStartLevel,
  getStepForLevel,
  getStepLabel,
  levelToNodeType,
  getMaxDepth,
} = require("../planRuleStepUtils");

async function loadRuleForPlanVersion(planVersionId, transaction = null) {
  if (!planVersionId) return null;
  const planVersion = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!planVersion) return null;
  return resolvePlanRuleForVersion(planVersion, transaction);
}

function getAmendableTargetLevel(rule) {
  if (!rule) return null;
  const weightLevel = getWeightStartLevel(rule);
  if (weightLevel != null) return weightLevel;
  if (getStepForLevel(rule, 3)) return 3;
  return null;
}

function getAmendableTargetLabel(rule) {
  const level = getAmendableTargetLevel(rule);
  if (level == null) return "Target node";
  return getStepLabel(rule, level);
}

function getAmendableTargetType(rule) {
  const level = getAmendableTargetLevel(rule);
  if (level == null) return "kpi";
  return levelToNodeType(level);
}

function isAmendableTargetNode(node, rule) {
  const level = getAmendableTargetLevel(rule);
  if (level != null && node?.level != null) {
    return node.level === level;
  }
  return node?.type === "kpi";
}

function assertAmendableTargetNode(node, rule, messages = {}) {
  if (!node) {
    return {
      ok: false,
      message: messages.notFound || messages.KPI_NOT_FOUND || "Target node was not found.",
    };
  }
  if (isAmendableTargetNode(node, rule)) {
    return { ok: true };
  }
  return {
    ok: false,
    message:
      messages.invalid ||
      messages.INVALID_KPI ||
      "Selected node cannot receive this amendment.",
  };
}

function amendableTargetQueryFilter(rule) {
  const level = getAmendableTargetLevel(rule);
  if (level != null) {
    return { level };
  }
  return { type: "kpi" };
}

function getChildLevelForParent(parent) {
  return parent ? parent.level + 1 : 1;
}

function canAddChildUnder(rule, parent) {
  const childLevel = getChildLevelForParent(parent);
  return childLevel <= getMaxDepth(rule);
}

module.exports = {
  loadRuleForPlanVersion,
  getAmendableTargetLevel,
  getAmendableTargetLabel,
  getAmendableTargetType,
  isAmendableTargetNode,
  assertAmendableTargetNode,
  amendableTargetQueryFilter,
  getChildLevelForParent,
  canAddChildUnder,
};
