"use strict";

const { PlanVersion } = require("../../models");
const {
  userCanRequestAmendment,
  userCanApproveAmendment,
} = require("../../utils/planAmendmentPermissionUtils");
const { AMENDMENT_MESSAGES } = require("../../utils/planAmendmentMessages");
const { userQualifiesForAchievementAssignmentBypass } = require("../../utils/planAchievementBypassUtils");
const {
  loadAchievementScopeContext,
  resolveExecutorLeafMasterNodeIdsForUser,
  resolveApproverScopeMasterNodeIdsForUser,
} = require("../planAchievementScopeService");
const { userCanAccessPlanSector } = require("../planAchievementScopeUtils");
const { loadSectorApproverUsers, loadUsersWithEffectivePermissions } = require("../planAchievementUserService");
const { resolveMasterVersionId } = require("../planReviewVisibilityService");

async function loadLiveMasterForAmendment(masterPlanVersionId, transaction = null) {
  if (!masterPlanVersionId) {
    return { success: false, message: AMENDMENT_MESSAGES.DRAFT_REQUIRED };
  }

  const resolvedId = await resolveMasterVersionId(masterPlanVersionId);
  const versionId = resolvedId || masterPlanVersionId;

  const master = await PlanVersion.findByPk(versionId, {
    attributes: [
      "plan_version_id",
      "version_kind",
      "process_started_at",
      "active_execution_snapshot_id",
      "title",
      "government_structure_id",
    ],
    transaction,
  });

  if (!master) {
    return { success: false, message: AMENDMENT_MESSAGES.DRAFT_NOT_FOUND };
  }

  if (master.version_kind !== "master") {
    return { success: false, message: AMENDMENT_MESSAGES.NOT_MASTER };
  }

  if (!master.process_started_at) {
    return { success: false, message: AMENDMENT_MESSAGES.PROCESS_NOT_STARTED };
  }

  return { success: true, data: master };
}

async function userHasPlanAmendmentSectorAccess(user, masterVersionId, transaction = null) {
  const { planSectorId, structureIndex } = await loadSectorApproverUsers(
    masterVersionId,
    transaction
  );
  if (!planSectorId) {
    return false;
  }
  return userCanAccessPlanSector(user, planSectorId, structureIndex);
}

async function assertUserCanRequestAmendmentOnDraft(
  user,
  masterPlanVersionId,
  transaction = null
) {
  if (!userCanRequestAmendment(user)) {
    return { allowed: false, message: AMENDMENT_MESSAGES.PERMISSION_REQUEST };
  }

  const masterResult = await loadLiveMasterForAmendment(masterPlanVersionId, transaction);
  if (!masterResult.success) {
    return { allowed: false, message: masterResult.message };
  }

  const master = masterResult.data;

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true, master };
  }

  const executorLeaves = await resolveExecutorLeafMasterNodeIdsForUser(
    master.plan_version_id,
    user,
    transaction
  );
  if (executorLeaves.size > 0) {
    return { allowed: true, master };
  }

  const sectorOk = await userHasPlanAmendmentSectorAccess(
    user,
    master.plan_version_id,
    transaction
  );
  if (sectorOk) {
    return { allowed: true, master };
  }

  // Fallback: any assignment context on the plan (even if not leaf executor)
  const context = await loadAchievementScopeContext(master.plan_version_id, transaction);
  if (
    context.internalAssignments?.some(
      (row) =>
        row.assigned_user_id === user.user_id ||
        (user.department_id && row.assigned_department_id === user.department_id)
    )
  ) {
    return { allowed: true, master };
  }

  return { allowed: false, message: AMENDMENT_MESSAGES.SCOPE_DENIED };
}

async function assertUserCanApproveAmendmentOnDraft(
  user,
  masterPlanVersionId,
  transaction = null
) {
  if (!userCanApproveAmendment(user)) {
    return { allowed: false, message: AMENDMENT_MESSAGES.PERMISSION_APPROVE };
  }

  const masterResult = await loadLiveMasterForAmendment(masterPlanVersionId, transaction);
  if (!masterResult.success) {
    return { allowed: false, message: masterResult.message };
  }

  const master = masterResult.data;

  if (userQualifiesForAchievementAssignmentBypass(user)) {
    return { allowed: true, master };
  }

  const approverNodes = await resolveApproverScopeMasterNodeIdsForUser(
    master.plan_version_id,
    user,
    transaction
  );
  if (approverNodes.size > 0) {
    return { allowed: true, master };
  }

  const sectorOk = await userHasPlanAmendmentSectorAccess(
    user,
    master.plan_version_id,
    transaction
  );
  if (sectorOk) {
    return { allowed: true, master };
  }

  return { allowed: false, message: AMENDMENT_MESSAGES.APPROVE_SCOPE_DENIED };
}

async function resolveAmendmentApproverUsers(masterVersionId, transaction = null) {
  if (!masterVersionId) {
    return [];
  }

  const { planSectorId, structureIndex, users: sectorCandidates } =
    await loadSectorApproverUsers(masterVersionId, transaction);

  const candidateIds = sectorCandidates.map((user) => user.user_id);
  const users = await loadUsersWithEffectivePermissions(candidateIds, transaction);
  const seen = new Set();
  const approvers = [];

  for (const user of users) {
    if (!userCanApproveAmendment(user) || seen.has(user.user_id)) {
      continue;
    }

    const sectorOk =
      planSectorId && userCanAccessPlanSector(user, planSectorId, structureIndex);

    if (sectorOk || userQualifiesForAchievementAssignmentBypass(user)) {
      seen.add(user.user_id);
      approvers.push(user);
    }
  }

  return approvers;
}

module.exports = {
  loadLiveMasterForAmendment,
  assertUserCanRequestAmendmentOnDraft,
  assertUserCanApproveAmendmentOnDraft,
  resolveAmendmentApproverUsers,
};
