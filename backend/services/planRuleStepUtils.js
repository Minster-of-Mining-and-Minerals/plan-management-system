"use strict";

/** Map hierarchy level to legacy plan_node.type for storage compatibility */
function levelToNodeType(level) {
  const map = { 1: "strategic", 2: "goal", 3: "kpi", 4: "task" };
  return map[level] || "task";
}

const DEFAULT_STEP_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DB2777", "#0891B2"];
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function normalizeStepColorHex(value, stepOrder) {
  if (typeof value === "string" && HEX_COLOR.test(value.trim())) {
    return value.trim().toUpperCase();
  }
  return DEFAULT_STEP_COLORS[(stepOrder - 1) % DEFAULT_STEP_COLORS.length];
}

function sortSteps(steps) {
  return [...steps].sort((a, b) => {
    const orderA = typeof a.step_order === "number" ? a.step_order : a.get?.("step_order");
    const orderB = typeof b.step_order === "number" ? b.step_order : b.get?.("step_order");
    return orderA - orderB;
  });
}

function toPlainStep(step) {
  if (!step) return step;
  if (typeof step.get === "function") {
    return step.get({ plain: true });
  }
  if (typeof step.toJSON === "function") {
    return step.toJSON();
  }
  return step;
}

function getWeightStartLevel(rule) {
  if (!rule?.steps?.length) return null;
  const sorted = sortSteps(rule.steps.map(toPlainStep));
  const startStep = sorted.find((s) => s.requires_weight);
  return startStep?.step_order ?? null;
}

function stepRequiresWeight(rule, level) {
  const start = getWeightStartLevel(rule);
  return start !== null && level >= start;
}

function stepRequiresContributionWeight(rule, level) {
  const step = getStepForLevel(rule, level);
  return Boolean(step?.requires_contribution_weight);
}

function getContributionSiblingTarget() {
  return 100;
}

function isWeightModeSelectionLevel(rule, level) {
  return getWeightStartLevel(rule) === level;
}

function getStepForLevel(rule, level) {
  if (!rule?.steps?.length) return null;
  return rule.steps.find((s) => s.step_order === level) || null;
}

function getStepLabel(rule, level) {
  const step = getStepForLevel(rule, level);
  return step?.label || `Level ${level}`;
}

function getMaxDepth(rule) {
  if (!rule?.steps?.length) return 4;
  return Math.max(...rule.steps.map((s) => s.step_order));
}

function getWeightTarget(parent, weightMode) {
  if (parent && parent.weight > 0) return parent.weight;
  if (weightMode === "percentage") return 100;
  return null;
}

function getWeightUnitLabel(weightMode) {
  switch (weightMode) {
    case "percentage":
      return "%";
    case "frequency":
      return "times";
    default:
      return "pts";
  }
}

/**
 * Normalize steps: level + label + optional requires_weight on ONE level (cascades down).
 */
function normalizeRuleSteps(steps) {
  const sorted = sortSteps(steps);
  if (!sorted.length) {
    throw new Error("At least one hierarchy level is required");
  }

  const firstWeightStep = sorted.find((s) => s.requires_weight);
  const weightStart = firstWeightStep ? firstWeightStep.step_order : null;

  return sorted.map((step, index) => {
    const stepOrder = index + 1;
    return {
      step_order: stepOrder,
      label: step.label?.trim() || `Level ${stepOrder}`,
      requires_weight: weightStart !== null && stepOrder >= weightStart,
      requires_contribution_weight: Boolean(step.requires_contribution_weight),
      node_type: levelToNodeType(stepOrder),
      color_hex: normalizeStepColorHex(step.color_hex, stepOrder),
    };
  });
}

function enrichRuleSteps(steps) {
  const sorted = sortSteps((steps || []).map(toPlainStep));
  const weightStart = getWeightStartLevel({ steps: sorted });

  return sorted.map((step) => ({
    ...step,
    requires_weight: weightStart !== null && step.step_order >= weightStart,
    inherits_weight_from_level:
      weightStart !== null && step.step_order > weightStart ? weightStart : null,
  }));
}

async function resolveNodeWeightMode({ rule, level, parent, weightMode, transaction, PlanNode }) {
  if (!stepRequiresWeight(rule, level)) return { mode: null };

  if (isWeightModeSelectionLevel(rule, level)) {
    if (!weightMode) {
      return { error: "Weight evaluation mode is required at this level" };
    }
    return { mode: weightMode };
  }

  if (parent?.weight_mode) return { mode: parent.weight_mode };

  let current = parent;
  while (current) {
    if (current.weight_mode) return { mode: current.weight_mode };
    if (!current.parent_id) break;
    current = await PlanNode.findByPk(current.parent_id, { transaction });
  }

  return {
    error:
      "Weight evaluation mode must be set on the parent branch at the first weighted level",
  };
}

module.exports = {
  DEFAULT_STEP_COLORS,
  levelToNodeType,
  getWeightStartLevel,
  stepRequiresWeight,
  stepRequiresContributionWeight,
  getContributionSiblingTarget,
  isWeightModeSelectionLevel,
  getStepForLevel,
  getStepLabel,
  getMaxDepth,
  getWeightTarget,
  getWeightUnitLabel,
  normalizeRuleSteps,
  enrichRuleSteps,
  resolveNodeWeightMode,
  toPlainStep,
};
