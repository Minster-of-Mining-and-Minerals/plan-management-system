"use strict";

const { PlanNode, PlanVersion, sequelize } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const { resolveVersionExecutionAccess } = require("./planExecutionGateService");
const { buildRollupContextForPeriod } = require("./planAchievementRollupService");
const { isAchievementReadyForPeriodCompletion, resolveRollupRequiresValidationForNode } = require("../utils/planAchievementRollupUtils");
const {
  resolveAchievementStatus,
  ACHIEVEMENT_STATUS,
  hasRecordedAchievementValue,
} = require("../utils/planAchievementWorkflowUtils");
const {
  buildChildrenByParent,
  resolveManualAchievementEntry,
  getRequiredAchievementNodes,
} = require("./planExecutionAchievementUtils");
const {
  buildDraftAlignedSortMeta,
  buildHierarchyNumberMapFromFlatNodes,
  formatReadinessNodeRef,
} = require("../utils/planHierarchyUtils");

async function loadPeriodAchievementContext(periodVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(periodVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return { version: null, rule: null, nodes: [], childrenByParent: new Map() };
  }

  const rule = await resolvePlanRuleForVersion(version, transaction);
  const nodes = await PlanNode.findAll({
    where: { plan_version_id: periodVersionId, is_active: true },
    transaction,
  });

  const plainNodes = nodes.map((node) => (node.toJSON ? node.toJSON() : node));
  const childrenByParent = buildChildrenByParent(plainNodes);

  return { version, rule, nodes: plainNodes, childrenByParent };
}

async function getWeightLevelNodesWithPeriodTarget(periodVersionId, transaction = null) {
  const { version, rule, nodes } = await loadPeriodAchievementContext(
    periodVersionId,
    transaction
  );

  const requiredNodes = getRequiredAchievementNodes(nodes, rule);

  return { version, rule, requiredNodes, nodes };
}

async function computePeriodActualsReadiness(periodVersionId, transaction = null) {
  const { requiredNodes, nodes, version } = await getWeightLevelNodesWithPeriodTarget(
    periodVersionId,
    transaction
  );
  const rollupContext = await buildRollupContextForPeriod(periodVersionId, transaction);
  const sortMeta = version
    ? await buildDraftAlignedSortMeta(version, nodes)
    : new Map();
  const hierarchyNumberMap = buildHierarchyNumberMapFromFlatNodes(nodes, sortMeta);
  const mapReadinessNode = (node) => formatReadinessNodeRef(node, hierarchyNumberMap);

  const missing = [];
  const pendingApproval = [];
  const pendingValidation = [];
  const rejected = [];
  let recordedCount = 0;
  let approvedCount = 0;

  for (const node of requiredNodes) {
    if (hasRecordedAchievementValue(node)) {
      recordedCount += 1;
    }

    if (isAchievementReadyForPeriodCompletion(node, rollupContext)) {
      approvedCount += 1;
      continue;
    }

    const status = resolveAchievementStatus(node);
    if (
      hasRecordedAchievementValue(node) &&
      status === ACHIEVEMENT_STATUS.SUBMITTED
    ) {
      pendingApproval.push(node);
    } else if (
      hasRecordedAchievementValue(node) &&
      status === ACHIEVEMENT_STATUS.APPROVED &&
      resolveRollupRequiresValidationForNode(node, rollupContext)
    ) {
      pendingValidation.push(node);
    } else if (
      hasRecordedAchievementValue(node) &&
      status === ACHIEVEMENT_STATUS.REJECTED
    ) {
      rejected.push(node);
    } else {
      missing.push(node);
    }
  }

  const pendingApprovalNodes = pendingApproval.map(mapReadinessNode);
  const pendingValidationNodes = pendingValidation.map(mapReadinessNode);
  const rejectedNodes = rejected.map(mapReadinessNode);
  const missingNodes = missing.map(mapReadinessNode);

  return {
    required_count: requiredNodes.length,
    recorded_count: recordedCount,
    approved_count: approvedCount,
    pending_approval_count: pendingApproval.length,
    pending_approval_titles: pendingApprovalNodes.map((node) => node.label),
    pending_approval_nodes: pendingApprovalNodes,
    pending_validation_count: pendingValidation.length,
    pending_validation_titles: pendingValidationNodes.map((node) => node.label),
    pending_validation_nodes: pendingValidationNodes,
    rejected_count: rejected.length,
    rejected_titles: rejectedNodes.map((node) => node.label),
    rejected_nodes: rejectedNodes,
    missing_count: missing.length,
    missing_titles: missingNodes.map((node) => node.label),
    missing_nodes: missingNodes,
    ready: requiredNodes.length === 0 || approvedCount === requiredNodes.length,
  };
}

async function computeAnnualPeriodsCompletion(annualVersionId, transaction = null) {
  const periods = await PlanVersion.findAll({
    where: {
      parent_plan_version_id: annualVersionId,
      version_kind: "execution_period",
    },
    order: [["sequence_index", "ASC"]],
    transaction,
  });

  const total = periods.length;
  const completed = periods.filter(
    (period) =>
      period.execution_status === "completed" || period.status === "completed"
  ).length;

  return {
    execution_periods_total: total,
    execution_periods_completed: completed,
    all_execution_periods_completed: total > 0 && completed === total,
  };
}

async function setPeriodActual(planNodeId, periodActual, options = {}) {
  const t = await sequelize.transaction();
  try {
    const node = await PlanNode.findByPk(planNodeId, {
      include: [{ association: "planVersion" }],
      transaction: t,
    });

    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return {
        success: false,
        message: "Period actuals can only be recorded on execution period versions",
      };
    }

    const access = await resolveVersionExecutionAccess(node.plan_version_id, t);
    if (!access.access?.can_edit_actuals) {
      await t.rollback();
      return {
        success: false,
        message: "This execution period is not open for achievement entry",
      };
    }

    const rule = await resolvePlanRuleForVersion(node.planVersion, t);
    const siblings = await PlanNode.findAll({
      where: { plan_version_id: node.plan_version_id, is_active: true },
      transaction: t,
    });
    const plainNodes = siblings.map((row) => (row.toJSON ? row.toJSON() : row));
    const childrenByParent = buildChildrenByParent(plainNodes);
    const nodePlain = node.toJSON ? node.toJSON() : node;

    const entry = resolveManualAchievementEntry(nodePlain, rule, childrenByParent, options);
    if (!entry.allowed) {
      await t.rollback();
      return { success: false, message: entry.reason };
    }

    const periodTarget = Number(node.period_target) || 0;
    if (periodTarget <= 0) {
      await t.rollback();
      return {
        success: false,
        message: "This node has no period target to record achievement against",
      };
    }

    if (periodActual === null || periodActual === undefined || periodActual === "") {
      const updates = { period_actual: null };
      if (options.clear_parent_override) {
        updates.period_actual_override = false;
      } else if (entry.mode === "parent_override" && node.period_actual_override) {
        updates.period_actual_override = false;
      }
      await node.update(updates, { transaction: t });
      await t.commit();
      return { success: true, data: await PlanNode.findByPk(planNodeId) };
    }

    const numericActual = Number(periodActual);
    if (Number.isNaN(numericActual) || numericActual < 0) {
      await t.rollback();
      return { success: false, message: "Achievement must be zero or greater" };
    }

    if (numericActual > periodTarget + 0.001) {
      await t.rollback();
      return {
        success: false,
        message: `Achievement (${numericActual}) cannot exceed the period target (${periodTarget})`,
      };
    }

    const updates = { period_actual: numericActual };
    if (entry.mode === "parent_override" && !node.period_actual_override) {
      updates.period_actual_override = true;
    }

    await node.update(updates, { transaction: t });

    await t.commit();
    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function validatePeriodReadyToComplete(periodVersionId, transaction = null) {
  const readiness = await computePeriodActualsReadiness(periodVersionId, transaction);
  if (!readiness.ready) {
    if (readiness.pending_approval_count > 0) {
      const preview = readiness.pending_approval_titles.slice(0, 3).join(", ");
      const suffix =
        readiness.pending_approval_titles.length > 3
          ? ` and ${readiness.pending_approval_titles.length - 3} more`
          : "";
      return {
        ready: false,
        message: `Approve all pending achievements before completing this period (${preview}${suffix})`,
        readiness,
      };
    }

    if (readiness.pending_validation_count > 0) {
      const preview = readiness.pending_validation_titles.slice(0, 3).join(", ");
      const suffix =
        readiness.pending_validation_titles.length > 3
          ? ` and ${readiness.pending_validation_titles.length - 3} more`
          : "";
      return {
        ready: false,
        message: `Validate all execution-approved achievements before completing this period (${preview}${suffix})`,
        readiness,
      };
    }

    if (readiness.rejected_count > 0) {
      const preview = readiness.rejected_titles.slice(0, 3).join(", ");
      const suffix =
        readiness.rejected_titles.length > 3
          ? ` and ${readiness.rejected_titles.length - 3} more`
          : "";
      return {
        ready: false,
        message: `Resubmit rejected achievements before completing this period (${preview}${suffix})`,
        readiness,
      };
    }

    const preview = readiness.missing_titles.slice(0, 3).join(", ");
    const suffix =
      readiness.missing_titles.length > 3
        ? ` and ${readiness.missing_titles.length - 3} more`
        : "";
    return {
      ready: false,
      message: `Record achievement for all required leaf targets before completing this period (${preview}${suffix})`,
      readiness,
    };
  }
  return { ready: true, readiness };
}

module.exports = {
  setPeriodActual,
  computePeriodActualsReadiness,
  computeAnnualPeriodsCompletion,
  validatePeriodReadyToComplete,
  getWeightLevelNodesWithPeriodTarget,
  loadPeriodAchievementContext,
};
