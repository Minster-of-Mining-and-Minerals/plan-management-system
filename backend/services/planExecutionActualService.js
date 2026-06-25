"use strict";

const { PlanNode, PlanVersion, sequelize } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const { resolveVersionExecutionAccess } = require("./planExecutionGateService");

async function getWeightLevelNodesWithPeriodTarget(periodVersionId, transaction = null) {
  const version = await PlanVersion.findByPk(periodVersionId, { transaction });
  if (!version || version.version_kind !== "execution_period") {
    return { version: null, rule: null, requiredNodes: [] };
  }

  const rule = await resolvePlanRuleForVersion(version, transaction);
  const nodes = await PlanNode.findAll({
    where: { plan_version_id: periodVersionId, is_active: true },
    transaction,
  });

  const requiredNodes = nodes.filter((node) => {
    if (rule && !stepRequiresWeight(rule, node.level)) {
      return false;
    }
    return Number(node.period_target) > 0;
  });

  return { version, rule, requiredNodes };
}

async function computePeriodActualsReadiness(periodVersionId, transaction = null) {
  const { requiredNodes } = await getWeightLevelNodesWithPeriodTarget(
    periodVersionId,
    transaction
  );

  const missing = requiredNodes.filter(
    (node) => node.period_actual === null || node.period_actual === undefined
  );

  return {
    required_count: requiredNodes.length,
    recorded_count: requiredNodes.length - missing.length,
    ready: requiredNodes.length === 0 || missing.length === 0,
    missing_titles: missing.map((node) => node.title),
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

async function setPeriodActual(planNodeId, periodActual) {
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
    if (rule && !stepRequiresWeight(rule, node.level)) {
      await t.rollback();
      return {
        success: false,
        message: "Achievement is only recorded at KPI / weighted levels",
      };
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
      await node.update({ period_actual: null }, { transaction: t });
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

    await node.update({ period_actual: numericActual }, { transaction: t });

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
    const preview = readiness.missing_titles.slice(0, 3).join(", ");
    const suffix =
      readiness.missing_titles.length > 3
        ? ` and ${readiness.missing_titles.length - 3} more`
        : "";
    return {
      ready: false,
      message: `Record achievement for all weighted KPI sections before completing this period (${preview}${suffix})`,
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
};
