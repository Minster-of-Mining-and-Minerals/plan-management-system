"use strict";

const { PlanNode, sequelize } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { resolveVersionExecutionAccess } = require("./planExecutionGateService");
const { validatePeriodTargetAllocation } = require("./planVersionLifecycleService");
const {
  buildChildrenByParent,
  resolveManualAchievementEntry,
} = require("./planExecutionAchievementUtils");
const {
  assertUserCanExecuteAchievementOnMasterNode,
  assertUserCanApproveAchievementForLeaf,
  resolveAchievementScopeForPeriodNode,
} = require("./planAchievementScopeService");
const { resolveApproverUsersForLeafMasterNode, loadSectorValidationUsers, assertUserCanValidateAchievement } = require("./planAchievementUserService");
const { buildRollupContextForPeriod } = require("./planAchievementRollupService");
const { userCanExecuteAchievement } = require("../utils/planAchievementPermissionUtils");
const {
  ACHIEVEMENT_STATUS,
  resolveAchievementStatus,
  canTransitionAchievementStatus,
  canEditAchievementValue,
  buildEmptyAchievementWorkflowFields,
  buildSubmittedAchievementWorkflowFields,
  buildApprovedAchievementWorkflowFields,
  buildValidatedAchievementWorkflowFields,
  buildRejectedAchievementWorkflowFields,
} = require("../utils/planAchievementWorkflowUtils");
const { AUDIT_MODULES, recordSystemAuditLog } = require("./auditLogService");
const {
  emitAchievementSubmittedEvent,
  emitAchievementApprovedEvent,
  emitAchievementRejectedEvent,
  emitAchievementPendingValidationEvent,
  emitAchievementValidatedEvent,
  emitAchievementValidationRejectedEvent,
} = require("./planAchievementNotificationService");

async function loadPeriodNode(planNodeId, transaction) {
  return PlanNode.findByPk(planNodeId, {
    include: [{ association: "planVersion" }],
    transaction,
  });
}

async function assertPeriodOpenForAchievement(planVersionId, transaction) {
  const access = await resolveVersionExecutionAccess(planVersionId, transaction);
  if (!access.access?.can_edit_actuals) {
    return {
      allowed: false,
      message: "This execution period is not open for achievement entry",
    };
  }
  return { allowed: true };
}

async function recordAchievementAudit(
  {
    action,
    node,
    userId,
    ipAddress,
    previousValues,
    newValues,
    summary,
  },
  transaction
) {
  await recordSystemAuditLog(
    {
      module: AUDIT_MODULES.PLANS,
      action,
      entityId: node.plan_node_id,
      entityLabel: node.title,
      summary,
      previousValues,
      newValues,
      changedBy: userId,
      ipAddress,
    },
    transaction
  );
}

async function setPeriodTargetForExecutor(planNodeId, periodTarget, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    if (!userCanExecuteAchievement(user)) {
      await t.rollback();
      return { success: false, message: "Plan execute achievement permission required" };
    }

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return { success: false, message: "Period targets can only be set on execution period versions" };
    }

    const { masterVersionId, masterPlanNodeId } = await resolveAchievementScopeForPeriodNode(
      node,
      t
    );
    if (!masterPlanNodeId || !masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanExecuteAchievementOnMasterNode(
      user,
      masterPlanNodeId,
      masterVersionId,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    if (!node.source_plan_node_id) {
      await t.rollback();
      return { success: false, message: "Node is not linked to an annual plan node" };
    }

    const validation = await validatePeriodTargetAllocation(
      node.source_plan_node_id,
      periodTarget,
      node.plan_node_id,
      t
    );
    if (!validation.valid) {
      await t.rollback();
      return { success: false, message: validation.message };
    }

    const previousValues = {
      period_target: node.period_target,
    };
    const numericTarget = periodTarget === null ? null : Number(periodTarget);

    await node.update({ period_target: numericTarget }, { transaction: t });

    await recordAchievementAudit(
      {
        action: "achievement_target_set",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: { period_target: numericTarget },
        summary: `Period target set on "${node.title}"`,
      },
      t
    );

    await t.commit();
    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function submitAchievement(planNodeId, periodActual, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    if (!userCanExecuteAchievement(user)) {
      await t.rollback();
      return { success: false, message: "Plan execute achievement permission required" };
    }

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return {
        success: false,
        message: "Achievement can only be submitted on execution period versions",
      };
    }

    const { isAnnualAchievementMode } = require("../utils/planAchievementModeUtils");
    if (isAnnualAchievementMode(node)) {
      await t.rollback();
      return {
        success: false,
        message:
          "This KPI uses annual achievement. Enter achievement on the annual year view instead of a period.",
      };
    }

    const periodAccess = await assertPeriodOpenForAchievement(node.plan_version_id, t);
    if (!periodAccess.allowed) {
      await t.rollback();
      return { success: false, message: periodAccess.message };
    }

    const { masterVersionId, masterPlanNodeId } = await resolveAchievementScopeForPeriodNode(
      node,
      t
    );
    if (!masterPlanNodeId || !masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanExecuteAchievementOnMasterNode(
      user,
      masterPlanNodeId,
      masterVersionId,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const rule = await resolvePlanRuleForVersion(node.planVersion, t);
    const siblings = await PlanNode.findAll({
      where: { plan_version_id: node.plan_version_id, is_active: true },
      transaction: t,
    });
    const plainNodes = siblings.map((row) => (row.toJSON ? row.toJSON() : row));
    const childrenByParent = buildChildrenByParent(plainNodes);
    const nodePlain = node.toJSON ? node.toJSON() : node;
    const entry = resolveManualAchievementEntry(nodePlain, rule, childrenByParent, {
      user,
      use_parent_override: false,
    });

    if (!entry.allowed || entry.mode === "rollup") {
      await t.rollback();
      return {
        success: false,
        message:
          entry.reason ||
          "Achievement can only be submitted on assigned leaf nodes with period targets",
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

    const currentStatus = resolveAchievementStatus(node);

    if (!canEditAchievementValue(currentStatus)) {
      await t.rollback();
      return {
        success: false,
        message:
          currentStatus === ACHIEVEMENT_STATUS.SUBMITTED
            ? "Achievement is already pending approval"
            : currentStatus === ACHIEVEMENT_STATUS.APPROVED
              ? "Achievement is pending validation and cannot be edited"
              : currentStatus === ACHIEVEMENT_STATUS.VALIDATED
                ? "Validated achievement cannot be resubmitted"
                : "Achievement cannot be edited in its current state",
      };
    }

    if (periodActual === null || periodActual === undefined || periodActual === "") {
      const previousValues = {
        period_actual: node.period_actual,
        period_actual_status: node.period_actual_status,
      };

      await node.update(
        {
          period_actual: null,
          ...buildEmptyAchievementWorkflowFields(),
        },
        { transaction: t }
      );

      await recordAchievementAudit(
        {
          action: "achievement_cleared",
          node,
          userId: user.user_id,
          ipAddress,
          previousValues,
          newValues: buildEmptyAchievementWorkflowFields(),
          summary: `Achievement cleared on "${node.title}"`,
        },
        t
      );

      await t.commit();
      return { success: true, data: await PlanNode.findByPk(planNodeId) };
    }

    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.SUBMITTED)) {
      await t.rollback();
      return {
        success: false,
        message: "Achievement cannot be submitted from its current state",
      };
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

    const previousValues = {
      period_actual: node.period_actual,
      period_actual_status: node.period_actual_status,
    };

    const rollupContext = await buildRollupContextForPeriod(node.plan_version_id, t);
    const requiresApproval = Boolean(
      masterPlanNodeId &&
        rollupContext.requiresApprovalByMasterNodeId?.get(masterPlanNodeId)
    );

    const workflowFields = requiresApproval
      ? buildSubmittedAchievementWorkflowFields(user.user_id)
      : buildApprovedAchievementWorkflowFields(user.user_id);

    await node.update(
      {
        period_actual: numericActual,
        period_actual_override: false,
        ...workflowFields,
      },
      { transaction: t }
    );

    await recordAchievementAudit(
      {
        action: requiresApproval ? "achievement_submitted" : "achievement_auto_approved",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: {
          period_actual: numericActual,
          ...workflowFields,
        },
        summary: requiresApproval
          ? `Achievement submitted on "${node.title}"`
          : `Achievement auto-approved on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (requiresApproval && masterVersionId) {
        const approvers = await resolveApproverUsersForLeafMasterNode(
          masterVersionId,
          masterPlanNodeId
        );
        await emitAchievementSubmittedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            approvers,
            actor: user,
          },
          options.io ?? null
        );
      } else if (!requiresApproval && rollupContext.hasValidationGate && masterVersionId) {
        const { users: validators } = await loadSectorValidationUsers(masterVersionId);
        await emitAchievementPendingValidationEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            validators,
            actor: user,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Achievement submit notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function approveAchievement(planNodeId, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return { success: false, message: "Achievement approval applies to execution period nodes only" };
    }

    const periodAccess = await assertPeriodOpenForAchievement(node.plan_version_id, t);
    if (!periodAccess.allowed) {
      await t.rollback();
      return { success: false, message: periodAccess.message };
    }

    const currentStatus = resolveAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.APPROVED)) {
      await t.rollback();
      return {
        success: false,
        message: "Only submitted achievements can be approved",
      };
    }

    const { masterVersionId, masterPlanNodeId } = await resolveAchievementScopeForPeriodNode(
      node,
      t
    );
    if (!masterPlanNodeId || !masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanApproveAchievementForLeaf(
      user,
      masterPlanNodeId,
      masterVersionId,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const previousValues = {
      period_actual_status: node.period_actual_status,
      period_actual_approved_by: node.period_actual_approved_by,
    };

    const workflowFields = {
      ...buildApprovedAchievementWorkflowFields(user.user_id),
      period_actual_submitted_at: node.period_actual_submitted_at,
      period_actual_submitted_by: node.period_actual_submitted_by,
    };

    await node.update(workflowFields, { transaction: t });

    await recordAchievementAudit(
      {
        action: "achievement_approved",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Achievement approved on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      const rollupContext = await buildRollupContextForPeriod(node.plan_version_id);
      const requiresValidation = Boolean(
        masterPlanNodeId &&
          rollupContext.requiresValidationByMasterNodeId?.get(masterPlanNodeId)
      );

      if (node.period_actual_submitted_by) {
        await emitAchievementApprovedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.period_actual_submitted_by }],
            actor: user,
            pendingValidation: requiresValidation,
          },
          options.io ?? null
        );
      }

      if (requiresValidation && masterVersionId) {
        const { users: validators } = await loadSectorValidationUsers(masterVersionId);
        await emitAchievementPendingValidationEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            validators,
            actor: user,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Achievement approve notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function validateAchievement(planNodeId, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return {
        success: false,
        message: "Achievement validation applies to execution period nodes only",
      };
    }

    const periodAccess = await assertPeriodOpenForAchievement(node.plan_version_id, t);
    if (!periodAccess.allowed) {
      await t.rollback();
      return { success: false, message: periodAccess.message };
    }

    const currentStatus = resolveAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.VALIDATED)) {
      await t.rollback();
      return {
        success: false,
        message: "Only execution-approved achievements can be validated",
      };
    }

    const { masterVersionId } = await resolveAchievementScopeForPeriodNode(node, t);
    if (!masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanValidateAchievement(user, masterVersionId, t);
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const previousValues = {
      period_actual_status: node.period_actual_status,
      period_actual_validated_by: node.period_actual_validated_by,
    };

    const workflowFields = {
      ...buildValidatedAchievementWorkflowFields(user.user_id),
      period_actual_submitted_at: node.period_actual_submitted_at,
      period_actual_submitted_by: node.period_actual_submitted_by,
      period_actual_approved_at: node.period_actual_approved_at,
      period_actual_approved_by: node.period_actual_approved_by,
    };

    await node.update(workflowFields, { transaction: t });

    await recordAchievementAudit(
      {
        action: "achievement_validated",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Achievement validated on "${node.title}" by ${user.full_name || user.user_id}`,
      },
      t
    );

    await t.commit();

    try {
      const recipients = [];
      if (node.period_actual_submitted_by) {
        recipients.push({ user_id: node.period_actual_submitted_by });
      }
      await emitAchievementValidatedEvent(
        {
          node,
          periodVersionId: node.plan_version_id,
          recipients,
          actor: user,
        },
        options.io ?? null
      );
    } catch (notifyError) {
      console.error("Achievement validate notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectValidationAchievement(planNodeId, comment, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return {
        success: false,
        message: "Validation rejection applies to execution period nodes only",
      };
    }

    const periodAccess = await assertPeriodOpenForAchievement(node.plan_version_id, t);
    if (!periodAccess.allowed) {
      await t.rollback();
      return { success: false, message: periodAccess.message };
    }

    const currentStatus = resolveAchievementStatus(node);
    if (currentStatus !== ACHIEVEMENT_STATUS.APPROVED) {
      await t.rollback();
      return {
        success: false,
        message: "Only execution-approved achievements awaiting validation can be rejected",
      };
    }

    const { masterVersionId } = await resolveAchievementScopeForPeriodNode(node, t);
    if (!masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanValidateAchievement(user, masterVersionId, t);
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const previousValues = {
      period_actual_status: node.period_actual_status,
      period_actual_rejection_comment: node.period_actual_rejection_comment,
    };

    const workflowFields = {
      ...buildRejectedAchievementWorkflowFields(comment),
      period_actual_submitted_at: node.period_actual_submitted_at,
      period_actual_submitted_by: node.period_actual_submitted_by,
    };

    await node.update(workflowFields, { transaction: t });

    await recordAchievementAudit(
      {
        action: "achievement_validation_rejected",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Achievement validation rejected on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (node.period_actual_submitted_by) {
        await emitAchievementValidationRejectedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.period_actual_submitted_by }],
            actor: user,
            comment,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Achievement validation reject notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectAchievement(planNodeId, comment, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;

    const node = await loadPeriodNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion.version_kind !== "execution_period") {
      await t.rollback();
      return { success: false, message: "Achievement rejection applies to execution period nodes only" };
    }

    const periodAccess = await assertPeriodOpenForAchievement(node.plan_version_id, t);
    if (!periodAccess.allowed) {
      await t.rollback();
      return { success: false, message: periodAccess.message };
    }

    const currentStatus = resolveAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.REJECTED)) {
      await t.rollback();
      return { success: false, message: "Only submitted achievements can be rejected" };
    }

    const { masterVersionId, masterPlanNodeId } = await resolveAchievementScopeForPeriodNode(
      node,
      t
    );
    if (!masterPlanNodeId || !masterVersionId) {
      await t.rollback();
      return { success: false, message: "Node is not linked to a master plan assignment" };
    }

    const scope = await assertUserCanApproveAchievementForLeaf(
      user,
      masterPlanNodeId,
      masterVersionId,
      t
    );
    if (!scope.allowed) {
      await t.rollback();
      return { success: false, message: scope.message };
    }

    const previousValues = {
      period_actual_status: node.period_actual_status,
      period_actual_rejection_comment: node.period_actual_rejection_comment,
    };

    const workflowFields = {
      ...buildRejectedAchievementWorkflowFields(comment),
      period_actual_submitted_at: node.period_actual_submitted_at,
      period_actual_submitted_by: node.period_actual_submitted_by,
    };

    await node.update(workflowFields, { transaction: t });

    await recordAchievementAudit(
      {
        action: "achievement_rejected",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Achievement rejected on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (node.period_actual_submitted_by) {
        await emitAchievementRejectedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.period_actual_submitted_by }],
            actor: user,
            comment,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Achievement reject notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  setPeriodTargetForExecutor,
  submitAchievement,
  approveAchievement,
  validateAchievement,
  rejectValidationAchievement,
  rejectAchievement,
};
