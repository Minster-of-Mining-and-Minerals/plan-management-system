"use strict";

const { stepRequiresWeight } = require("./planRuleStepUtils");

const OVERRIDE_PARENT_ACHIEVEMENT_PERMISSION = "plan:override_parent_achievement";

function buildChildrenByParent(nodes) {
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const list = childrenByParent.get(node.parent_id) ?? [];
    list.push(node);
    childrenByParent.set(node.parent_id, list);
  }
  return childrenByParent;
}

function getActiveChildren(node, childrenByParent) {
  return (childrenByParent.get(node.plan_node_id) ?? []).filter(
    (child) => child.is_active !== false
  );
}

function isWeightedTargetNode(node, rule) {
  if (rule && !stepRequiresWeight(rule, node.level)) {
    return false;
  }
  return Number(node.period_target) > 0;
}

function isAchievementLeaf(node, childrenByParent) {
  return getActiveChildren(node, childrenByParent).length === 0;
}

function userCanOverrideParentAchievement(user) {
  return Boolean(user?.permissions?.includes(OVERRIDE_PARENT_ACHIEVEMENT_PERMISSION));
}

/**
 * Whether achievement may be typed manually on this node.
 * Default: leaves only. Special case: parent with period_actual_override + permission.
 */
function resolveManualAchievementEntry(node, rule, childrenByParent, options = {}) {
  if (!isWeightedTargetNode(node, rule)) {
    return {
      allowed: false,
      mode: "none",
      reason: "Achievement is only recorded at weighted target levels",
    };
  }

  const isLeaf = isAchievementLeaf(node, childrenByParent);

  if (isLeaf) {
    return { allowed: true, mode: "leaf" };
  }

  if (node.period_actual_override) {
    return { allowed: true, mode: "parent_override" };
  }

  if (options.use_parent_override) {
    if (!userCanOverrideParentAchievement(options.user)) {
      return {
        allowed: false,
        mode: "rollup",
        reason:
          "Parent achievement is normally rolled up from children. Override permission is required.",
      };
    }
    return { allowed: true, mode: "parent_override" };
  }

  return {
    allowed: false,
    mode: "rollup",
    reason:
      "Achievement for this level is calculated from its children. Enter values on leaf targets only.",
  };
}

function nodeByIdMap(nodes) {
  return new Map(nodes.map((node) => [node.plan_node_id, node]));
}

function hasOverrideAncestor(node, nodeById, overrideNodeIds) {
  let parentId = node.parent_id;
  while (parentId) {
    if (overrideNodeIds.has(parentId)) {
      return true;
    }
    const parent = nodeById.get(parentId);
    parentId = parent?.parent_id ?? null;
  }
  return false;
}

/**
 * Nodes that must have period_actual before the period can complete.
 * Excludes descendants under a parent override branch.
 */
function getRequiredAchievementNodes(nodes, rule) {
  if (!nodes.length) {
    return [];
  }

  const childrenByParent = buildChildrenByParent(nodes);
  const nodeById = nodeByIdMap(nodes);
  const overrideNodeIds = new Set(
    nodes.filter((node) => node.period_actual_override).map((node) => node.plan_node_id)
  );

  return nodes.filter((node) => {
    if (!isWeightedTargetNode(node, rule)) {
      return false;
    }
    if (hasOverrideAncestor(node, nodeById, overrideNodeIds)) {
      return false;
    }
    if (node.period_actual_override) {
      return true;
    }
    return isAchievementLeaf(node, childrenByParent);
  });
}

function usesManualAchievementForRollup(node, childrenByParent) {
  if (isAchievementLeaf(node, childrenByParent)) {
    return true;
  }
  return Boolean(node.period_actual_override);
}

module.exports = {
  OVERRIDE_PARENT_ACHIEVEMENT_PERMISSION,
  buildChildrenByParent,
  getActiveChildren,
  isWeightedTargetNode,
  isAchievementLeaf,
  userCanOverrideParentAchievement,
  resolveManualAchievementEntry,
  getRequiredAchievementNodes,
  usesManualAchievementForRollup,
};
