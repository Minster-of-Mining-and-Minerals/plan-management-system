"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  PlanVersion,
  PlanNode,
  Issue,
  InternalAssignment,
  User,
  sequelize,
} = require("../models");
const { validatePlanTargetPipelineReadiness } = require("./planVersionLifecycleService");
const {
  getAssignedMasterNodeIds,
  resolveMasterVersionId,
} = require("./planReviewVisibilityService");
const { recordSystemAuditLog, getClientIp } = require("./auditLogService");
const { emitPlanReviewEvent, PLAN_REVIEW_EVENTS } = require("./planReviewNotificationService");
const {
  REVIEW_STATUSES,
  PLAN_REVIEW_PERMISSIONS,
  isMasterUnderReview,
  isMasterCorrectionsUnlocked,
  canRaisePlanReviewIssue,
} = require("../utils/planReviewUtils");

const OPEN_ISSUE_STATUSES = ["submitted", "under_review", "accepted"];

const PLAN_LINKED_ENTITY_TYPES = new Set([
  "plan_version",
  "strategic",
  "goal",
  "objective",
  "kpi",
  "target",
  "task",
  "initiative",
  "activity",
  "budget_item",
]);

async function getMasterPlan(masterVersionId, transaction) {
  const master = await PlanVersion.findByPk(masterVersionId, { transaction });
  if (!master || master.version_kind !== "master") {
    const error = new Error("Master plan version not found");
    error.statusCode = 404;
    throw error;
  }
  return master;
}

async function collectPlanEntityIds(masterVersionId, transaction) {
  const versions = await PlanVersion.findAll({
    where: {
      [Op.or]: [
        { plan_version_id: masterVersionId },
        { parent_plan_version_id: masterVersionId },
      ],
    },
    transaction,
  });

  const annualIds = versions
    .filter((v) => v.version_kind === "annual")
    .map((v) => v.plan_version_id);

  let periodVersions = [];
  if (annualIds.length) {
    periodVersions = await PlanVersion.findAll({
      where: {
        parent_plan_version_id: { [Op.in]: annualIds },
        version_kind: "execution_period",
      },
      transaction,
    });
  }

  const allVersionIds = [
    masterVersionId,
    ...annualIds,
    ...periodVersions.map((p) => p.plan_version_id),
  ];

  const nodes = await PlanNode.findAll({
    where: { plan_version_id: { [Op.in]: allVersionIds }, is_active: true },
    attributes: ["plan_node_id"],
    transaction,
  });

  return {
    versionIds: allVersionIds,
    nodeIds: nodes.map((n) => n.plan_node_id),
  };
}

async function getPlanReviewIssues(masterVersionId, filters = {}, transaction = null) {
  const { versionIds, nodeIds } = await collectPlanEntityIds(masterVersionId, transaction);

  const where = {
    [Op.or]: [
      { entity_type: "plan_version", entity_id: masterVersionId },
      ...(nodeIds.length
        ? [{ entity_id: { [Op.in]: nodeIds } }]
        : []),
    ],
  };

  if (filters.status) where.status = filters.status;
  if (filters.issue_category_id) where.issue_category_id = filters.issue_category_id;
  if (filters.issue_priority_id) where.issue_priority_id = filters.issue_priority_id;
  if (filters.raised_by) where.raised_by = filters.raised_by;
  if (filters.assigned_to) where.assigned_to = filters.assigned_to;

  return Issue.findAll({
    where,
    order: [["created_at", "DESC"]],
    transaction,
  });
}

async function validatePublishReadiness(masterVersionId, transaction) {
  const readiness = await validatePlanTargetPipelineReadiness(masterVersionId, transaction);
  const master = readiness.master;
  const errors = [...(readiness.errors ?? [])];

  if (!master) {
    return { ready: false, errors: ["Master plan not found"] };
  }

  if (master.review_status === REVIEW_STATUSES.UNDER_REVIEW) {
    errors.push("Plan is already under review");
  }
  if (master.review_status === REVIEW_STATUSES.CORRECTIONS_UNLOCKED) {
    errors.push("Complete corrections and republish for review first");
  }
  if (master.process_started_at) {
    errors.push("Process has already been started");
  }

  return {
    ready: errors.length === 0,
    errors,
    master,
  };
}

async function getPublishForReviewReadiness(masterVersionId) {
  const t = await sequelize.transaction();
  try {
    const result = await validatePublishReadiness(masterVersionId, t);
    await t.rollback();
    return {
      ready: result.ready,
      errors: result.errors,
      review_status: result.master?.review_status ?? null,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getReviewRecipients(masterVersionId, transaction) {
  const masterNodes = await PlanNode.findAll({
    where: { plan_version_id: masterVersionId, is_active: true },
    transaction,
  });
  const nodeIds = masterNodes.map((n) => n.plan_node_id);
  if (!nodeIds.length) return [];

  const internals = await InternalAssignment.findAll({
    where: { plan_node_id: { [Op.in]: nodeIds }, is_active: true },
    attributes: ["user_id"],
    transaction,
  });

  const userIds = [
    ...new Set(internals.map((a) => a.user_id).filter(Boolean)),
  ];
  return userIds.map((user_id) => ({ user_id }));
}

async function recordReviewAudit(req, { action, master, previousStatus, newStatus }) {
  await recordSystemAuditLog({
    module: "plans",
    action,
    entityId: master.plan_version_id,
    entityLabel: master.draft_name,
    summary: `Plan review: ${action.replace(/_/g, " ")} (${previousStatus ?? "none"} → ${newStatus})`,
    previousValues: { review_status: previousStatus },
    newValues: { review_status: newStatus },
    changedBy: req.user.user_id,
    ipAddress: getClientIp(req),
  });
}

async function publishForReview(masterVersionId, req, io = null) {
  const t = await sequelize.transaction();
  try {
    const validation = await validatePublishReadiness(masterVersionId, t);
    if (!validation.ready) {
      await t.rollback();
      return { success: false, errors: validation.errors };
    }

    const master = validation.master;
    const previousStatus = master.review_status;
    const now = new Date();

    await master.update(
      {
        review_status: REVIEW_STATUSES.UNDER_REVIEW,
        published_for_review_at: now,
        review_unlocked_at: null,
        review_completed_at: null,
      },
      { transaction: t }
    );

    await recordReviewAudit(req, {
      action: "publish_for_review",
      master,
      previousStatus,
      newStatus: REVIEW_STATUSES.UNDER_REVIEW,
    });

    await t.commit();

    const recipients = await getReviewRecipients(masterVersionId);
    await emitPlanReviewEvent(
      PLAN_REVIEW_EVENTS.PUBLISHED,
      { master, actor: req.user, recipients },
      io
    );

    return { success: true, data: await PlanVersion.findByPk(masterVersionId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function unlockForCorrections(masterVersionId, req, io = null) {
  const t = await sequelize.transaction();
  try {
    const master = await getMasterPlan(masterVersionId, t);

    if (!isMasterUnderReview(master)) {
      await t.rollback();
      return { success: false, errors: ["Plan must be under review to unlock corrections"] };
    }

    const issues = await getPlanReviewIssues(masterVersionId, {}, t);
    const hasAccepted = issues.some((i) => i.status === "accepted");
    if (!hasAccepted) {
      await t.rollback();
      return { success: false, errors: ["At least one accepted issue is required to unlock corrections"] };
    }

    const previousStatus = master.review_status;
    await master.update(
      {
        review_status: REVIEW_STATUSES.CORRECTIONS_UNLOCKED,
        review_unlocked_at: new Date(),
      },
      { transaction: t }
    );

    await recordReviewAudit(req, {
      action: "unlock_for_corrections",
      master,
      previousStatus,
      newStatus: REVIEW_STATUSES.CORRECTIONS_UNLOCKED,
    });

    await t.commit();

    await emitPlanReviewEvent(
      PLAN_REVIEW_EVENTS.REOPENED,
      { master, actor: req.user, recipients: [] },
      io
    );

    return { success: true, data: await PlanVersion.findByPk(masterVersionId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function republishForReview(masterVersionId, req, io = null) {
  const t = await sequelize.transaction();
  try {
    const master = await getMasterPlan(masterVersionId, t);

    if (!isMasterCorrectionsUnlocked(master)) {
      await t.rollback();
      return { success: false, errors: ["Plan must be in corrections unlocked state to republish"] };
    }

    const previousStatus = master.review_status;
    await master.update(
      {
        review_status: REVIEW_STATUSES.UNDER_REVIEW,
        published_for_review_at: new Date(),
      },
      { transaction: t }
    );

    await recordReviewAudit(req, {
      action: "republish_for_review",
      master,
      previousStatus,
      newStatus: REVIEW_STATUSES.UNDER_REVIEW,
    });

    await t.commit();

    const recipients = await getReviewRecipients(masterVersionId);
    await emitPlanReviewEvent(
      PLAN_REVIEW_EVENTS.REOPENED,
      { master, actor: req.user, recipients },
      io
    );

    return { success: true, data: await PlanVersion.findByPk(masterVersionId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function validateCompleteReview(masterVersionId, transaction) {
  const master = await getMasterPlan(masterVersionId, transaction);
  const errors = [];

  if (!isMasterUnderReview(master) && !isMasterCorrectionsUnlocked(master)) {
    errors.push("Plan must be under review to complete review");
  }

  const issues = await getPlanReviewIssues(masterVersionId, {}, transaction);
  const blockers = issues.filter((i) => OPEN_ISSUE_STATUSES.includes(i.status));

  if (blockers.length > 0) {
    errors.push(
      `${blockers.length} issue(s) still open (submitted, under review, or accepted). Resolve, close, or reject all issues first.`
    );
  }

  return { ready: errors.length === 0, errors, master, issueCount: issues.length };
}

async function getCompleteReviewReadiness(masterVersionId) {
  const t = await sequelize.transaction();
  try {
    const result = await validateCompleteReview(masterVersionId, t);
    await t.rollback();
    return {
      ready: result.ready,
      errors: result.errors,
      issue_count: result.issueCount,
    };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function completeReview(masterVersionId, req, io = null) {
  const t = await sequelize.transaction();
  try {
    const validation = await validateCompleteReview(masterVersionId, t);
    if (!validation.ready) {
      await t.rollback();
      return { success: false, errors: validation.errors };
    }

    const master = validation.master;
    const previousStatus = master.review_status;
    await master.update(
      {
        review_status: REVIEW_STATUSES.REVIEW_COMPLETED,
        review_completed_at: new Date(),
      },
      { transaction: t }
    );

    await recordReviewAudit(req, {
      action: "complete_review",
      master,
      previousStatus,
      newStatus: REVIEW_STATUSES.REVIEW_COMPLETED,
    });

    await t.commit();

    const recipients = await getReviewRecipients(masterVersionId);
    await emitPlanReviewEvent(
      PLAN_REVIEW_EVENTS.COMPLETED,
      { master, actor: req.user, recipients },
      io
    );

    return { success: true, data: await PlanVersion.findByPk(masterVersionId) };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function getReviewDashboardStats(masterVersionId, filters = {}) {
  const issues = await getPlanReviewIssues(masterVersionId, filters);
  const stats = {
    total: issues.length,
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
    resolved: 0,
    closed: 0,
  };

  for (const issue of issues) {
    if (stats[issue.status] !== undefined) {
      stats[issue.status] += 1;
    }
  }

  return stats;
}

async function validateRaisePlanReviewIssue(entityType, entityId, transaction = null) {
  if (!entityType || !PLAN_LINKED_ENTITY_TYPES.has(entityType)) {
    return;
  }

  let masterVersionId = null;
  if (entityType === "plan_version") {
    masterVersionId = entityId;
  } else {
    const node = await PlanNode.findByPk(entityId, { transaction });
    if (!node) {
      const error = new Error("Linked plan entity not found");
      error.statusCode = 404;
      throw error;
    }
    masterVersionId = await resolveMasterVersionId(node.plan_version_id);
  }

  if (!masterVersionId) {
    const error = new Error("Could not resolve master plan for this issue");
    error.statusCode = 400;
    throw error;
  }

  const master = await getMasterPlan(masterVersionId, transaction);
  if (!canRaisePlanReviewIssue(master)) {
    const error = new Error(
      "Review is closed. Issues can only be raised while the plan is actively under review."
    );
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  collectPlanEntityIds,
  getPlanReviewIssues,
  getPublishForReviewReadiness,
  publishForReview,
  unlockForCorrections,
  republishForReview,
  getCompleteReviewReadiness,
  completeReview,
  getReviewDashboardStats,
  resolveMasterVersionId,
  validateRaisePlanReviewIssue,
  REVIEW_STATUSES,
  PLAN_REVIEW_PERMISSIONS,
};
