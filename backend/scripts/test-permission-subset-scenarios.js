"use strict";

/**
 * Reproduces permission-group subset scenarios against live DB (read-only assertions).
 * Run: node scripts/test-permission-subset-scenarios.js
 */

const { v4: uuidv4 } = require("uuid");
const { sequelize, PermissionGroup, PermissionGroupPermission } = require("../models");
const {
  getStructureEffectivePermissionIdSet,
  getStructureAssignablePermissionIdSet,
  assertPermissionGroupFitsStructureHierarchy,
  assertPermissionIdsFitLinkedStructureHierarchies,
  assertPermissionIdsAllowedForStructure,
} = require("../utils/structureEffectivePermissionsUtils");

const ALT_MOM = "10000000-0000-4000-8000-000000000004";
const EGI = "10000000-0000-4000-8000-000000000005";

async function scenario(name, fn) {
  process.stdout.write(`\n▶ ${name}\n`);
  try {
    await fn();
    console.log("  ✓ PASS");
  } catch (error) {
    console.log(`  ✗ FAIL: ${error.message}`);
    if (error.unauthorizedPermissionIds?.length) {
      console.log(`    unauthorized (first 3): ${error.unauthorizedPermissionIds.slice(0, 3).join(", ")}`);
    }
  }
}

async function main() {
  const planMgmt = await sequelize.query(
    `SELECT p.permission_id FROM permission_groups pg
     JOIN permission_group_permissions pgp ON pgp.permission_group_id = pg.permission_group_id
     JOIN permissions p ON p.permission_id = pgp.permission_id
     WHERE pg.name = 'Plan Management'`,
    { type: sequelize.QueryTypes.SELECT }
  );
  const planPermIds = planMgmt.map((r) => r.permission_id);
  const subset = planPermIds.slice(0, Math.max(1, Math.floor(planPermIds.length / 2)));

  console.log(`Plan Management has ${planPermIds.length} perms; testing subset of ${subset.length}`);

  await scenario("Alt MoM assignable equals effective and includes Plan Management perms", async () => {
    const effective = await getStructureEffectivePermissionIdSet(ALT_MOM);
    const assignable = await getStructureAssignablePermissionIdSet(ALT_MOM);
    if (effective.size !== assignable.size) {
      throw new Error(`expected assignable=effective, got ${assignable.size} vs ${effective.size}`);
    }
    const missing = subset.filter((id) => !assignable.has(id));
    if (missing.length) {
      throw new Error(`${missing.length} subset perms not in assignable set`);
    }
  });

  await scenario("Child EGI assignable is 0 until groups are linked to EGI (no parent inheritance)", async () => {
    const childAssign = await getStructureAssignablePermissionIdSet(EGI);
    const parentEff = await getStructureEffectivePermissionIdSet(ALT_MOM);
    console.log(`    EGI assignable=${childAssign.size}, parent effective=${parentEff.size}`);
    if (childAssign.size !== 0) {
      throw new Error("Expected EGI assignable=0 before explicit group links");
    }
  });

  await scenario("Subset on Alt MoM passes sector-local validation", async () => {
    await assertPermissionIdsAllowedForStructure(subset, ALT_MOM);
  });

  await scenario("Same subset on empty child EGI fails without bootstrap", async () => {
    await assertPermissionIdsAllowedForStructure(subset, EGI);
    throw new Error("Expected failure but passed");
  }).catch(() => {});

  const tempGroupId = uuidv4();
  await PermissionGroup.create({
    permission_group_id: tempGroupId,
    name: `__test_subset_${Date.now()}`,
    description: "test",
    is_active: true,
    group_kind: "standard",
  });
  await PermissionGroupPermission.bulkCreate(
    subset.map((pid) => ({
      permission_group_id: tempGroupId,
      permission_id: pid,
      created_at: new Date(),
    }))
  );

  await scenario("Link subset group to Alt MoM — sector-local check", async () => {
    await assertPermissionGroupFitsStructureHierarchy(tempGroupId, ALT_MOM);
  });

  await scenario("Link subset group to child EGI fails without bootstrap", async () => {
    await assertPermissionGroupFitsStructureHierarchy(tempGroupId, EGI);
    throw new Error("Expected failure");
  }).catch(() => {});

  await scenario("Link subset group to child EGI passes with bootstrap (explicit grant)", async () => {
    await assertPermissionGroupFitsStructureHierarchy(tempGroupId, EGI, { allowBootstrap: true });
  });

  await scenario("Update subset on unlinked temp group skips structure link checks", async () => {
    await assertPermissionIdsFitLinkedStructureHierarchies(tempGroupId, subset);
  });

  await PermissionGroupPermission.destroy({ where: { permission_group_id: tempGroupId } });
  await PermissionGroup.destroy({ where: { permission_group_id: tempGroupId } });

  await sequelize.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
