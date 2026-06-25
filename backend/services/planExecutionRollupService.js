"use strict";

const { PlanNode, PlanVersion } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const { usesManualAchievementForRollup } = require("./planExecutionAchievementUtils");
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

function averageContributingChildProgress(children, memo) {
  const entries = [];
  for (const child of children) {
    const metrics = memo.get(child.plan_node_id);
    if (!metrics?.has_contributing_data) continue;
    if (metrics.execution_progress_percent == null) continue;
    const weight = Math.max(Number(child.weight) || 0, 1);
    entries.push({ percent: metrics.execution_progress_percent, weight });
  }
  if (entries.length === 0) return null;
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const weighted = entries.reduce((sum, entry) => sum + entry.percent * entry.weight, 0);
  return roundPercent(weighted / totalWeight);
}

function aggregateContributingChildren(children, memo, mode) {
  let totalActual = 0;
  let totalTarget = 0;
  let weightedProgress = 0;
  let progressWeight = 0;
  let hasContributing = false;

  for (const child of children) {
    const childMetrics = memo.get(child.plan_node_id);
    if (!childMetrics?.has_contributing_data) continue;

    hasContributing = true;
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

  if (!hasContributing) {
    return emptyNodeMetrics();
  }

  let execution_progress_percent = null;
  if (mode === "percentage" && progressWeight > 0) {
    execution_progress_percent = roundPercent(weightedProgress / progressWeight);
  } else if (totalTarget > 0) {
    execution_progress_percent = roundPercent((totalActual / totalTarget) * 100);
  } else {
    execution_progress_percent = averageContributingChildProgress(children, memo);
  }

  return {
    execution_progress_percent,
    computed_period_actual: totalActual,
    computed_period_target: totalTarget,
    has_contributing_data: true,
  };
}

/**
 * Bottom-up contributing rollup for arbitrary hierarchy depth.
 * Leaf: actual/target when period_actual is set.
 * Parent weighted: sums actual/target only from children with contributing data
 *   (parent effective target grows as children report achievement).
 * Org levels: weighted average of contributing children's progress.
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
      const percent = averageContributingChildProgress(children, memo);
      result = {
        execution_progress_percent: percent,
        computed_period_actual: null,
        computed_period_target: null,
        has_contributing_data: children.some(
          (child) => memo.get(child.plan_node_id)?.has_contributing_data
        ),
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
    result = aggregateContributingChildren(children, memo, mode);
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

  const contributingRoots = roots.filter(
    (root) => rollupMap.get(root.plan_node_id)?.has_contributing_data
  );

  if (contributingRoots.length === 0) {
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

  for (const root of contributingRoots) {
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
