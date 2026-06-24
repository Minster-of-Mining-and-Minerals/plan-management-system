"use strict";

/**
 * Lightweight scope smoke checks against the live database.
 * Run: node scripts/verify-scope-smoke.js
 */

const {
  GovernmentStructure,
  PlanVersion,
  PlanRule,
  User,
} = require("../models");
const {
  resolveEffectivePlanningConfig,
  getEffectivePlanningConfigForStructure,
} = require("../services/planningConfigurationService");
const {
  resolveAccessibleMasterPlanIds,
  resolvePlanAccessRolesForMasters,
  loadGovernmentStructureIndex,
} = require("../services/planVisibilityService");
const { buildPlanRuleVisibilityWhere } = require("../utils/structureScopeUtils");
const { resolvePlanRuleForVersion } = require("../services/planRuleService");

function ok(label) {
  console.log(`  OK  ${label}`);
}

function info(label) {
  console.log(`  ..  ${label}`);
}

async function main() {
  console.log("Scope smoke verification\n");

  const structures = await GovernmentStructure.findAll({
    attributes: ["government_structure_id", "name", "parent_id"],
    limit: 20,
  });
  if (!structures.length) {
    throw new Error("No government structures found. Run seeds first.");
  }
  ok(`Loaded ${structures.length} government structure(s)`);

  const globalConfig = await resolveEffectivePlanningConfig(null);
  ok(`Global planning config: min=${globalConfig.effective.min_duration_years}, max=${globalConfig.effective.max_duration_years}`);

  const sampleStructure = structures[0];
  const sectorConfig = await getEffectivePlanningConfigForStructure(
    sampleStructure.government_structure_id
  );
  ok(
    `Effective planning config for ${sampleStructure.name}: min=${sectorConfig.min_duration_years}, max=${sectorConfig.max_duration_years}`
  );

  const structureIndex = await loadGovernmentStructureIndex();
  const superAdminReq = { user: { roles: ["Super Admin"], government_structure_id: null } };
  const superAdminRulesWhere = buildPlanRuleVisibilityWhere(
    superAdminReq,
    null,
    structureIndex
  );
  ok(
    `Super Admin plan-rule visibility filter: ${Object.keys(superAdminRulesWhere).length === 0 ? "unrestricted" : "filtered"}`
  );

  const sectorUser = await User.findOne({
    where: { government_structure_id: sampleStructure.government_structure_id },
    attributes: ["user_id", "government_structure_id"],
  });
  if (sectorUser) {
    const sectorReq = {
      user: {
        user_id: sectorUser.user_id,
        roles: ["User"],
        government_structure_id: sectorUser.government_structure_id,
      },
    };
    const accessibleIds = await resolveAccessibleMasterPlanIds(sectorReq);
    info(`Sector user accessible master plans: ${accessibleIds.length}`);

    if (accessibleIds.length > 0) {
      const roles = await resolvePlanAccessRolesForMasters(sectorReq, accessibleIds);
      const ownerCount = [...roles.values()].filter((role) => role === "owner").length;
      const participantCount = [...roles.values()].filter(
        (role) => role === "participant"
      ).length;
      ok(`Plan access roles: ${ownerCount} owner, ${participantCount} participant`);
    }
  } else {
    info("No sector-linked user found for access-role check");
  }

  const inheritedRules = await PlanRule.count({
    where: { inherit_to_descendants: true },
  });
  info(`Inherited global plan rules in DB: ${inheritedRules}`);

  const masterPlan = await PlanVersion.findOne({
    where: { version_kind: "master", review_snapshot_of_version_id: null },
    order: [["created_at", "DESC"]],
  });
  if (masterPlan) {
    const resolvedRule = await resolvePlanRuleForVersion(masterPlan);
    ok(
      `Resolved plan rule for "${masterPlan.draft_name}": ${resolvedRule?.name ?? "none"}`
    );
  } else {
    info("No master plan found for rule-resolution check");
  }

  console.log("\nScope smoke verification completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nScope smoke verification failed:");
    console.error(error);
    process.exit(1);
  });
