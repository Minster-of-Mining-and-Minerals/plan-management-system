"use strict";

const { PlanRule, PlanRuleStep, PlanVersion, PlanNode, GovernmentStructure } = require("../models");
const { collectAncestorIds } = require("../utils/structureLifecycleUtils");
const {
  levelToNodeType,
  getStepForLevel,
  getStepLabel,
  getMaxDepth,
  getWeightTarget,
  getWeightUnitLabel,
  stepRequiresWeight,
  isWeightModeSelectionLevel,
  resolveNodeWeightMode,
} = require("./planRuleStepUtils");

async function loadStructureIndex(transaction) {
  return GovernmentStructure.findAll({
    attributes: ["government_structure_id", "parent_id"],
    transaction,
  });
}

async function findInheritedPlanRule(structureId, structureIndex, transaction) {
  const ancestorIds = collectAncestorIds(structureId, structureIndex);

  for (const ancestorId of ancestorIds) {
    const rule = await PlanRule.findOne({
      where: {
        government_structure_id: ancestorId,
        inherit_to_descendants: true,
        is_active: true,
      },
      include: [
        {
          model: PlanRuleStep,
          as: "steps",
          separate: true,
          order: [["step_order", "ASC"]],
        },
      ],
      order: [["created_at", "DESC"]],
      transaction,
    });

    if (rule) {
      return rule;
    }
  }

  return null;
}

async function resolvePlanRuleForVersion(planVersion, transaction) {
  const include = [
    {
      model: PlanRuleStep,
      as: "steps",
      separate: true,
      order: [["step_order", "ASC"]],
    },
  ];

  let rule = null;

  if (planVersion.plan_rule_id) {
    rule = await PlanRule.findByPk(planVersion.plan_rule_id, {
      include,
      transaction,
    });
  }

  if (!rule && planVersion.government_structure_id) {
    rule = await PlanRule.findOne({
      where: {
        government_structure_id: planVersion.government_structure_id,
        inherit_to_descendants: false,
        is_active: true,
      },
      include,
      order: [["created_at", "DESC"]],
      transaction,
    });
  }

  if (!rule && planVersion.government_structure_id) {
    const structureIndex = await loadStructureIndex(transaction);
    rule = await findInheritedPlanRule(
      planVersion.government_structure_id,
      structureIndex,
      transaction
    );
  }

  if (!rule) {
    rule = await PlanRule.findOne({
      where: {
        government_structure_id: null,
        is_active: true,
      },
      include,
      order: [["created_at", "DESC"]],
      transaction,
    });
  }

  return rule;
}

async function validatePlanNodeAgainstRule({
  planVersionId,
  parentId,
  type,
  weight,
  weightMode,
  level,
  excludeNodeId,
  transaction,
}) {
  const planVersion = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!planVersion) {
    return { valid: false, message: "Plan version not found" };
  }

  const rule = await resolvePlanRuleForVersion(planVersion, transaction);
  if (!rule) {
    return { valid: true, rule: null };
  }

  const maxDepth = getMaxDepth(rule);

  let parent = null;
  if (parentId) {
    parent = await PlanNode.findOne({
      where: { plan_node_id: parentId, plan_version_id: planVersionId },
      transaction,
    });
    if (!parent) {
      return { valid: false, message: "Parent node not found in this version" };
    }
  }

  const resolvedLevel = level || (parent ? parent.level + 1 : 1);

  if (resolvedLevel > maxDepth) {
    return {
      valid: false,
      message: `Maximum plan depth is ${maxDepth} levels per the "${rule.name}" rule`,
    };
  }

  const step = getStepForLevel(rule, resolvedLevel);
  if (!step) {
    return {
      valid: false,
      message: `No rule step defined for level ${resolvedLevel}`,
    };
  }

  const expectedType = levelToNodeType(resolvedLevel);
  const numericWeight = Number(weight) || 0;
  const requiresWeight = stepRequiresWeight(rule, resolvedLevel);
  const stepLabel = getStepLabel(rule, resolvedLevel);

  const modeResult = await resolveNodeWeightMode({
    rule,
    level: resolvedLevel,
    parent,
    weightMode,
    transaction,
    PlanNode,
  });

  if (modeResult.error) {
    return { valid: false, message: modeResult.error };
  }

  const effectiveWeightMode = modeResult.mode;

  if (requiresWeight && numericWeight <= 0) {
    return {
      valid: false,
      message: `${stepLabel} requires a weight${effectiveWeightMode ? ` (${effectiveWeightMode})` : ""}`,
    };
  }

  if (!requiresWeight && numericWeight > 0) {
    return {
      valid: false,
      message: `${stepLabel} does not use weight at this level`,
    };
  }

  const weightTarget = getWeightTarget(parent, effectiveWeightMode);
  if (requiresWeight && weightTarget !== null) {
    const siblings = await PlanNode.findAll({
      where: {
        plan_version_id: planVersionId,
        parent_id: parentId || null,
        is_active: true,
      },
      transaction,
    });

    const otherSum = siblings
      .filter((s) => s.plan_node_id !== excludeNodeId)
      .reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

    const total = otherSum + numericWeight;

    if (total > weightTarget + 0.001) {
      const unit = getWeightUnitLabel(effectiveWeightMode);
      return {
        valid: false,
        message: `Combined sibling weight (${total}${unit}) exceeds allowed ${weightTarget}${unit}. Children must share the parent's weight.`,
      };
    }
  }

  return {
    valid: true,
    rule,
    step,
    resolvedLevel,
    weightMode: effectiveWeightMode,
    weightUnit: getWeightUnitLabel(effectiveWeightMode),
    nodeType: expectedType,
    stepLabel,
    isWeightModeSelectionLevel: isWeightModeSelectionLevel(rule, resolvedLevel),
  };
}

module.exports = {
  resolvePlanRuleForVersion,
  getStepForLevel,
  getStepLabel,
  getMaxDepth,
  getWeightTarget,
  getWeightUnitLabel,
  stepRequiresWeight,
  isWeightModeSelectionLevel,
  levelToNodeType,
  validatePlanNodeAgainstRule,
};
