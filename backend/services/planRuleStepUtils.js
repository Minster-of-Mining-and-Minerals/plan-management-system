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

function getStepTargetRequirement(stepOrRule, level) {
  let step = stepOrRule;
  if (level != null && stepOrRule?.steps) {
    step = getStepForLevel(stepOrRule, level);
  }
  if (!step) return "none";
  const plain = toPlainStep ? toPlainStep(step) : step;
  if (plain.target_requirement) {
    return plain.target_requirement;
  }
  if (Boolean(plain.requires_weight)) {
    return "required";
  }
  if (Boolean(plain.allow_kpi ?? plain.allow_target)) {
    return "optional";
  }
  return "none";
}

function stepAllowsTarget(stepOrRule, level) {
  const req = getStepTargetRequirement(stepOrRule, level);
  return req === "required" || req === "optional";
}

function stepRequiresTarget(stepOrRule, level) {
  return getStepTargetRequirement(stepOrRule, level) === "required";
}

function stepTargetIsOptional(stepOrRule, level) {
  return getStepTargetRequirement(stepOrRule, level) === "optional";
}

function getWeightStartLevel(rule) {
  if (!rule?.steps?.length) return null;
  const sorted = sortSteps(rule.steps.map(toPlainStep));
  const startStep = sorted.find((s) => stepAllowsTarget(s));
  return startStep?.step_order ?? null;
}

function getStepAssignmentRequirement(stepOrRule, level) {
  let step = stepOrRule;
  if (level != null && stepOrRule?.steps) {
    step = getStepForLevel(stepOrRule, level);
  }
  if (!step) return "none";
  const plain = toPlainStep ? toPlainStep(step) : step;
  if (plain.assignment_requirement) {
    return plain.assignment_requirement;
  }
  if (Boolean(plain.requires_assignment)) {
    return "required";
  }
  if (Boolean(plain.allow_assignment)) {
    return "optional";
  }
  return "none";
}

function stepAllowsAssignment(stepOrRule, level) {
  const req = getStepAssignmentRequirement(stepOrRule, level);
  return req === "required" || req === "optional";
}

function stepRequiresAssignment(stepOrRule, level) {
  const step = level != null && stepOrRule?.steps ? getStepForLevel(stepOrRule, level) : stepOrRule;
  if (step) {
    const plain = toPlainStep ? toPlainStep(step) : step;
    if (plain.assignment_requirement) {
      return plain.assignment_requirement === "required";
    }
    if (plain.requires_assignment !== undefined) {
      return Boolean(plain.requires_assignment);
    }
  }
  const start = getAssignmentStartLevel(stepOrRule);
  return start !== null && level >= start;
}

function stepAssignmentIsOptional(stepOrRule, level) {
  return getStepAssignmentRequirement(stepOrRule, level) === "optional";
}

function getAssignmentStartLevel(rule) {
  if (!rule?.steps?.length) return null;
  const sorted = sortSteps(rule.steps.map(toPlainStep));
  const startStep = sorted.find((s) => {
    const req = s.assignment_requirement || (s.requires_assignment ? "required" : (s.allow_assignment ? "optional" : "none"));
    return req === "required";
  });
  return startStep ? (startStep.step_order || startStep.level) : null;
}

function stepRequiresWeight(rule, level) {
  const step = getStepForLevel(rule, level);
  if (step) {
    return stepRequiresTarget(step);
  }
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
  return rule.steps.find((s) => (s.step_order === level || s.level === level)) || null;
}

function getStepLabel(rule, level) {
  const step = getStepForLevel(rule, level);
  return step?.label || step?.name || `Level ${level}`;
}

function getMaxDepth(rule) {
  if (!rule?.steps?.length) return 4;
  return Math.max(...rule.steps.map((s) => (s.step_order || s.level || 1)));
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
 * Normalize steps: level + label + optional target_requirement/allow_kpi/requires_weight + assignment_requirement.
 */
function normalizeRuleSteps(steps) {
  const sorted = sortSteps(steps);
  if (!sorted.length) {
    throw new Error("At least one hierarchy level is required");
  }

  const hasExplicitTargetConfig = sorted.some(
    (s) => s.target_requirement !== undefined || s.allow_kpi !== undefined
  );
  const firstWeightStep = sorted.find((s) => s.requires_weight);
  const weightStart = firstWeightStep ? (firstWeightStep.step_order || firstWeightStep.level) : null;

  const hasExplicitAssignmentConfig = sorted.some(
    (s) => s.assignment_requirement !== undefined || s.allow_assignment !== undefined
  );
  const firstAssignmentStep = sorted.find((s) => s.requires_assignment || s.assignment_requirement === "required");
  const assignmentStart = firstAssignmentStep ? (firstAssignmentStep.step_order || firstAssignmentStep.level) : null;

  return sorted.map((step, index) => {
    const stepOrder = index + 1;
    let requires_weight = false;
    let allow_kpi = false;

    if (step.target_requirement === "required") {
      requires_weight = true;
      allow_kpi = true;
    } else if (step.target_requirement === "optional") {
      requires_weight = false;
      allow_kpi = true;
    } else if (step.target_requirement === "none") {
      requires_weight = false;
      allow_kpi = false;
    } else if (step.allow_kpi !== undefined) {
      requires_weight = Boolean(step.requires_weight);
      allow_kpi = Boolean(step.allow_kpi);
    } else if (!hasExplicitTargetConfig && weightStart !== null) {
      requires_weight = stepOrder >= weightStart;
      allow_kpi = requires_weight;
    } else {
      requires_weight = Boolean(step.requires_weight);
      allow_kpi = Boolean(step.allow_kpi ?? step.requires_weight);
    }

    let requires_assignment = false;
    let allow_assignment = false;

    if (step.assignment_requirement === "required") {
      requires_assignment = true;
      allow_assignment = true;
    } else if (step.assignment_requirement === "optional") {
      requires_assignment = false;
      allow_assignment = true;
    } else if (step.assignment_requirement === "none") {
      requires_assignment = false;
      allow_assignment = false;
    } else if (step.allow_assignment !== undefined) {
      requires_assignment = Boolean(step.requires_assignment);
      allow_assignment = Boolean(step.allow_assignment);
    } else if (!hasExplicitAssignmentConfig && assignmentStart !== null) {
      requires_assignment = stepOrder >= assignmentStart;
      allow_assignment = requires_assignment;
    } else {
      requires_assignment = Boolean(step.requires_assignment);
      allow_assignment = Boolean(step.allow_assignment ?? step.requires_assignment);
    }

    return {
      step_order: stepOrder,
      label: step.label?.trim() || step.name?.trim() || `Level ${stepOrder}`,
      requires_weight,
      allow_kpi,
      target_requirement: requires_weight ? "required" : (allow_kpi ? "optional" : "none"),
      requires_contribution_weight: Boolean(step.requires_contribution_weight),
      requires_assignment,
      allow_assignment,
      assignment_requirement: requires_assignment ? "required" : (allow_assignment ? "optional" : "none"),
      node_type: step.node_type || levelToNodeType(stepOrder),
      color_hex: normalizeStepColorHex(step.color_hex, stepOrder),
    };
  });
}

function enrichRuleSteps(steps) {
  const sorted = sortSteps((steps || []).map(toPlainStep));
  const weightStart = getWeightStartLevel({ steps: sorted });
  const assignmentStart = getAssignmentStartLevel({ steps: sorted });

  return sorted.map((step) => ({
    ...step,
    requires_weight: stepRequiresWeight({ steps: sorted }, step.step_order || step.level),
    inherits_weight_from_level:
      weightStart !== null && (step.step_order || step.level) > weightStart ? weightStart : null,
    requires_assignment: stepRequiresAssignment({ steps: sorted }, step.step_order || step.level),
    inherits_assignment_from_level:
      assignmentStart !== null && (step.step_order || step.level) > assignmentStart ? assignmentStart : null,
  }));
}

async function resolveNodeWeightMode({ rule, level, parent, weightMode, transaction, PlanNode }) {
  if (!stepAllowsTarget(rule, level)) return { mode: null };

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
  getStepTargetRequirement,
  stepAllowsTarget,
  stepRequiresTarget,
  stepTargetIsOptional,
  getWeightStartLevel,
  stepRequiresWeight,
  stepRequiresContributionWeight,
  getContributionSiblingTarget,
  getStepAssignmentRequirement,
  stepAllowsAssignment,
  stepRequiresAssignment,
  stepAssignmentIsOptional,
  getAssignmentStartLevel,
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
