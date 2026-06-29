"use strict";

const assert = require("assert");
const {
  collectUserPermissionKeys,
  getUserDepartmentPermissionKeys,
  userHasSpecialPermission,
  userCanViewSectorPlanHierarchy,
  VIEW_SECTOR_PLAN_HIERARCHY_KEY,
} = require("../utils/userPermissionsUtils");
const {
  normalizeGroupKind,
  normalizePermissionTier,
  expectedTierForGroupKind,
  GROUP_KIND,
  PERMISSION_TIER,
} = require("../utils/specialPermissionGroupUtils");

function buildUserFixture(overrides = {}) {
  return {
    roles: [],
    permissionGroups: [],
    departmentPermissionGroups: [],
    ...overrides,
  };
}

function buildGroup(permissions, options = {}) {
  return {
    is_active: true,
    group_kind: GROUP_KIND.SPECIAL,
    permissions,
    ...options,
  };
}

function buildPermission(resource, action, options = {}) {
  return {
    resource,
    action,
    is_active: true,
    permission_tier: PERMISSION_TIER.SPECIAL,
    ...options,
  };
}

function run() {
  assert.strictEqual(normalizeGroupKind("special"), GROUP_KIND.SPECIAL);
  assert.strictEqual(normalizeGroupKind("STANDARD"), GROUP_KIND.STANDARD);
  assert.strictEqual(normalizeGroupKind(undefined), GROUP_KIND.STANDARD);

  assert.strictEqual(normalizePermissionTier("special"), PERMISSION_TIER.SPECIAL);
  assert.strictEqual(expectedTierForGroupKind(GROUP_KIND.SPECIAL), PERMISSION_TIER.SPECIAL);
  assert.strictEqual(expectedTierForGroupKind(GROUP_KIND.STANDARD), PERMISSION_TIER.STANDARD);

  const { filterPermissionsByTier } = require("../utils/specialPermissionGroupUtils");
  const mixed = [
    { permission_tier: "standard", resource: "plans", action: "read" },
    { permission_tier: "special", resource: "plan", action: "view_sector_plan_hierarchy" },
  ];
  assert.strictEqual(filterPermissionsByTier(mixed, "standard").length, 1);
  assert.strictEqual(filterPermissionsByTier(mixed, "special").length, 1);

  const roleOnlyUser = buildUserFixture({
    roles: [
      {
        is_active: true,
        rolePermissions: [
          {
            is_active: true,
            permission: buildPermission("plans", "read", {
              permission_tier: PERMISSION_TIER.STANDARD,
            }),
          },
        ],
      },
    ],
  });

  assert.deepStrictEqual(collectUserPermissionKeys(roleOnlyUser), ["plans:read"]);
  assert.strictEqual(userCanViewSectorPlanHierarchy(roleOnlyUser), false);

  const directGroupUser = buildUserFixture({
    permissionGroups: [
      buildGroup([
        buildPermission("plan", "view_sector_plan_hierarchy"),
      ]),
    ],
  });

  assert.ok(
    collectUserPermissionKeys(directGroupUser).includes(VIEW_SECTOR_PLAN_HIERARCHY_KEY)
  );
  assert.strictEqual(userCanViewSectorPlanHierarchy(directGroupUser), true);

  const departmentGroupUser = buildUserFixture({
    departmentPermissionGroups: [
      buildGroup([
        buildPermission("plan", "view_sector_plan_hierarchy"),
        buildPermission("plan", "override_parent_achievement"),
      ]),
    ],
  });

  assert.deepStrictEqual(getUserDepartmentPermissionKeys(departmentGroupUser), [
    VIEW_SECTOR_PLAN_HIERARCHY_KEY,
    "plan:override_parent_achievement",
  ]);
  assert.ok(userHasSpecialPermission(departmentGroupUser, VIEW_SECTOR_PLAN_HIERARCHY_KEY));
  assert.strictEqual(
    userHasSpecialPermission(departmentGroupUser, "plans:read"),
    false
  );

  const mergedUser = buildUserFixture({
    roles: roleOnlyUser.roles,
    permissionGroups: directGroupUser.permissionGroups,
    departmentPermissionGroups: departmentGroupUser.departmentPermissionGroups,
  });

  const merged = collectUserPermissionKeys(mergedUser);
  assert.ok(merged.includes("plans:read"));
  assert.ok(merged.includes(VIEW_SECTOR_PLAN_HIERARCHY_KEY));
  assert.ok(merged.includes("plan:override_parent_achievement"));

  const inactiveDeptGroupUser = buildUserFixture({
    departmentPermissionGroups: [
      buildGroup([buildPermission("plan", "view_sector_plan_hierarchy")], {
        is_active: false,
      }),
    ],
  });
  assert.strictEqual(userCanViewSectorPlanHierarchy(inactiveDeptGroupUser), false);

  console.log("Special permission group unit checks passed.");
}

run();
