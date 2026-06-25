"use strict";

const { PlanNode, PlanVersion } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const { usesManualAchievementForRollup } = require("./planExecutionAchievementUtils");

function roundPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveWeightMode(node, nodeById) {
  if (node.weight_mode) return node.weight_mode;
  let current = node;
  while (current?.parent_id) {
    current = nodeById.get(current.parent_id);
    if (current?.weight_mode) return current.weight_mode;
  }
  return "number";
}

function averageChildProgress(children, memo) {
  const entries = [];
  for (const child of children) {
    const metrics = memo.get(child.plan_node_id);
    if (metrics?.execution_progress_percent == null) continue;
    const weight = Math.max(Number(child.weight) || 0, 1);
    entries.push({ percent: metrics.execution_progress_percent, weight });
  }
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const weighted = entries.reduce((sum, entry) => sum + entry.percent * entry.weight, 0);
  return roundPercent(weighted / totalWeight);
}

/**
 * Bottom-up rollup for arbitrary hierarchy depth.
 * Leaf weighted nodes use period_actual / period_target.
 * Parents aggregate children using weight_mode (number/frequency sum, percentage weighted avg).
 * Organizational levels above the weight start average child progress.
 */
function computeNodeRollup(node, nodeById, childrenByParent, rule, memo) {
  if (memo.has(node.plan_node_id)) {
    return memo.get(node.plan_node_id);
  }

  const children = (childrenByParent.get(node.plan_node_id) ?? [])
    .filter((child) => child.is_active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let result;

  if (!stepRequiresWeight(rule, node.level)) {
    if (children.length === 0) {
      result = {
        execution_progress_percent: null,
        computed_period_actual: null,
        computed_period_target: null,
      };
    } else {
      for (const child of children) {
        computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
      }
      result = {
        execution_progress_percent: averageChildProgress(children, memo),
        computed_period_actual: null,
        computed_period_target: null,
      };
    }
  } else if (children.length === 0 || usesManualAchievementForRollup(node, childrenByParent)) {
    if (children.length > 0) {
      for (const child of children) {
        computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
      }
    }
    const target = Number(node.period_target) || 0;
    const actual = node.period_actual != null ? Number(node.period_actual) : 0;
    result = {
      execution_progress_percent: target > 0 ? roundPercent((actual / target) * 100) : null,
      computed_period_actual: actual,
      computed_period_target: target,
    };
  } else {
    for (const child of children) {
      computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
    }

    const mode = resolveWeightMode(node, nodeById);
    let totalActual = 0;
    let totalTarget = 0;
    let weightedProgress = 0;
    let progressWeight = 0;

    for (const child of children) {
      const childMetrics = memo.get(child.plan_node_id);
      if (!childMetrics) continue;

      totalActual += Number(childMetrics.computed_period_actual) || 0;
      totalTarget += Number(childMetrics.computed_period_target) || 0;

      if (
        childMetrics.execution_progress_percent != null &&
        Number(childMetrics.computed_period_target) > 0
      ) {
        weightedProgress +=
          childMetrics.execution_progress_percent * Number(childMetrics.computed_period_target);
        progressWeight += Number(childMetrics.computed_period_target);
      }
    }

    let execution_progress_percent = null;
    if (mode === "percentage" && progressWeight > 0) {
      execution_progress_percent = roundPercent(weightedProgress / progressWeight);
    } else if (totalTarget > 0) {
      execution_progress_percent = roundPercent((totalActual / totalTarget) * 100);
    } else {
      execution_progress_percent = averageChildProgress(children, memo);
    }

    result = {
      execution_progress_percent,
      computed_period_actual: totalActual,
      computed_period_target: totalTarget,
    };
  }

  memo.set(node.plan_node_id, result);
  return result;
}

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

function computeRollupMap(nodes, rule) {
  if (!nodes.length) {
    return new Map();
  }

  const nodeById = new Map(nodes.map((node) => [node.plan_node_id, node]));
  const childrenByParent = buildChildrenByParent(nodes);
  const memo = new Map();

  const roots = nodes
    .filter((node) => !node.parent_id || !nodeById.has(node.parent_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const root of roots) {
    computeNodeRollup(root, nodeById, childrenByParent, rule, memo);
  }

  return memo;
}

function computeVersionProgressFromRoots(nodes, rule) {
  const rollupMap = computeRollupMap(nodes, rule);
  const nodeById = new Map(nodes.map((node) => [node.plan_node_id, node]));

  const roots = nodes
    .filter((node) => !node.parent_id || !nodeById.has(node.parent_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const entries = roots
    .map((root) => rollupMap.get(root.plan_node_id))
    .filter((metrics) => metrics?.execution_progress_percent != null);

  if (entries.length === 0) {
    return {
      execution_progress_percent: null,
      computed_period_actual: null,
      computed_period_target: null,
      rollup_by_node_id: rollupMap,
    };
  }

  let totalActual = 0;
  let totalTarget = 0;
  let weightedProgress = 0;
  let progressWeight = 0;

  for (const root of roots) {
    const metrics = rollupMap.get(root.plan_node_id);
    if (!metrics) continue;
    const rootWeight = Math.max(Number(root.weight) || 0, 1);
    if (metrics.execution_progress_percent != null) {
      weightedProgress += metrics.execution_progress_percent * rootWeight;
      progressWeight += rootWeight;
    }
    totalActual += Number(metrics.computed_period_actual) || 0;
    totalTarget += Number(metrics.computed_period_target) || 0;
  }

  return {
    execution_progress_percent:
      progressWeight > 0 ? roundPercent(weightedProgress / progressWeight) : null,
    computed_period_actual: totalActual,
    computed_period_target: totalTarget,
    rollup_by_node_id: rollupMap,
  };
}

async function computePeriodExecutionProgress(periodVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(periodVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return {
      execution_progress_percent: null,
      computed_period_actual: null,
      computed_period_target: null,
      rollup_by_node_id: new Map(),
    };
  }

  const rule = await resolvePlanRuleForVersion(version, transaction);
  const nodes = await PlanNode.findAll({
    where: { plan_version_id: periodVersionId, is_active: true },
    transaction,
  });

  return computeVersionProgressFromRoots(
    nodes.map((node) => (node.toJSON ? node.toJSON() : node)),
    rule
  );
}

async function computeAnnualExecutionProgress(annualVersionId, transaction = null) {
  const periods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: annualVersionId,
      version_kind: "execution_period",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  if (periods.length === 0) {
    return {
      execution_progress_percent: null,
      execution_period_progress: [],
    };
  }

  const execution_period_progress = [];
  let weightedProgress = 0;
  let progressWeight = 0;

  for (const period of periods) {
    const progress = await computePeriodExecutionProgress(period.plan_version_id, transaction);
    execution_period_progress.push({
      plan_version_id: period.plan_version_id,
      period_label: period.period_label,
      sequence_index: period.sequence_index,
      execution_status: period.execution_status,
      execution_progress_percent: progress.execution_progress_percent,
    });

    if (progress.execution_progress_percent != null) {
      const weight =
        period.execution_status === "completed"
          ? 2
          : period.execution_status === "open"
            ? 1.5
            : 1;
      weightedProgress += progress.execution_progress_percent * weight;
      progressWeight += weight;
    }
  }

  return {
    execution_progress_percent:
      progressWeight > 0 ? roundPercent(weightedProgress / progressWeight) : null,
    execution_period_progress,
  };
}

function applyRollupToHierarchyNodes(nodes, rollupMap) {
  for (const node of nodes) {
    const metrics = rollupMap.get(node.plan_node_id);
    if (metrics) {
      node.execution_progress_percent = metrics.execution_progress_percent;
      node.computed_period_actual = metrics.computed_period_actual;
      node.computed_period_target = metrics.computed_period_target;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      applyRollupToHierarchyNodes(node.children, rollupMap);
    }
  }
}

async function enrichExecutionHierarchyTree(planVersionId, roots, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return roots;
  }

  const { rollup_by_node_id, execution_progress_percent } = await computePeriodExecutionProgress(
    planVersionId,
    transaction
  );

  applyRollupToHierarchyNodes(roots, rollup_by_node_id);

  return {
    roots,
    execution_progress_percent,
    rollup_by_node_id,
  };
}

module.exports = {
  computeRollupMap,
  computeVersionProgressFromRoots,
  computePeriodExecutionProgress,
  computeAnnualExecutionProgress,
  enrichExecutionHierarchyTree,
  applyRollupToHierarchyNodes,
};
