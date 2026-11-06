"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  RegionalPlanNode,
  RegionalPlanVersion,
  RegionalInternalAssignment,
  RegionalPlanNodeActionLog,
  RegionalStructure,
  User,
  sequelize,
} = require("../models");
const { userHasPermission } = require("../utils/userPermissionsUtils");
const {
  emitRegionalAchievementSubmittedEvent,
  emitRegionalAchievementApprovedEvent,
  emitRegionalAchievementRejectedEvent,
  emitRegionalAchievementPendingValidationEvent,
  emitRegionalAchievementValidatedEvent,
  emitRegionalAchievementValidationRejectedEvent,
} = require("./regionalPlanNotificationService");

const ACHIEVEMENT_STATUS = Object.freeze({
  EMPTY: "empty",
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  VALIDATED: "validated",
  REJECTED: "rejected",
});

const REGIONAL_EXECUTE_ACHIEVEMENT_KEY = "regional_plans:execute_achievement";
const REGIONAL_APPROVE_ACHIEVEMENT_KEY = "regional_plans:approve_achievement";
const REGIONAL_VALIDATE_ACHIEVEMENT_KEY = "regional_plans:validate_achievement";
const REGIONAL_BYPASS_ACHIEVEMENT_KEY = "regional_plans:bypass_achievement_assignment";
const FEDERAL_BYPASS_ACHIEVEMENT_KEY = "plan:bypass_achievement_assignment";
const REGIONAL_UPDATE_KEY = "regional_plans:update";
const REGIONAL_FINALIZE_KEY = "regional_plans:finalize";
const REGIONAL_MANAGE_KEY = "regional_plans:manage";
const REGIONS_MANAGE_KEY = "regions:manage";

function isSuperAdmin(user) {
  if (!user) return false;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r) => {
      const name = typeof r === "string" ? r : r.name;
      return name && name.toLowerCase().includes("super admin");
    });
  }
  return false;
}

function isAdministrator(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (Array.isArray(user.roles)) {
    return user.roles.some((r) => {
      const name = typeof r === "string" ? r : r.name;
      if (!name) return false;
      const lower = name.toLowerCase();
      return (
        lower.includes("administrator") ||
        lower.includes("regional admin") ||
        lower === "admin"
      );
    });
  }
  return false;
}

function userHasAny(user, keys) {
  if (!user) return false;
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  return keys.some((key) => userHasPermission(user, key));
}

function userCanExecuteRegionalAchievement(user) {
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  return userHasAny(user, [
    REGIONAL_EXECUTE_ACHIEVEMENT_KEY,
    REGIONAL_BYPASS_ACHIEVEMENT_KEY,
    REGIONAL_MANAGE_KEY,
    REGIONS_MANAGE_KEY,
  ]);
}

function userCanApproveRegionalAchievement(user) {
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  return userHasAny(user, [
    REGIONAL_APPROVE_ACHIEVEMENT_KEY,
    REGIONAL_VALIDATE_ACHIEVEMENT_KEY,
    REGIONAL_BYPASS_ACHIEVEMENT_KEY,
    REGIONAL_MANAGE_KEY,
    REGIONS_MANAGE_KEY,
  ]);
}

function userCanValidateRegionalAchievement(user) {
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  return userHasAny(user, [
    REGIONAL_VALIDATE_ACHIEVEMENT_KEY,
    REGIONAL_APPROVE_ACHIEVEMENT_KEY,
    REGIONAL_BYPASS_ACHIEVEMENT_KEY,
    REGIONAL_MANAGE_KEY,
    REGIONS_MANAGE_KEY,
  ]);
}

function userQualifiesForRegionalBypass(user) {
  if (!user) return false;
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  return userHasAny(user, [
    REGIONAL_BYPASS_ACHIEVEMENT_KEY,
    FEDERAL_BYPASS_ACHIEVEMENT_KEY,
    REGIONAL_MANAGE_KEY,
    REGIONS_MANAGE_KEY,
  ]);
}

async function resolveUserObject(userOrUserId, transaction = null) {
  if (!userOrUserId) return null;
  if (
    typeof userOrUserId === "object" &&
    userOrUserId.user_id &&
    (userOrUserId.permissions || (Array.isArray(userOrUserId.roles) && userOrUserId.roles.length > 0))
  ) {
    return userOrUserId;
  }
  const userId = typeof userOrUserId === "object" ? userOrUserId.user_id : userOrUserId;
  return User.findByPk(userId, {
    attributes: { exclude: ["password"] },
    include: [
      { association: "roles", include: [{ association: "rolePermissions", include: ["permission"] }] },
      { association: "permissionGroups", include: [{ association: "permissions" }] },
      { association: "regionalStructure" },
    ],
    transaction,
  });
}

/**
 * Checks whether ancestorId is an ancestor of descendantId in RegionalStructure.
 */
async function isRegionalStructureAncestor(ancestorId, descendantId, transaction = null) {
  if (!ancestorId || !descendantId) return false;
  if (ancestorId === descendantId) return true;

  let currentId = descendantId;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const struct = await RegionalStructure.findByPk(currentId, {
      attributes: ["regional_structure_id", "parent_id"],
      transaction,
    });
    if (!struct || !struct.parent_id) break;
    if (struct.parent_id === ancestorId) return true;
    currentId = struct.parent_id;
  }

  return false;
}

/**
 * Resolves the responsible department for a node (from its own assignments or parent nodes).
 */
async function resolveResponsibleStructureId(node, transaction = null) {
  let responsibleStructureId = null;

  const assignments = await RegionalInternalAssignment.findAll({
    where: { regional_plan_node_id: node.regional_plan_node_id, is_active: true },
    transaction,
  });

  for (const a of assignments) {
    if (a.regional_structure_id) {
      responsibleStructureId = a.regional_structure_id;
      break;
    }
    if (a.assigned_user_id) {
      const assignedUser = await User.findByPk(a.assigned_user_id, {
        attributes: ["user_id", "regional_structure_id"],
        transaction,
      });
      if (assignedUser?.regional_structure_id) {
        responsibleStructureId = assignedUser.regional_structure_id;
        break;
      }
    }
  }

  // Walk up parent nodes if not assigned on leaf
  if (!responsibleStructureId && node.parent_id) {
    let currentParentId = node.parent_id;
    while (currentParentId && !responsibleStructureId) {
      const parentAssignments = await RegionalInternalAssignment.findAll({
        where: { regional_plan_node_id: currentParentId, is_active: true },
        transaction,
      });
      for (const pa of parentAssignments) {
        if (pa.regional_structure_id) {
          responsibleStructureId = pa.regional_structure_id;
          break;
        }
      }
      if (!responsibleStructureId) {
        const parentNode = await RegionalPlanNode.findByPk(currentParentId, {
          attributes: ["regional_plan_node_id", "parent_id"],
          transaction,
        });
        currentParentId = parentNode?.parent_id || null;
      }
    }
  }

  return responsibleStructureId;
}

/**
 * Verifies whether a user has departmental access to a plan node's hierarchy scope.
 * Members of assigned department and child departments have access.
 * Unrelated department branches do not have access.
 */
async function assertUserCanAccessPlanNode(user, node, regionId, transaction = null) {
  if (!user) return true;
  if (isSuperAdmin(user) || isAdministrator(user)) return true;
  if (
    userQualifiesForRegionalBypass(user) ||
    userHasAny(user, [REGIONAL_MANAGE_KEY, REGIONS_MANAGE_KEY])
  ) {
    return true;
  }

  const effectiveRegionId = node.planVersion?.region_id || regionId;
  if (user.region_id && effectiveRegionId && user.region_id !== effectiveRegionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  const assignments = await RegionalInternalAssignment.findAll({
    where: { regional_plan_node_id: node.regional_plan_node_id, is_active: true },
    transaction,
  });

  // If node has no assignments, it remains visible within the region
  if (!assignments || assignments.length === 0) {
    return true;
  }

  // Directly assigned users always have access
  if (assignments.some((a) => a.assigned_user_id === user.user_id)) {
    return true;
  }

  if (!user.regional_structure_id) {
    const error = new Error("Access denied: you do not belong to an authorized department");
    error.status = 403;
    throw error;
  }

  // Check departmental branch relationships
  for (const a of assignments) {
    if (!a.regional_structure_id) continue;
    if (a.regional_structure_id === user.regional_structure_id) {
      return true;
    }
    // Child department access: is assigned structure an ancestor of user's department?
    const isAncestor = await isRegionalStructureAncestor(
      a.regional_structure_id,
      user.regional_structure_id,
      transaction
    );
    if (isAncestor) return true;

    // Parent supervisor access: is user's department an ancestor of assigned structure?
    const isDescendant = await isRegionalStructureAncestor(
      user.regional_structure_id,
      a.regional_structure_id,
      transaction
    );
    if (isDescendant) return true;
  }

  const error = new Error("Access denied: your department does not have access to this plan scope");
  error.status = 403;
  throw error;
}

/**
 * Section 2: Individual User Assignment — Actual Reporting Responsibility
 * Direct individual user assignment is strictly required for achievement submission.
 * Department membership alone must never grant achievement submission rights.
 */
async function assertUserCanExecuteAchievement(user, node, regionId, transaction = null) {
  if (!userCanExecuteRegionalAchievement(user)) {
    const error = new Error("Regional execute achievement permission required");
    error.status = 403;
    throw error;
  }

  const effectiveNodeRegionId = node.planVersion?.region_id || regionId;
  if (regionId && effectiveNodeRegionId && effectiveNodeRegionId !== regionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  if (
    user.region_id &&
    effectiveNodeRegionId &&
    user.region_id !== effectiveNodeRegionId &&
    !isSuperAdmin(user) &&
    !isAdministrator(user)
  ) {
    const error = new Error("Access denied: user belongs to a different region");
    error.status = 403;
    throw error;
  }

  if (userQualifiesForRegionalBypass(user)) {
    return { allowed: true };
  }

  // Check assignments on this node, its source node, or its ancestors
  let isAssigned = false;
  let cur = node;
  while (cur && !isAssigned) {
    const candidateIds = [cur.regional_plan_node_id];
    if (cur.source_regional_plan_node_id) {
      candidateIds.push(cur.source_regional_plan_node_id);
    }
    const assignments = await RegionalInternalAssignment.findAll({
      where: {
        regional_plan_node_id: candidateIds,
        is_active: true,
      },
      transaction,
    });

    isAssigned = assignments.some(
      (a) => a.assigned_user_id && a.assigned_user_id === user.user_id
    );

    if (isAssigned) break;
    cur = cur.parent_id
      ? await RegionalPlanNode.findByPk(cur.parent_id, { transaction })
      : null;
  }

  if (!isAssigned) {
    const error = new Error("Forbidden: You must be assigned to this plan node or department to record achievement");
    error.status = 403;
    throw error;
  }

  return { allowed: true };
}

/**
 * Section 3: Regional Approval — Permission-Based
 * Any user with approval permission in this region (or administrator/bypass) can approve any department's achievement.
 */
async function assertUserCanApproveAchievement(user, node, regionId, transaction = null) {
  if (!userCanApproveRegionalAchievement(user)) {
    const error = new Error("Regional approve achievement permission required");
    error.status = 403;
    throw error;
  }

  const effectiveNodeRegionId = node.planVersion?.region_id || regionId;
  if (regionId && effectiveNodeRegionId && effectiveNodeRegionId !== regionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  if (
    user.region_id &&
    effectiveNodeRegionId &&
    user.region_id !== effectiveNodeRegionId &&
    !isSuperAdmin(user) &&
    !isAdministrator(user)
  ) {
    const error = new Error("Access denied: user belongs to a different region");
    error.status = 403;
    throw error;
  }

  return { allowed: true };
}

/**
 * Section 4: Regional Validation
 * Any user with validation or approval permission in this region (or administrator/bypass) can validate any department's achievement.
 * No cross-branch restriction is enforced.
 */
async function assertUserCanValidateAchievement(user, node, regionId, transaction = null) {
  if (!userCanValidateRegionalAchievement(user) && !userCanApproveRegionalAchievement(user)) {
    const error = new Error("Regional validate achievement permission required");
    error.status = 403;
    throw error;
  }

  const effectiveNodeRegionId = node.planVersion?.region_id || regionId;
  if (regionId && effectiveNodeRegionId && effectiveNodeRegionId !== regionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  if (
    user.region_id &&
    effectiveNodeRegionId &&
    user.region_id !== effectiveNodeRegionId &&
    !isSuperAdmin(user) &&
    !isAdministrator(user)
  ) {
    const error = new Error("Access denied: user belongs to a different region");
    error.status = 403;
    throw error;
  }

  return { allowed: true };
}

/**
 * Section 3.2, 4.2 & 5: Complete Workflow Decision Logic
 */
async function determineRegionalAchievementWorkflow(node, regionId, transaction = null) {
  const approvers = await findEligibleRegionalApprovers(node, regionId, transaction);
  const validators = await findEligibleRegionalValidators(node, regionId, transaction);

  return {
    hasEligibleApprover: approvers.length > 0,
    hasEligibleValidator: validators.length > 0,
    responsibleStructureId: await resolveResponsibleStructureId(node, transaction),
  };
}

async function findEligibleRegionalApprovers(node, regionId, transaction = null) {
  const activeUsers = await User.findAll({
    where: { region_id: regionId, is_active: true },
    include: [
      { association: "roles", include: [{ association: "rolePermissions", include: ["permission"] }] },
      { association: "permissionGroups", include: [{ association: "permissions" }] },
    ],
    transaction,
  });

  return activeUsers.filter((u) => userCanApproveRegionalAchievement(u));
}

async function findEligibleRegionalValidators(node, regionId, transaction = null) {
  const activeUsers = await User.findAll({
    where: { region_id: regionId, is_active: true },
    include: [
      { association: "roles", include: [{ association: "rolePermissions", include: ["permission"] }] },
      { association: "permissionGroups", include: [{ association: "permissions" }] },
    ],
    transaction,
  });

  return activeUsers.filter((u) => userCanValidateRegionalAchievement(u) || userCanApproveRegionalAchievement(u));
}

function normalizeStatus(status) {
  const s = String(status || ACHIEVEMENT_STATUS.EMPTY).toLowerCase();
  return Object.values(ACHIEVEMENT_STATUS).includes(s) ? s : ACHIEVEMENT_STATUS.EMPTY;
}

/**
 * Section 9: Dashboard Aggregation Eligibility Rule Matrix
 * - Validated: Included
 * - Approved: Included only when validation is NOT required (is_validation_required === false)
 * - Submitted, Rejected, Draft, Empty: Excluded
 */
function isRollupEligibleAchievement(node) {
  const status = normalizeStatus(node.period_actual_status || node.annual_actual_status);
  if (status === ACHIEVEMENT_STATUS.VALIDATED) return true;
  if (status === ACHIEVEMENT_STATUS.APPROVED) {
    return node.is_validation_required === false;
  }
  if (!status || status === ACHIEVEMENT_STATUS.EMPTY) {
    return node.period_actual !== null && node.period_actual !== undefined;
  }
  return false;
}

async function loadNodeWithContext(nodeId, regionId, transaction = null) {
  const node = await RegionalPlanNode.findByPk(nodeId, {
    include: [
      { association: "planVersion" },
      {
        association: "internalAssignments",
        include: [{ association: "department" }, { association: "assignedUser" }],
      },
    ],
    transaction,
  });

  if (!node) {
    const error = new Error("Regional plan node not found");
    error.status = 404;
    throw error;
  }

  if (regionId && node.planVersion?.region_id && node.planVersion.region_id !== regionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  return node;
}

/**
 * Section 6 & 7: Achievement Submission, Dynamic Routing & Revision Tracking
 */
async function submitRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId) {
  const user = await resolveUserObject(userOrUserId);
  if (!user) {
    const error = new Error("User context required");
    error.status = 401;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const node = await loadNodeWithContext(nodeId, regionId, t);
    await assertUserCanExecuteAchievement(user, node, regionId, t);

    if (node.planVersion?.version_kind === "execution_period") {
      if (
        node.planVersion.execution_status !== "open" ||
        node.planVersion.is_locked ||
        node.planVersion.status === "completed"
      ) {
        const error = new Error(
          `Cannot submit achievement: period is not open for execution (status: ${
            node.planVersion.execution_status || node.planVersion.status
          })`
        );
        error.status = 400;
        throw error;
      }
    }

    const currentStatus = normalizeStatus(node.period_actual_status);
    if (
      currentStatus !== ACHIEVEMENT_STATUS.EMPTY &&
      currentStatus !== ACHIEVEMENT_STATUS.DRAFT &&
      currentStatus !== ACHIEVEMENT_STATUS.REJECTED
    ) {
      const error = new Error(`Cannot submit achievement from status "${node.period_actual_status}"`);
      error.status = 400;
      throw error;
    }

    if (payload?.period_actual !== undefined && payload?.period_actual !== null && payload?.period_actual !== "") {
      const numericActual = Number(payload.period_actual);
      if (Number.isNaN(numericActual) || numericActual < 0) {
        const error = new Error("Achievement must be zero or greater");
        error.status = 400;
        throw error;
      }
      node.period_actual = numericActual;
    } else if (node.period_actual === null || node.period_actual === undefined) {
      node.period_actual = 0;
    }

    if (payload?.narration !== undefined) {
      node.narration = payload.narration;
    }
    if (Array.isArray(payload?.evidence_attachment_ids)) {
      node.evidence_attachment_ids = payload.evidence_attachment_ids;
    }

    // Dynamic stage determination (Section 5)
    const { hasEligibleApprover, hasEligibleValidator } =
      await determineRegionalAchievementWorkflow(node, regionId, t);

    node.is_validation_required = hasEligibleValidator;

    let nextStatus;
    if (hasEligibleApprover) {
      nextStatus = ACHIEVEMENT_STATUS.SUBMITTED;
    } else if (hasEligibleValidator) {
      // Approval skipped: proceeds directly to validation
      nextStatus = ACHIEVEMENT_STATUS.APPROVED;
    } else {
      // Both approval and validation skipped: directly eligible for aggregation
      nextStatus = ACHIEVEMENT_STATUS.VALIDATED;
    }

    node.period_actual_status = nextStatus;
    node.period_actual_submitted_at = new Date();
    node.period_actual_submitted_by = user.user_id;
    node.period_actual_rejection_comment = null;
    node.period_actual_approved_at = null;
    node.period_actual_approved_by = null;
    node.period_actual_validated_at = null;
    node.period_actual_validated_by = null;

    await node.save({ transaction: t });

    // Calculate revision count for revision history
    const existingLogs = await RegionalPlanNodeActionLog.findAll({
      where: { regional_plan_node_id: nodeId },
      transaction: t,
    });
    const submissionCount = existingLogs.filter((l) =>
      ["ACHIEVEMENT_SUBMITTED", "ACHIEVEMENT_RESUBMITTED"].includes(l.action)
    ).length;
    const revisionNumber = submissionCount + 1;
    const isResubmission = revisionNumber > 1 || currentStatus === ACHIEVEMENT_STATUS.REJECTED;

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: user.user_id,
        action: isResubmission ? "ACHIEVEMENT_RESUBMITTED" : "ACHIEVEMENT_SUBMITTED",
        new_values: {
          revision: revisionNumber,
          period_actual: node.period_actual,
          status: nextStatus,
          narration: node.narration,
          evidence_attachment_ids: node.evidence_attachment_ids,
          hasEligibleApprover,
          hasEligibleValidator,
        },
      },
      { transaction: t }
    );

    await t.commit();

    try {
      if (nextStatus === ACHIEVEMENT_STATUS.SUBMITTED) {
        const approvers = await findEligibleRegionalApprovers(node, regionId);
        await emitRegionalAchievementSubmittedEvent({
          node,
          periodVersionId: node.regional_plan_version_id,
          regionId,
          approvers,
          actor: user,
        });
      } else if (nextStatus === ACHIEVEMENT_STATUS.APPROVED && hasEligibleValidator) {
        const validators = await findEligibleRegionalValidators(node, regionId);
        await emitRegionalAchievementPendingValidationEvent({
          node,
          periodVersionId: node.regional_plan_version_id,
          regionId,
          validators,
          actor: user,
        });
      }
    } catch (notifyErr) {
      console.error("Regional achievement submit notification failed:", notifyErr);
    }

    return node;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Section 3: Departmental Approval
 */
async function approveRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId) {
  const user = await resolveUserObject(userOrUserId);
  if (!user) {
    const error = new Error("User context required");
    error.status = 401;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const node = await loadNodeWithContext(nodeId, regionId, t);
    await assertUserCanApproveAchievement(user, node, regionId, t);

    const currentStatus = normalizeStatus(node.period_actual_status);
    if (currentStatus !== ACHIEVEMENT_STATUS.SUBMITTED) {
      const error = new Error(`Cannot approve achievement from status "${node.period_actual_status}"`);
      error.status = 400;
      throw error;
    }

    node.period_actual_status = ACHIEVEMENT_STATUS.APPROVED;
    node.period_actual_approved_at = new Date();
    node.period_actual_approved_by = user.user_id;
    node.period_actual_rejection_comment = null;

    // Sync legacy quarterly fields
    const seq = node.planVersion?.sequence_index;
    if (seq >= 1 && seq <= 4) {
      node[`q${seq}_actual`] = node.period_actual;
    }

    await node.save({ transaction: t });

    if (node.source_regional_plan_node_id && seq >= 1 && seq <= 4) {
      await RegionalPlanNode.update(
        { [`q${seq}_actual`]: node.period_actual },
        { where: { regional_plan_node_id: node.source_regional_plan_node_id }, transaction: t }
      );
    }

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: user.user_id,
        action: "ACHIEVEMENT_APPROVED",
        new_values: {
          status: ACHIEVEMENT_STATUS.APPROVED,
          is_validation_required: node.is_validation_required,
        },
      },
      { transaction: t }
    );

    await t.commit();

    try {
      if (node.period_actual_submitted_by) {
        await emitRegionalAchievementApprovedEvent({
          node,
          periodVersionId: node.regional_plan_version_id,
          regionId,
          recipients: [{ user_id: node.period_actual_submitted_by }],
          actor: user,
          pendingValidation: Boolean(node.is_validation_required),
        });
      }
      if (node.is_validation_required) {
        const validators = await findEligibleRegionalValidators(node, regionId);
        await emitRegionalAchievementPendingValidationEvent({
          node,
          periodVersionId: node.regional_plan_version_id,
          regionId,
          validators,
          actor: user,
        });
      }
    } catch (notifyErr) {
      console.error("Regional achievement approve notification failed:", notifyErr);
    }

    return node;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Section 7: Departmental Rejection
 * Preserves submitted actuals, narration, evidence, and records rejection reason.
 */
async function rejectRegionalAchievementWorkflow(nodeId, regionId, rejectionComment, userOrUserId) {
  const user = await resolveUserObject(userOrUserId);
  if (!user) {
    const error = new Error("User context required");
    error.status = 401;
    throw error;
  }

  if (!rejectionComment || !String(rejectionComment).trim()) {
    const error = new Error("Rejection comment is required");
    error.status = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const node = await loadNodeWithContext(nodeId, regionId, t);
    await assertUserCanApproveAchievement(user, node, regionId, t);

    const currentStatus = normalizeStatus(node.period_actual_status);
    if (currentStatus !== ACHIEVEMENT_STATUS.SUBMITTED) {
      const error = new Error(`Cannot reject achievement from status "${node.period_actual_status}"`);
      error.status = 400;
      throw error;
    }

    node.period_actual_status = ACHIEVEMENT_STATUS.REJECTED;
    node.period_actual_rejection_comment = rejectionComment.trim();

    await node.save({ transaction: t });

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: user.user_id,
        action: "ACHIEVEMENT_REJECTED",
        comment: rejectionComment.trim(),
        previous_values: {
          period_actual: node.period_actual,
          narration: node.narration,
          evidence_attachment_ids: node.evidence_attachment_ids,
          submitted_by: node.period_actual_submitted_by,
          submitted_at: node.period_actual_submitted_at,
        },
        new_values: {
          status: ACHIEVEMENT_STATUS.REJECTED,
          rejection_comment: rejectionComment.trim(),
        },
      },
      { transaction: t }
    );

    await t.commit();

    try {
      if (node.period_actual_submitted_by) {
        await emitRegionalAchievementRejectedEvent({
          node,
          periodVersionId: node.regional_plan_version_id,
          regionId,
          recipients: [{ user_id: node.period_actual_submitted_by }],
          actor: user,
          comment: rejectionComment.trim(),
        });
      }
    } catch (notifyErr) {
      console.error("Regional achievement reject notification failed:", notifyErr);
    }

    return node;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Section 4: Cross-Department Validation
 */
async function validateRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId) {
  const user = await resolveUserObject(userOrUserId);
  if (!user) {
    const error = new Error("User context required");
    error.status = 401;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const node = await loadNodeWithContext(nodeId, regionId, t);
    await assertUserCanValidateAchievement(user, node, regionId, t);

    const currentStatus = normalizeStatus(node.period_actual_status);
    if (currentStatus !== ACHIEVEMENT_STATUS.APPROVED) {
      const error = new Error(`Cannot validate achievement from status "${node.period_actual_status}"`);
      error.status = 400;
      throw error;
    }

    node.period_actual_status = ACHIEVEMENT_STATUS.VALIDATED;
    node.period_actual_validated_at = new Date();
    node.period_actual_validated_by = user.user_id;

    await node.save({ transaction: t });

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: user.user_id,
        action: "ACHIEVEMENT_VALIDATED",
        new_values: { status: ACHIEVEMENT_STATUS.VALIDATED },
      },
      { transaction: t }
    );

    await t.commit();

    try {
      const recipients = [];
      if (node.period_actual_submitted_by) recipients.push({ user_id: node.period_actual_submitted_by });
      if (node.period_actual_approved_by) recipients.push({ user_id: node.period_actual_approved_by });
      await emitRegionalAchievementValidatedEvent({
        node,
        periodVersionId: node.regional_plan_version_id,
        regionId,
        recipients,
        actor: user,
      });
    } catch (notifyErr) {
      console.error("Regional achievement validate notification failed:", notifyErr);
    }

    return node;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Section 4 & 7: Cross-Department Validation Rejection
 * Preserves submitted actuals, narration, evidence, and records rejection reason.
 */
async function rejectValidationRegionalAchievementWorkflow(nodeId, regionId, rejectionComment, userOrUserId) {
  const user = await resolveUserObject(userOrUserId);
  if (!user) {
    const error = new Error("User context required");
    error.status = 401;
    throw error;
  }

  if (!rejectionComment || !String(rejectionComment).trim()) {
    const error = new Error("Rejection comment is required");
    error.status = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const node = await loadNodeWithContext(nodeId, regionId, t);
    await assertUserCanValidateAchievement(user, node, regionId, t);

    const currentStatus = normalizeStatus(node.period_actual_status);
    if (currentStatus !== ACHIEVEMENT_STATUS.APPROVED) {
      const error = new Error(`Cannot reject validation from status "${node.period_actual_status}"`);
      error.status = 400;
      throw error;
    }

    node.period_actual_status = ACHIEVEMENT_STATUS.REJECTED;
    node.period_actual_rejection_comment = rejectionComment.trim();

    await node.save({ transaction: t });

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: user.user_id,
        action: "ACHIEVEMENT_VALIDATION_REJECTED",
        comment: rejectionComment.trim(),
        previous_values: {
          period_actual: node.period_actual,
          narration: node.narration,
          evidence_attachment_ids: node.evidence_attachment_ids,
          submitted_by: node.period_actual_submitted_by,
          submitted_at: node.period_actual_submitted_at,
          approved_by: node.period_actual_approved_by,
          approved_at: node.period_actual_approved_at,
        },
        new_values: {
          status: ACHIEVEMENT_STATUS.REJECTED,
          rejection_comment: rejectionComment.trim(),
        },
      },
      { transaction: t }
    );

    await t.commit();

    try {
      const recipients = [];
      if (node.period_actual_submitted_by) recipients.push({ user_id: node.period_actual_submitted_by });
      if (node.period_actual_approved_by) recipients.push({ user_id: node.period_actual_approved_by });
      await emitRegionalAchievementValidationRejectedEvent({
        node,
        periodVersionId: node.regional_plan_version_id,
        regionId,
        recipients,
        actor: user,
        comment: rejectionComment.trim(),
      });
    } catch (notifyErr) {
      console.error("Regional achievement validation reject notification failed:", notifyErr);
    }

    return node;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Resolves achievement workflow scope for a regional plan version (period or annual).
 * Returns sets of node IDs where the user can execute, approve, or validate achievements.
 */
async function resolveRegionalAchievementWorkflowScope(planVersionId, regionId, userOrUserId, transaction = null) {
  const user = await resolveUserObject(userOrUserId, transaction);
  if (!user) {
    return { success: false, message: "User context required" };
  }

  const version = await RegionalPlanVersion.findByPk(planVersionId, { transaction });
  if (!version) {
    return { success: false, message: "Regional plan version not found" };
  }

  const nodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: planVersionId, is_active: true },
    include: [
      {
        association: "internalAssignments",
        where: { is_active: true },
        required: false,
      },
    ],
    transaction,
  });

  const executorNodeIds = new Set();
  const approverNodeIds = new Set();
  const validatorNodeIds = new Set();

  const isBypass = userQualifiesForRegionalBypass(user);
  const canExec = userCanExecuteRegionalAchievement(user);
  const canApprove = userCanApproveRegionalAchievement(user);
  const canValidate = userCanValidateRegionalAchievement(user);

  let hasValidationGate = false;
  const nodeMap = new Map(nodes.map((n) => [n.regional_plan_node_id, n]));

  const isNodeAssignedToUser = (targetNode) => {
    let cur = targetNode;
    while (cur) {
      const assignments = cur.internalAssignments || [];
      const matched = assignments.some(
        (a) => a.assigned_user_id && a.assigned_user_id === user.user_id
      );
      if (matched) return true;
      cur = cur.parent_id ? nodeMap.get(cur.parent_id) : null;
    }
    return false;
  };

  for (const node of nodes) {
    if (node.is_validation_required) {
      hasValidationGate = true;
    }

    // 1. Executor (must be assigned directly, via department, or via ancestor)
    if (canExec) {
      if (isBypass) {
        executorNodeIds.add(node.regional_plan_node_id);
      } else if (isNodeAssignedToUser(node)) {
        executorNodeIds.add(node.regional_plan_node_id);
      }
    }

    // 2. Approver (departmental hierarchy scope)
    if (canApprove) {
      if (isBypass) {
        approverNodeIds.add(node.regional_plan_node_id);
      } else {
        try {
          const check = await assertUserCanApproveAchievement(user, node, regionId, transaction);
          if (check?.allowed) {
            approverNodeIds.add(node.regional_plan_node_id);
          }
        } catch {
          // not eligible approver
        }
      }
    }

    // 3. Validator (scope)
    if (canValidate) {
      if (isBypass) {
        validatorNodeIds.add(node.regional_plan_node_id);
      } else {
        try {
          const check = await assertUserCanValidateAchievement(user, node, regionId, transaction);
          if (check?.allowed) {
            validatorNodeIds.add(node.regional_plan_node_id);
          }
        } catch {
          // not eligible validator
        }
      }
    }
  }

  if (validatorNodeIds.size > 0) {
    hasValidationGate = true;
  }

  return {
    success: true,
    data: {
      master_version_id: version.parent_plan_version_id || version.regional_plan_version_id,
      plan_version_id: version.regional_plan_version_id,
      executor_node_ids: Array.from(executorNodeIds),
      approver_node_ids: Array.from(approverNodeIds),
      validator_node_ids: Array.from(validatorNodeIds),
      has_validation_gate: hasValidationGate,
      assignment_bypass_active: isBypass,
    },
  };
}

module.exports = {
  ACHIEVEMENT_STATUS,
  userCanExecuteRegionalAchievement,
  userCanApproveRegionalAchievement,
  userCanValidateRegionalAchievement,
  userQualifiesForRegionalBypass,
  isRegionalStructureAncestor,
  resolveResponsibleStructureId,
  assertUserCanAccessPlanNode,
  assertUserCanExecuteAchievement,
  assertUserCanApproveAchievement,
  assertUserCanValidateAchievement,
  determineRegionalAchievementWorkflow,
  findEligibleRegionalApprovers,
  findEligibleRegionalValidators,
  resolveRegionalAchievementWorkflowScope,
  isRollupEligibleAchievement,
  submitRegionalAchievementWorkflow,
  approveRegionalAchievementWorkflow,
  rejectRegionalAchievementWorkflow,
  validateRegionalAchievementWorkflow,
  rejectValidationRegionalAchievementWorkflow,
};
