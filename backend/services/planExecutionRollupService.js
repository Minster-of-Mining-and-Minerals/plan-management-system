"use strict";

const { PlanNode, PlanVersion } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresContributionWeight } = require("./planRuleStepUtils");
const {
  nodeContributesToRollup,
  childCountsTowardParent,
} = require("../utils/planAchievementRollupUtils");
const { buildRollupContextForPeriod } = require("./planAchievementRollupService");
const { isExecutionSnapshotVersion } = require("./planExecutionSnapshotService");

const EVALUATION_STATUS = {
  COMPLETED: "completed",
  IN_PROGRESS: "in_progress",
  NOT_STARTED: "not_started",
  NO_EVALUATION: "no_evaluation",
};

function roundPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emptyNodeMetrics() {
  return {
    execution_progress_percent: null,
    is_evaluable: false,
    evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
    has_contributing_data: false,
    computed_period_actual: null,
    computed_period_target: null,
  };
}

function getActiveChildren(node, childrenByParent) {
  return (childrenByParent.get(node.plan_node_id) ?? []).filter(
    (child) => child.is_active !== false
  );
}

function hasPeriodTarget(node) {
  return Number(node.period_target) > 0;
}

function hasRecordedActual(node, rollupContext = {}) {
  return nodeContributesToRollup(node, rollupContext);
}

/**
 * Leaf evaluation: target-based achievement with evaluability rules.
 */
function evaluateLeafNode(node, rollupContext = {}) {
  const target = Number(node.period_target) || 0;

  if (target <= 0) {
    return {
      execution_progress_percent: 0,
      is_evaluable: false,
      evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
      has_contributing_data: false,
      computed_period_actual: null,
      computed_period_target: null,
    };
  }

  const hasActual = hasRecordedActual(node, rollupContext);
  const actual = hasActual ? Number(node.period_actual) : 0;
  const percent = hasActual ? roundPercent((actual / target) * 100) : 0;

  let evaluation_status = EVALUATION_STATUS.NOT_STARTED;
  if (hasActual) {
    evaluation_status =
      percent >= 100 ? EVALUATION_STATUS.COMPLETED : EVALUATION_STATUS.IN_PROGRESS;
  }

  return {
    execution_progress_percent: percent,
    is_evaluable: true,
    evaluation_status,
    has_contributing_data: hasActual,
    computed_period_actual: hasActual ? actual : null,
    computed_period_target: target,
  };
}

function deriveParentEvaluationStatus(childMetrics) {
  if (childMetrics.every((child) => child.evaluation_status === EVALUATION_STATUS.COMPLETED)) {
    return EVALUATION_STATUS.COMPLETED;
  }
  if (
    childMetrics.every(
      (child) =>
        child.evaluation_status === EVALUATION_STATUS.NOT_STARTED &&
        !child.has_contributing_data
    )
  ) {
    return EVALUATION_STATUS.NOT_STARTED;
  }
  return EVALUATION_STATUS.IN_PROGRESS;
}

function averageChildPercentages(childMetrics) {
  if (childMetrics.length === 0) return null;
  const total = childMetrics.reduce(
    (sum, child) => sum + (child.execution_progress_percent ?? 0),
    0
  );
  return roundPercent(total / childMetrics.length);
}

function weightedChildPercentages(childMetrics, childNodes) {
  if (childMetrics.length === 0) return null;

  const pairs = childMetrics.map((metrics, index) => ({
    metrics,
    node: childNodes[index],
  }));

  const totalWeight = pairs.reduce(
    (sum, pair) => sum + (Number(pair.node.contribution_weight) || 0),
    0
  );

  if (totalWeight <= 0) {
    return averageChildPercentages(childMetrics);
  }

  const weightedSum = pairs.reduce(
    (sum, pair) =>
      sum +
      (pair.metrics.execution_progress_percent ?? 0) *
        (Number(pair.node.contribution_weight) || 0),
    0
  );

  return roundPercent(weightedSum / totalWeight);
}

function subtreeHasContributingData(node, memo, childrenByParent, rollupContext = {}) {
  if (!childCountsTowardParent(node.plan_node_id, rollupContext)) {
    return false;
  }
  const metrics = memo.get(node.plan_node_id);
  if (metrics?.has_contributing_data) {
    return true;
  }
  return getActiveChildren(node, childrenByParent).some((child) =>
    subtreeHasContributingData(child, memo, childrenByParent, rollupContext)
  );
}

/**
 * Recursive performance rollup — depth-agnostic.
 * Uses weighted child average when the child level requires contribution weight; otherwise equal average.
 * Parent override nodes with a target are evaluated as a single leaf unit.
 * Sector publish boundaries: parents above a gated unpublished seed ignore that child package.
 */
function computeNodeRollup(node, childrenByParent, memo, rollupContext = {}, rule = null) {
  if (memo.has(node.plan_node_id)) {
    return memo.get(node.plan_node_id);
  }

  const children = getActiveChildren(node, childrenByParent).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  let result;

  const treatAsLeaf =
    children.length === 0 ||
    (node.period_actual_override && hasPeriodTarget(node));

  if (treatAsLeaf) {
    if (children.length > 0) {
      for (const child of children) {
        computeNodeRollup(child, childrenByParent, memo, rollupContext, rule);
      }
    }
    result = evaluateLeafNode(node, rollupContext);
  } else {
    for (const child of children) {
      computeNodeRollup(child, childrenByParent, memo, rollupContext, rule);
    }

    const evaluableChildNodes = children.filter((child) => {
      if (!childCountsTowardParent(child.plan_node_id, rollupContext)) {
        return false;
      }
      const metrics = memo.get(child.plan_node_id);
      return metrics?.is_evaluable;
    });
    const evaluableChildren = evaluableChildNodes.map((child) => memo.get(child.plan_node_id));

    if (evaluableChildren.length === 0) {
      result = emptyNodeMetrics();
    } else {
      const useWeighted =
        rule &&
        children.length > 0 &&
        stepRequiresContributionWeight(rule, children[0].level);

      const percent = useWeighted
        ? weightedChildPercentages(evaluableChildren, evaluableChildNodes)
        : averageChildPercentages(evaluableChildren);
      result = {
        execution_progress_percent: percent,
        is_evaluable: true,
        evaluation_status: deriveParentEvaluationStatus(evaluableChildren),
        has_contributing_data: children.some((child) =>
          subtreeHasContributingData(child, memo, childrenByParent, rollupContext)
        ),
        computed_period_actual: null,
        computed_period_target: null,
      };
    }
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

function computeRollupMap(nodes, rollupContext = {}, rule = null) {
  if (!nodes.length) {
    return new Map();
  }

  const childrenByParent = buildChildrenByParent(nodes);
  const memo = new Map();

  const nodeById = new Map(nodes.map((node) => [node.plan_node_id, node]));
  const roots = nodes
    .filter((node) => !node.parent_id || !nodeById.has(node.parent_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const root of roots) {
    computeNodeRollup(root, childrenByParent, memo, rollupContext, rule);
  }

  return memo;
}

function aggregateEvaluableNodeMetrics(nodeMetrics) {
  const evaluable = nodeMetrics.filter((metrics) => metrics?.is_evaluable);
  if (evaluable.length === 0) {
    return {
      execution_progress_percent: null,
      is_evaluable: false,
      evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
      has_contributing_data: false,
      computed_period_actual: null,
      computed_period_target: null,
    };
  }

  const percent = averageChildPercentages(evaluable);
  const hasContributing = evaluable.some((metrics) => metrics.has_contributing_data);

  return {
    execution_progress_percent: percent,
    is_evaluable: true,
    evaluation_status: deriveParentEvaluationStatus(evaluable),
    has_contributing_data: hasContributing,
    computed_period_actual: null,
    computed_period_target: null,
  };
}

function computeVersionProgressFromRoots(nodes, rollupContext = {}, rule = null) {
  const rollupMap = computeRollupMap(nodes, rollupContext, rule);
  const nodeById = new Map(nodes.map((node) => [node.plan_node_id, node]));
  const childrenByParent = buildChildrenByParent(nodes);

  const roots = nodes
    .filter((node) => !node.parent_id || !nodeById.has(node.parent_id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const rootMetrics = roots.map((root) => rollupMap.get(root.plan_node_id));
  const versionMetrics = aggregateEvaluableNodeMetrics(rootMetrics);

  return {
    ...versionMetrics,
    rollup_by_node_id: rollupMap,
    rollup_context: rollupContext,
  };
}

async function computePeriodExecutionProgress(periodVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(periodVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return {
      execution_progress_percent: null,
      is_evaluable: false,
      evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
      has_contributing_data: false,
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

  const plainNodes = nodes.map((node) => (node.toJSON ? node.toJSON() : node));
  const rollupContext = await buildRollupContextForPeriod(periodVersionId, transaction);

  return computeVersionProgressFromRoots(plainNodes, rollupContext, rule);
}

/**
 * Annual achievement = average across evaluable periods only.
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
      is_evaluable: false,
      evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
      has_contributing_data: false,
      execution_period_progress: [],
    };
  }

  const execution_period_progress = [];
  const evaluablePercents = [];
  let anyContributing = false;

  for (const period of periods) {
    const progress = await computePeriodExecutionProgress(period.plan_version_id, transaction);

    if (progress.has_contributing_data) {
      anyContributing = true;
    }
    if (progress.is_evaluable) {
      evaluablePercents.push(progress.execution_progress_percent ?? 0);
    }

    execution_period_progress.push({
      plan_version_id: period.plan_version_id,
      period_label: period.period_label,
      sequence_index: period.sequence_index,
      execution_status: period.execution_status,
      execution_progress_percent: progress.is_evaluable
        ? progress.execution_progress_percent
        : null,
      is_evaluable: progress.is_evaluable,
      evaluation_status: progress.evaluation_status,
      has_contributing_data: progress.has_contributing_data,
    });
  }

  const annualMetrics = aggregateEvaluableNodeMetrics(
    evaluablePercents.map((percent) => ({
      execution_progress_percent: percent,
      is_evaluable: true,
      evaluation_status: EVALUATION_STATUS.IN_PROGRESS,
      has_contributing_data: anyContributing,
    }))
  );

  return {
    execution_progress_percent: annualMetrics.execution_progress_percent,
    is_evaluable: annualMetrics.is_evaluable,
    evaluation_status: annualMetrics.evaluation_status,
    has_contributing_data: anyContributing,
    execution_period_progress,
  };
}

function applyRollupToHierarchyNodes(nodes, rollupMap) {
  for (const node of nodes) {
    const metrics = rollupMap.get(node.plan_node_id);
    if (metrics) {
      node.execution_progress_percent = metrics.execution_progress_percent;
      node.is_evaluable = metrics.is_evaluable;
      node.evaluation_status = metrics.evaluation_status;
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
    is_evaluable: false,
    evaluation_status: EVALUATION_STATUS.NO_EVALUATION,
    has_contributing_data: false,
    execution_annual_progress: [],
    active_planning_year: null,
    active_annual_plan_version_id: null,
  };
}

/**
 * Master achievement = average across evaluable annual years only.
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
  const evaluablePercents = [];
  let anyContributing = false;

  for (const annual of annuals) {
    const progress = await computeAnnualExecutionProgress(annual.plan_version_id, transaction);

    if (progress.has_contributing_data) {
      anyContributing = true;
    }
    if (progress.is_evaluable) {
      evaluablePercents.push(progress.execution_progress_percent ?? 0);
    }

    execution_annual_progress.push({
      plan_version_id: annual.plan_version_id,
      planning_year: annual.planning_year ?? annual.year,
      sequence_index: annual.sequence_index,
      execution_status: annual.execution_status,
      execution_progress_percent: progress.is_evaluable
        ? progress.execution_progress_percent
        : null,
      is_evaluable: progress.is_evaluable,
      evaluation_status: progress.evaluation_status,
      has_contributing_data: progress.has_contributing_data,
    });
  }

  const masterMetrics = aggregateEvaluableNodeMetrics(
    evaluablePercents.map((percent) => ({
      execution_progress_percent: percent,
      is_evaluable: true,
      evaluation_status: EVALUATION_STATUS.IN_PROGRESS,
      has_contributing_data: anyContributing,
    }))
  );

  const openAnnual = annuals.find((annual) => annual.execution_status === "open");

  return {
    execution_progress_percent: masterMetrics.execution_progress_percent,
    is_evaluable: masterMetrics.is_evaluable,
    evaluation_status: masterMetrics.evaluation_status,
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
    is_evaluable,
    evaluation_status,
    has_contributing_data,
  } = await computePeriodExecutionProgress(planVersionId, transaction);

  applyRollupToHierarchyNodes(roots, rollup_by_node_id);

  return {
    roots,
    execution_progress_percent,
    is_evaluable,
    evaluation_status,
    has_contributing_data,
    rollup_by_node_id,
  };
}

module.exports = {
  EVALUATION_STATUS,
  computeRollupMap,
  computeVersionProgressFromRoots,
  computePeriodExecutionProgress,
  computeAnnualExecutionProgress,
  computeMasterExecutionProgress,
  enrichExecutionHierarchyTree,
  applyRollupToHierarchyNodes,
};
