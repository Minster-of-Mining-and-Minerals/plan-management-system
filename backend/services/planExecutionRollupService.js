"use strict";

const { PlanNode, PlanVersion } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const {
  usesManualAchievementForRollup,
  isWeightedTargetNode,
} = require("./planExecutionAchievementUtils");
const { isExecutionSnapshotVersion } = require("./planExecutionSnapshotService");

function roundPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emptyNodeMetrics() {
  return {
    execution_progress_percent: null,
    computed_period_actual: null,
    computed_period_target: null,
    has_contributing_data: false,
  };
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

function getActiveChildren(node, childrenByParent) {
  return (childrenByParent.get(node.plan_node_id) ?? []).filter(
    (child) => child.is_active !== false
  );
}

/**
 * Whether this node or any descendant carries a weighted period target
 * (mirrors target-distribution scope: all planned siblings participate).
 */
function hasTargetBearingSubtree(node, childrenByParent, rule) {
  if (node.is_active === false) {
    return false;
  }
  if (usesManualAchievementForRollup(node, childrenByParent) && isWeightedTargetNode(node, rule)) {
    return true;
  }
  return getActiveChildren(node, childrenByParent).some((child) =>
    hasTargetBearingSubtree(child, childrenByParent, rule)
  );
}

function subtreeHasContributingData(node, memo, childrenByParent) {
  const metrics = memo.get(node.plan_node_id);
  if (metrics?.has_contributing_data) {
    return true;
  }
  return getActiveChildren(node, childrenByParent).some((child) =>
    subtreeHasContributingData(child, memo, childrenByParent)
  );
}

function getChildProgressForRollup(child, memo, childrenByParent, rule) {
  if (!hasTargetBearingSubtree(child, childrenByParent, rule)) {
    return null;
  }
  const metrics = memo.get(child.plan_node_id);
  if (metrics?.has_contributing_data && metrics.execution_progress_percent != null) {
    return metrics.execution_progress_percent;
  }
  return 0;
}

function averageEligibleChildProgress(children, memo, childrenByParent, rule) {
  const entries = [];
  for (const child of children) {
    const percent = getChildProgressForRollup(child, memo, childrenByParent, rule);
    if (percent === null) continue;
    const weight = Math.max(Number(child.weight) || 0, 1);
    entries.push({ percent, weight });
  }
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const weighted = entries.reduce((sum, entry) => sum + entry.percent * entry.weight, 0);
  return roundPercent(weighted / totalWeight);
}

function getChildActualTargetForRollup(child, memo, childrenByParent, rule) {
  if (!hasTargetBearingSubtree(child, childrenByParent, rule)) {
    return null;
  }

  if (usesManualAchievementForRollup(child, childrenByParent)) {
    const target = Number(child.period_target) || 0;
    if (target <= 0) {
      return null;
    }
    const hasActual = child.period_actual != null && child.period_actual !== undefined;
    const actual = hasActual ? Number(child.period_actual) : 0;
    return {
      actual,
      target,
      percent: hasActual ? roundPercent((actual / target) * 100) : 0,
    };
  }

  const metrics = memo.get(child.plan_node_id);
  return {
    actual: Number(metrics?.computed_period_actual) || 0,
    target: Number(metrics?.computed_period_target) || 0,
    percent: metrics?.execution_progress_percent ?? 0,
  };
}

function aggregateEligibleChildren(children, memo, mode, childrenByParent, rule) {
  let totalActual = 0;
  let totalTarget = 0;
  let weightedProgress = 0;
  let progressWeight = 0;
  let hasEligible = false;

  for (const child of children) {
    const contribution = getChildActualTargetForRollup(child, memo, childrenByParent, rule);
    if (!contribution) continue;

    hasEligible = true;
    totalActual += contribution.actual;
    totalTarget += contribution.target;

    if (contribution.target > 0) {
      weightedProgress += contribution.percent * contribution.target;
      progressWeight += contribution.target;
    }
  }

  if (!hasEligible) {
    return emptyNodeMetrics();
  }

  let execution_progress_percent = null;
  if (mode === "percentage" && progressWeight > 0) {
    execution_progress_percent = roundPercent(weightedProgress / progressWeight);
  } else if (totalTarget > 0) {
    execution_progress_percent = roundPercent((totalActual / totalTarget) * 100);
  } else {
    execution_progress_percent = averageEligibleChildProgress(children, memo, childrenByParent, rule);
  }

  return {
    execution_progress_percent,
    computed_period_actual: totalActual,
    computed_period_target: totalTarget,
    has_contributing_data: children.some((child) =>
      subtreeHasContributingData(child, memo, childrenByParent)
    ),
  };
}

/**
 * Bottom-up rollup aligned with target distribution scope.
 * Leaf: actual/target when period_actual is set; eligible leaves without actual count as 0.
 * Parent weighted: sums actual/target across ALL eligible children (full planned set).
 * Org levels: sum actual/target across ALL eligible children (same as weighted parents).
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
      result = emptyNodeMetrics();
    } else {
      for (const child of children) {
        computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
      }
      const mode = resolveWeightMode(node, nodeById);
      const aggregated = aggregateEligibleChildren(
        children,
        memo,
        mode,
        childrenByParent,
        rule
      );
      result = {
        execution_progress_percent: aggregated.execution_progress_percent,
        computed_period_actual: aggregated.computed_period_actual,
        computed_period_target: aggregated.computed_period_target,
        has_contributing_data: aggregated.has_contributing_data,
      };
    }
  } else if (children.length === 0 || usesManualAchievementForRollup(node, childrenByParent)) {
    if (children.length > 0) {
      for (const child of children) {
        computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
      }
    }

    const target = Number(node.period_target) || 0;
    const hasActual = node.period_actual != null && node.period_actual !== undefined;

    if (hasActual && target > 0) {
      const actual = Number(node.period_actual);
      result = {
        execution_progress_percent: roundPercent((actual / target) * 100),
        computed_period_actual: actual,
        computed_period_target: target,
        has_contributing_data: true,
      };
    } else {
      result = emptyNodeMetrics();
    }
  } else {
    for (const child of children) {
      computeNodeRollup(child, nodeById, childrenByParent, rule, memo);
    }

    const mode = resolveWeightMode(node, nodeById);
    result = aggregateEligibleChildren(children, memo, mode, childrenByParent, rule);
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
  const childrenByParent = buildChildrenByParent(nodes);

  const roots = nodes
    .filter((node) => !node.parent_id || !nodeById.has(node.parent_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const eligibleRoots = roots.filter((root) =>
    hasTargetBearingSubtree(root, childrenByParent, rule)
  );

  const hasContributing = roots.some((root) =>
    subtreeHasContributingData(root, rollupMap, childrenByParent)
  );

  if (eligibleRoots.length === 0 || !hasContributing) {
    return {
      execution_progress_percent: null,
      computed_period_actual: null,
      computed_period_target: null,
      has_contributing_data: false,
      rollup_by_node_id: rollupMap,
    };
  }

  let totalActual = 0;
  let totalTarget = 0;
  let weightedProgress = 0;
  let progressWeight = 0;

  for (const root of eligibleRoots) {
    const metrics = rollupMap.get(root.plan_node_id);
    if (!metrics) continue;
    const rootWeight = Math.max(Number(root.weight) || 0, 1);
    const rootPercent = metrics.execution_progress_percent ?? 0;
    weightedProgress += rootPercent * rootWeight;
    progressWeight += rootWeight;
    totalActual += Number(metrics.computed_period_actual) || 0;
    totalTarget += Number(metrics.computed_period_target) || 0;
  }

  let execution_progress_percent = null;
  if (totalTarget > 0) {
    execution_progress_percent = roundPercent((totalActual / totalTarget) * 100);
  } else if (progressWeight > 0) {
    execution_progress_percent = roundPercent(weightedProgress / progressWeight);
  }

  return {
    execution_progress_percent,
    computed_period_actual: totalTarget > 0 ? totalActual : null,
    computed_period_target: totalTarget > 0 ? totalTarget : null,
    has_contributing_data: true,
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
      has_contributing_data: false,
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

/**
 * Annual achievement = average across ALL periods in the year (open, locked, completed).
 * Periods without leaf data count as 0% in the annual blend.
 */
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
      has_contributing_data: false,
      execution_period_progress: [],
    };
  }

  const execution_period_progress = [];
  let totalPercent = 0;
  let anyContributing = false;

  for (const period of periods) {
    const progress = await computePeriodExecutionProgress(period.plan_version_id, transaction);
    const periodPercent = progress.has_contributing_data
      ? progress.execution_progress_percent ?? 0
      : 0;

    if (progress.has_contributing_data) {
      anyContributing = true;
    }

    totalPercent += periodPercent;
    execution_period_progress.push({
      plan_version_id: period.plan_version_id,
      period_label: period.period_label,
      sequence_index: period.sequence_index,
      execution_status: period.execution_status,
      execution_progress_percent: progress.has_contributing_data
        ? progress.execution_progress_percent
        : null,
      has_contributing_data: progress.has_contributing_data,
    });
  }

  return {
    execution_progress_percent: anyContributing
      ? roundPercent(totalPercent / periods.length)
      : null,
    has_contributing_data: anyContributing,
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
      node.has_contributing_data = metrics.has_contributing_data;
    }
    if (Array.isArray(node.children) && node.children.length > 0) {
      applyRollupToHierarchyNodes(node.children, rollupMap);
    }
  }
}

function emptyMasterProgress() {
  return {
    execution_progress_percent: null,
    has_contributing_data: false,
    execution_annual_progress: [],
    active_planning_year: null,
    active_annual_plan_version_id: null,
  };
}

/**
 * Master achievement = average across ALL annual years in the execution snapshot
 * (open, locked, completed). Years without leaf data count as 0% in the blend.
 */
async function computeMasterExecutionProgress(masterVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(masterVersionId, { transaction });
  if (!version || version.version_kind !== "master") {
    return emptyMasterProgress();
  }

  const snapshotRootId = isExecutionSnapshotVersion(version)
    ? version.plan_version_id
    : version.active_execution_snapshot_id;

  if (!snapshotRootId) {
    if (!version.process_started_at) {
      return emptyMasterProgress();
    }
    return emptyMasterProgress();
  }

  const annuals = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: snapshotRootId,
      version_kind: "annual",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  if (annuals.length === 0) {
    return emptyMasterProgress();
  }

  const execution_annual_progress = [];
  let totalPercent = 0;
  let anyContributing = false;

  for (const annual of annuals) {
    const progress = await computeAnnualExecutionProgress(annual.plan_version_id, transaction);
    const annualPercent = progress.has_contributing_data
      ? progress.execution_progress_percent ?? 0
      : 0;

    if (progress.has_contributing_data) {
      anyContributing = true;
    }

    totalPercent += annualPercent;
    execution_annual_progress.push({
      plan_version_id: annual.plan_version_id,
      planning_year: annual.planning_year ?? annual.year,
      sequence_index: annual.sequence_index,
      execution_status: annual.execution_status,
      execution_progress_percent: progress.has_contributing_data
        ? progress.execution_progress_percent
        : null,
      has_contributing_data: progress.has_contributing_data,
    });
  }

  const openAnnual = annuals.find((annual) => annual.execution_status === "open");

  return {
    execution_progress_percent: anyContributing
      ? roundPercent(totalPercent / annuals.length)
      : null,
    has_contributing_data: anyContributing,
    execution_annual_progress,
    active_planning_year: openAnnual ? openAnnual.planning_year ?? openAnnual.year : null,
    active_annual_plan_version_id: openAnnual?.plan_version_id ?? null,
  };
}

async function enrichExecutionHierarchyTree(planVersionId, roots, transaction = null) {
  const version = await PlanVersion.findByPk(planVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return roots;
  }

  const {
    rollup_by_node_id,
    execution_progress_percent,
    has_contributing_data,
  } = await computePeriodExecutionProgress(planVersionId, transaction);

  applyRollupToHierarchyNodes(roots, rollup_by_node_id);

  return {
    roots,
    execution_progress_percent,
    has_contributing_data,
    rollup_by_node_id,
  };
}

module.exports = {
  computeRollupMap,
  computeVersionProgressFromRoots,
  computePeriodExecutionProgress,
  computeAnnualExecutionProgress,
  computeMasterExecutionProgress,
  enrichExecutionHierarchyTree,
  applyRollupToHierarchyNodes,
};
