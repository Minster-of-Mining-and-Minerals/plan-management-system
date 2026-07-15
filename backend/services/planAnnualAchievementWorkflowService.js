"use strict";

const { PlanNode, sequelize } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { resolveVersionExecutionAccess } = require("./planExecutionGateService");
const {
  buildChildrenByParent,
  isAchievementLeaf,
} = require("./planExecutionAchievementUtils");
const { stepRequiresWeight } = require("./planRuleStepUtils");
const {
  assertUserCanExecuteAchievementOnMasterNode,
  assertUserCanApproveAchievementForLeaf,
} = require("./planAchievementScopeService");
const {
  resolveApproverUsersForLeafMasterNode,
  loadSectorValidationUsers,
  assertUserCanValidateAchievement,
} = require("./planAchievementUserService");
const { buildRollupContextForAnnual } = require("./planAchievementRollupService");
const { userCanExecuteAchievement } = require("../utils/planAchievementPermissionUtils");
const { isAnnualAchievementMode } = require("../utils/planAchievementModeUtils");
const {
  ACHIEVEMENT_STATUS,
  resolveAnnualAchievementStatus,
  canTransitionAchievementStatus,
  canEditAchievementValue,
  buildEmptyAnnualAchievementWorkflowFields,
  buildSubmittedAnnualAchievementWorkflowFields,
  buildApprovedAnnualAchievementWorkflowFields,
  buildValidatedAnnualAchievementWorkflowFields,
  buildRejectedAnnualAchievementWorkflowFields,
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
const { resolveMasterVersionId } = require("./planReviewVisibilityService");
const {
  validateAchievementNarration,
  attachAchievementPerformanceFields,
  resolvePerformanceScoringPolicyFromRule,
} = require("../utils/planPerformanceScoringUtils");

async function loadAnnualNode(planNodeId, transaction) {
  return PlanNode.findByPk(planNodeId, {
    include: [{ association: "planVersion" }],
    transaction,
  });
}

async function assertAnnualOpenForAchievement(planVersionId, transaction) {
  const access = await resolveVersionExecutionAccess(planVersionId, transaction);
  if (!access.access?.can_edit_actuals) {
    return {
      allowed: false,
      message: "This annual year is not open for achievement entry",
    };
  }
  return { allowed: true };
}

async function recordAnnualAchievementAudit(
  { action, node, userId, ipAddress, previousValues, newValues, summary },
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

function isAnnualWeightedLeaf(node, rule, childrenByParent) {
  if (rule && !stepRequiresWeight(rule, node.level)) {
    return false;
  }
  if (!isAchievementLeaf(node, childrenByParent)) {
    return false;
  }
  return Number(node.annual_target) > 0;
}

async function submitAnnualAchievement(planNodeId, annualActual, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null, narration = null } = options;

    if (!userCanExecuteAchievement(user)) {
      await t.rollback();
      return { success: false, message: "Plan execute achievement permission required" };
    }

    const node = await loadAnnualNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion?.version_kind !== "annual") {
      await t.rollback();
      return {
        success: false,
        message: "Annual achievement can only be submitted on annual plan nodes",
      };
    }

    if (!isAnnualAchievementMode(node)) {
      await t.rollback();
      return {
        success: false,
        message:
          "This KPI uses period achievement. Enter achievement on an execution period node instead.",
      };
    }

    const yearAccess = await assertAnnualOpenForAchievement(node.plan_version_id, t);
    if (!yearAccess.allowed) {
      await t.rollback();
      return { success: false, message: yearAccess.message };
    }

    const masterPlanNodeId = node.source_plan_node_id;
    const masterVersionId = await resolveMasterVersionId(node.plan_version_id, t);
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

    if (!isAnnualWeightedLeaf(nodePlain, rule, childrenByParent)) {
      await t.rollback();
      return {
        success: false,
        message:
          "Annual achievement can only be submitted on leaf KPIs with an annual target",
      };
    }

    const annualTarget = Number(node.annual_target) || 0;
    if (annualTarget <= 0) {
      await t.rollback();
      return {
        success: false,
        message: "This node has no annual target to record achievement against",
      };
    }

    const currentStatus = resolveAnnualAchievementStatus(node);

    if (!canEditAchievementValue(currentStatus)) {
      await t.rollback();
      return {
        success: false,
        message:
          currentStatus === ACHIEVEMENT_STATUS.SUBMITTED
            ? "Annual achievement is already pending approval"
            : currentStatus === ACHIEVEMENT_STATUS.APPROVED
              ? "Annual achievement is pending validation and cannot be edited"
              : currentStatus === ACHIEVEMENT_STATUS.VALIDATED
                ? "Validated annual achievement cannot be resubmitted"
                : "Annual achievement cannot be edited in its current state",
      };
    }

    if (annualActual === null || annualActual === undefined || annualActual === "") {
      const previousValues = {
        annual_actual: node.annual_actual,
        annual_actual_status: node.annual_actual_status,
        annual_actual_narration: node.annual_actual_narration,
      };

      await node.update(
        {
          annual_actual: null,
          annual_actual_narration: null,
          ...buildEmptyAnnualAchievementWorkflowFields(),
        },
        { transaction: t }
      );

      await recordAnnualAchievementAudit(
        {
          action: "annual_achievement_cleared",
          node,
          userId: user.user_id,
          ipAddress,
          previousValues,
          newValues: {
            annual_actual: null,
            annual_actual_narration: null,
            ...buildEmptyAnnualAchievementWorkflowFields(),
          },
          summary: `Annual achievement cleared on "${node.title}"`,
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
        message: "Annual achievement cannot be submitted from its current state",
      };
    }

    const numericActual = Number(annualActual);
    if (Number.isNaN(numericActual) || numericActual < 0) {
      await t.rollback();
      return { success: false, message: "Achievement must be zero or greater" };
    }

    const narrationCheck = validateAchievementNarration(
      annualTarget,
      numericActual,
      narration
    );
    if (!narrationCheck.valid) {
      await t.rollback();
      return { success: false, message: narrationCheck.message };
    }

    const previousValues = {
      annual_actual: node.annual_actual,
      annual_actual_status: node.annual_actual_status,
      annual_actual_narration: node.annual_actual_narration,
    };

    const rollupContext = await buildRollupContextForAnnual(node.plan_version_id, t);
    const requiresApproval = Boolean(
      masterPlanNodeId &&
        rollupContext.requiresApprovalByMasterNodeId?.get(masterPlanNodeId)
    );

    const workflowFields = requiresApproval
      ? buildSubmittedAnnualAchievementWorkflowFields(user.user_id)
      : buildApprovedAnnualAchievementWorkflowFields(user.user_id);

    await node.update(
      {
        annual_actual: numericActual,
        annual_actual_narration: narrationCheck.narration,
        ...workflowFields,
      },
      { transaction: t }
    );

    await recordAnnualAchievementAudit(
      {
        action: requiresApproval
          ? "annual_achievement_submitted"
          : "annual_achievement_auto_approved",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: {
          annual_actual: numericActual,
          annual_actual_narration: narrationCheck.narration,
          ...workflowFields,
        },
        summary: requiresApproval
          ? `Annual achievement submitted on "${node.title}"`
          : `Annual achievement auto-approved on "${node.title}"`,
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
      console.error("Annual achievement submit notification failed:", notifyError);
    }

    const saved = await PlanNode.findByPk(planNodeId, {
      include: [{ association: "planVersion" }],
    });
    const rule = saved?.planVersion
      ? await resolvePlanRuleForVersion(saved.planVersion)
      : null;
    const plain = saved?.toJSON ? saved.toJSON() : saved;
    return {
      success: true,
      data: attachAchievementPerformanceFields(plain, {
        target: annualTarget,
        actual: numericActual,
        policy: resolvePerformanceScoringPolicyFromRule(rule),
        narration: narrationCheck.narration,
        useAnnual: true,
      }),
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function approveAnnualAchievement(planNodeId, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;
    const node = await loadAnnualNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion?.version_kind !== "annual" || !isAnnualAchievementMode(node)) {
      await t.rollback();
      return { success: false, message: "Not an annual-achievement KPI node" };
    }

    const yearAccess = await assertAnnualOpenForAchievement(node.plan_version_id, t);
    if (!yearAccess.allowed) {
      await t.rollback();
      return { success: false, message: yearAccess.message };
    }

    const masterPlanNodeId = node.source_plan_node_id;
    const masterVersionId = await resolveMasterVersionId(node.plan_version_id, t);
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

    const currentStatus = resolveAnnualAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.APPROVED)) {
      await t.rollback();
      return {
        success: false,
        message: "Only submitted annual achievements can be approved",
      };
    }

    const previousValues = {
      annual_actual_status: node.annual_actual_status,
      annual_actual_approved_by: node.annual_actual_approved_by,
    };
    const workflowFields = buildApprovedAnnualAchievementWorkflowFields(user.user_id);

    await node.update(workflowFields, { transaction: t });

    await recordAnnualAchievementAudit(
      {
        action: "annual_achievement_approved",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Annual achievement approved on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      const rollupContext = await buildRollupContextForAnnual(node.plan_version_id);
      if (node.annual_actual_submitted_by) {
        await emitAchievementApprovedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.annual_actual_submitted_by }],
            actor: user,
          },
          options.io ?? null
        );
      }
      if (rollupContext.hasValidationGate && masterVersionId) {
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
      console.error("Annual achievement approve notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function validateAnnualAchievement(planNodeId, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;
    const node = await loadAnnualNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion?.version_kind !== "annual" || !isAnnualAchievementMode(node)) {
      await t.rollback();
      return { success: false, message: "Not an annual-achievement KPI node" };
    }

    const yearAccess = await assertAnnualOpenForAchievement(node.plan_version_id, t);
    if (!yearAccess.allowed) {
      await t.rollback();
      return { success: false, message: yearAccess.message };
    }

    const masterVersionId = await resolveMasterVersionId(node.plan_version_id, t);
    const gate = await assertUserCanValidateAchievement(user, masterVersionId, t);
    if (!gate.allowed) {
      await t.rollback();
      return { success: false, message: gate.message };
    }

    const currentStatus = resolveAnnualAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.VALIDATED)) {
      await t.rollback();
      return {
        success: false,
        message: "Only approved annual achievements can be validated",
      };
    }

    const previousValues = {
      annual_actual_status: node.annual_actual_status,
      annual_actual_validated_by: node.annual_actual_validated_by,
    };
    const workflowFields = buildValidatedAnnualAchievementWorkflowFields(user.user_id);

    await node.update(workflowFields, { transaction: t });

    await recordAnnualAchievementAudit(
      {
        action: "annual_achievement_validated",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Annual achievement validated on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (node.annual_actual_submitted_by) {
        await emitAchievementValidatedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.annual_actual_submitted_by }],
            actor: user,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Annual achievement validate notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectAnnualAchievement(planNodeId, comment, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;
    const node = await loadAnnualNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion?.version_kind !== "annual" || !isAnnualAchievementMode(node)) {
      await t.rollback();
      return { success: false, message: "Not an annual-achievement KPI node" };
    }

    const yearAccess = await assertAnnualOpenForAchievement(node.plan_version_id, t);
    if (!yearAccess.allowed) {
      await t.rollback();
      return { success: false, message: yearAccess.message };
    }

    const masterPlanNodeId = node.source_plan_node_id;
    const masterVersionId = await resolveMasterVersionId(node.plan_version_id, t);
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

    const currentStatus = resolveAnnualAchievementStatus(node);
    if (!canTransitionAchievementStatus(currentStatus, ACHIEVEMENT_STATUS.REJECTED)) {
      await t.rollback();
      return {
        success: false,
        message: "Only submitted annual achievements can be rejected",
      };
    }

    const previousValues = {
      annual_actual_status: node.annual_actual_status,
    };
    const workflowFields = buildRejectedAnnualAchievementWorkflowFields(comment);

    await node.update(workflowFields, { transaction: t });

    await recordAnnualAchievementAudit(
      {
        action: "annual_achievement_rejected",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Annual achievement rejected on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (node.annual_actual_submitted_by) {
        await emitAchievementRejectedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.annual_actual_submitted_by }],
            actor: user,
            comment,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Annual achievement reject notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function rejectValidationAnnualAchievement(planNodeId, comment, options = {}) {
  const t = await sequelize.transaction();
  try {
    const { user, ipAddress = null } = options;
    const node = await loadAnnualNode(planNodeId, t);
    if (!node) {
      await t.rollback();
      return { success: false, message: "Plan node not found" };
    }

    if (node.planVersion?.version_kind !== "annual" || !isAnnualAchievementMode(node)) {
      await t.rollback();
      return { success: false, message: "Not an annual-achievement KPI node" };
    }

    const yearAccess = await assertAnnualOpenForAchievement(node.plan_version_id, t);
    if (!yearAccess.allowed) {
      await t.rollback();
      return { success: false, message: yearAccess.message };
    }

    const masterVersionId = await resolveMasterVersionId(node.plan_version_id, t);
    const gate = await assertUserCanValidateAchievement(user, masterVersionId, t);
    if (!gate.allowed) {
      await t.rollback();
      return { success: false, message: gate.message };
    }

    const currentStatus = resolveAnnualAchievementStatus(node);
    if (currentStatus !== ACHIEVEMENT_STATUS.APPROVED) {
      await t.rollback();
      return {
        success: false,
        message: "Only approved annual achievements awaiting validation can be rejected",
      };
    }

    const previousValues = {
      annual_actual_status: node.annual_actual_status,
    };
    const workflowFields = buildRejectedAnnualAchievementWorkflowFields(comment);

    await node.update(workflowFields, { transaction: t });

    await recordAnnualAchievementAudit(
      {
        action: "annual_achievement_validation_rejected",
        node,
        userId: user.user_id,
        ipAddress,
        previousValues,
        newValues: workflowFields,
        summary: `Annual achievement validation rejected on "${node.title}"`,
      },
      t
    );

    await t.commit();

    try {
      if (node.annual_actual_submitted_by) {
        await emitAchievementValidationRejectedEvent(
          {
            node,
            periodVersionId: node.plan_version_id,
            recipients: [{ user_id: node.annual_actual_submitted_by }],
            actor: user,
            comment,
          },
          options.io ?? null
        );
      }
    } catch (notifyError) {
      console.error("Annual achievement validation reject notification failed:", notifyError);
    }

    return { success: true, data: await PlanNode.findByPk(planNodeId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  submitAnnualAchievement,
  approveAnnualAchievement,
  validateAnnualAchievement,
  rejectAnnualAchievement,
  rejectValidationAnnualAchievement,
};
