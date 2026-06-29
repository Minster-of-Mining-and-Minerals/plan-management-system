"use strict";

const { isSuperAdminActor } = require("./structureScopeUtils");
const { validateCanEditMasterPlanStructure } = require("./planMasterEditUtils");
const planVisibilityService = require("../services/planVisibilityService");
const { resolveMasterVersionId } = require("../services/planReviewVisibilityService");

const OVERSIGHT_READ_ONLY_ROLES = new Set(["oversight", "global"]);

const OVERSIGHT_READ_ONLY_MESSAGE =
  "Your access to this plan is read-only (sector scope or full-plan oversight). Structure and assignment changes require direct participant access.";

function isOversightReadOnlyAccessRole(role) {
  return OVERSIGHT_READ_ONLY_ROLES.has(role);
}

async function resolveMasterPlanVersionId(planVersion) {
  if (!planVersion) return null;
  if (planVersion.version_kind === "master") {
    return planVersion.plan_version_id;
  }
  return resolveMasterVersionId(planVersion.plan_version_id);
}

async function validateNotOversightReadOnly(req, masterPlanVersionId) {
  if (!masterPlanVersionId) {
    return { valid: true };
  }
  if (isSuperAdminActor(req) || planVisibilityService.isSuperAdminUser(req?.user)) {
    return { valid: true };
  }

  const roles = await planVisibilityService.resolvePlanAccessRolesForMasters(req, [
    masterPlanVersionId,
  ]);
  const role = roles.get(masterPlanVersionId);
  if (OVERSIGHT_READ_ONLY_ROLES.has(role)) {
    return { valid: false, message: OVERSIGHT_READ_ONLY_MESSAGE };
  }
  return { valid: true };
}

async function validatePlanStructureMutationAccess(req, planVersion, transaction = null) {
  const base = validateCanEditMasterPlanStructure(planVersion, req.user);
  if (!base.valid) {
    return base;
  }

  const masterId = await resolveMasterPlanVersionId(planVersion);
  const oversight = await validateNotOversightReadOnly(req, masterId);
  if (!oversight.valid) {
    return oversight;
  }

  return base;
}

module.exports = {
  OVERSIGHT_READ_ONLY_MESSAGE,
  isOversightReadOnlyAccessRole,
  validateNotOversightReadOnly,
  validatePlanStructureMutationAccess,
};
