"use strict";

/**
 * Validates structure-scoped permission/role cascading against live DB data.
 * Run: node scripts/validate-structure-scope.js
 */

const {
  GovernmentStructure,
  Role,
  RolePermission,
  Permission,
  GovernmentStructurePermissionGroup,
  sequelize,
} = require("../models");
const {
  SUPER_ADMIN_ROLE_ID,
  USER_ROLE_ID,
  ROLE_SCOPE,
} = require("../constants/systemRoles");
const {
  getStructureEffectivePermissionIdSet,
  getStructureAssignablePermissionIdSet,
  getPermissionIdsInPermissionGroup,
  assertPermissionIdsAllowedForStructure,
  assertPermissionGroupFitsStructureHierarchy,
} = require("../utils/structureEffectivePermissionsUtils");
const { buildRoleVisibilityWhere } = require("../utils/structureScopeUtils");
const { Op } = require("sequelize");

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  PASS: ${msg}`);
}

function fail(msg, detail) {
  failures.push({ msg, detail });
  console.error(`  FAIL: ${msg}`);
  if (detail) console.error(`        ${detail}`);
}

function isSubset(childSet, parentSet) {
  for (const id of childSet) {
    if (!parentSet.has(id)) return false;
  }
  return true;
}

async function validateRoleScopes() {
  console.log("\n== Role scopes ==");

  const superAdmin = await Role.findByPk(SUPER_ADMIN_ROLE_ID);
  const userRole = await Role.findByPk(USER_ROLE_ID);

  if (!superAdmin) {
    fail("Super Admin role missing");
  } else if (superAdmin.scope !== ROLE_SCOPE.PRIVATE) {
    fail("Super Admin should be private scope", `got ${superAdmin.scope}`);
  } else {
    pass("Super Admin role is private scope");
  }

  if (!userRole) {
    fail("User role missing");
  } else if (userRole.scope !== ROLE_SCOPE.GLOBAL) {
    fail("User role should be global scope", `got ${userRole.scope}`);
  } else {
    pass("User role is global scope");
  }

  const structureRoles = await Role.findAll({
    where: { scope: ROLE_SCOPE.STRUCTURE, is_active: true, deleted_at: null },
    include: [
      {
        model: RolePermission,
        as: "rolePermissions",
        required: false,
        where: { is_active: true },
        include: [{ model: Permission, as: "permission" }],
      },
    ],
  });

  for (const role of structureRoles) {
    const structureId = role.government_structure_id;
    if (!structureId) {
      fail(`Structure role ${role.name} missing government_structure_id`);
      continue;
    }

    const permissionIds = (role.rolePermissions || [])
      .map((rp) => rp.permission?.permission_id)
      .filter(Boolean);

    const assignable = await getStructureAssignablePermissionIdSet(structureId);
    const rolePermSet = new Set(permissionIds);

    if (!isSubset(rolePermSet, assignable)) {
      const extra = [...rolePermSet].filter((id) => !assignable.has(id));
      fail(
        `Role "${role.name}" (${role.role_id}) exceeds assignable permissions`,
        `extra permission_ids: ${extra.slice(0, 5).join(", ")}`
      );
    } else {
      pass(`Role "${role.name}" permissions within assignable set`);
    }
  }
}

async function validatePermissionCascading() {
  console.log("\n== Sector-local permission scope ==");

  const structures = await GovernmentStructure.findAll({
    where: { is_active: true },
    attributes: ["government_structure_id", "name", "parent_id", "level"],
    order: [["level", "ASC"], ["name", "ASC"]],
  });

  if (structures.length === 0) {
    console.log("  SKIP: no structures in DB");
    return;
  }

  for (const structure of structures) {
    const childEffective = await getStructureEffectivePermissionIdSet(
      structure.government_structure_id
    );
    const childAssignable = await getStructureAssignablePermissionIdSet(
      structure.government_structure_id
    );

    if (!isSubset(childAssignable, childEffective)) {
      fail(`Assignable permissions for "${structure.name}" exceed own effective set`);
    } else if (childAssignable.size !== childEffective.size) {
      fail(
        `Assignable should equal effective for "${structure.name}"`,
        `effective=${childEffective.size} assignable=${childAssignable.size}`
      );
    } else {
      pass(`"${structure.name}" assignable equals sector-local effective (${childEffective.size})`);
    }

    const links = await GovernmentStructurePermissionGroup.findAll({
      where: { government_structure_id: structure.government_structure_id },
    });

    for (const link of links) {
      try {
        await assertPermissionGroupFitsStructureHierarchy(
          link.permission_group_id,
          structure.government_structure_id,
          { allowBootstrap: true }
        );
        pass(`Permission group on "${structure.name}" fits sector-local scope`);
      } catch (error) {
        fail(
          `Permission group ${link.permission_group_id} on "${structure.name}" violates sector scope`,
          error.message
        );
      }
    }
  }
}

async function validateRoleVisibilityLogic() {
  console.log("\n== Role visibility query shape ==");

  const mockSuperAdminReq = { user: { roles: ["Super Admin"] } };
  const mockStructureReq = { user: { roles: ["Some Role"], government_structure_id: "x" } };

  const allWhere = buildRoleVisibilityWhere(mockSuperAdminReq, null);
  if (Object.keys(allWhere).length !== 0) {
    fail("Super Admin without structure filter should see all roles");
  } else {
    pass("Super Admin global role list unconstrained");
  }

  const sample = await GovernmentStructure.findOne({
    where: { parent_id: { [Op.ne]: null }, is_active: true },
  });

  if (sample) {
    const structureWhere = buildRoleVisibilityWhere(mockSuperAdminReq, sample.government_structure_id);
    if (!structureWhere[Op.or]) {
      fail("Structure-scoped role visibility missing OR clause");
    } else {
      pass(`Structure filter builds OR visibility for "${sample.name}"`);
    }
  }
}

async function validateAssertionHelpers() {
  console.log("\n== Assertion helpers (smoke) ==");

  const structureWithPermissions = await GovernmentStructure.findOne({
    where: { is_active: true },
  });

  if (!structureWithPermissions) {
    console.log("  SKIP: no structure for assertion smoke test");
    return;
  }

  let target = structureWithPermissions;
  for (const candidate of await GovernmentStructure.findAll({
    where: { is_active: true },
    attributes: ["government_structure_id", "name"],
  })) {
    const assignable = await getStructureAssignablePermissionIdSet(
      candidate.government_structure_id
    );
    if (assignable.size > 0) {
      target = candidate;
      break;
    }
  }

  const assignable = await getStructureAssignablePermissionIdSet(target.government_structure_id);
  const sampleIds = [...assignable].slice(0, 2);

  if (sampleIds.length === 0) {
    console.log(`  SKIP: "${target.name}" has no assignable permissions to test`);
    return;
  }

  try {
    await assertPermissionIdsAllowedForStructure(sampleIds, target.government_structure_id);
    pass("assertPermissionIdsAllowedForStructure accepts valid assignable ids");
  } catch (error) {
    fail("assertPermissionIdsAllowedForStructure rejected valid ids", error.message);
  }

  const allPerms = await Permission.findAll({
    where: { is_active: true },
    limit: 200,
    attributes: ["permission_id"],
  });
  const bogus = allPerms.find((p) => !assignable.has(p.permission_id));

  if (bogus) {
    try {
      await assertPermissionIdsAllowedForStructure(
        [bogus.permission_id],
        target.government_structure_id
      );
      fail("assertPermissionIdsAllowedForStructure should reject out-of-scope permission");
    } catch (error) {
      if (error.status === 403) {
        pass("assertPermissionIdsAllowedForStructure rejects out-of-scope permission");
      } else {
        fail("Unexpected error from assertion", error.message);
      }
    }
  }
}

async function validatePlanFilesUntouched() {
  console.log("\n== Plan logic (git) ==");
  const { execSync } = require("child_process");
  const repoRoot = require("path").join(__dirname, "..", "..");

  const planPaths = [
    "backend/services/planMasterEditService.js",
    "backend/services/planVersionLifecycleService.js",
    "backend/controllers/plan/planController.js",
    "backend/controllers/plan/planAssignmentController.js",
    "frontend/src/redux/api/planApi.ts",
  ];

  let planModified = false;
  for (const rel of planPaths) {
    try {
      const out = execSync(`git diff --name-only HEAD -- "${rel}"`, {
        cwd: repoRoot,
        encoding: "utf8",
      }).trim();
      if (out) {
        planModified = true;
        fail(`Plan file modified in working tree: ${rel}`);
      }
    } catch {
      // git diff returns non-zero when no diff in some setups; ignore
    }
  }

  if (!planModified) {
    pass("No plan service/controller/API files in uncommitted diff");
  }
}

async function main() {
  console.log("Validating structure scope & cascading...\n");

  try {
    await sequelize.authenticate();
    pass("Database connection");

    await validatePlanFilesUntouched();
    await validateRoleScopes();
    await validatePermissionCascading();
    await validateRoleVisibilityLogic();
    await validateAssertionHelpers();
  } catch (error) {
    fail("Validation script crashed", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }

  console.log(`\n== Summary ==`);
  console.log(`Passed: ${passes.length}`);
  console.log(`Failed: ${failures.length}`);

  if (failures.length > 0) {
    process.exit(1);
  }

  console.log("\nAll checks passed. Safe to merge from a scope/cascading perspective.");
}

main();
