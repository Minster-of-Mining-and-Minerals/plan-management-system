"use strict";

require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { Role, PermissionGroup, Permission, User, Region, sequelize } = require("../models");
const { ROLE_SCOPE } = require("../constants/systemRoles");
const { assertRoleAccessible, assertRoleModifiable, assertRoleDeletable } = require("../utils/structureScopeUtils");

async function run() {
  console.log("\n========================================================");
  console.log("  VERIFYING REGIONAL ROLES & PERMISSION GROUPS ISOLATION");
  console.log("========================================================\n");

  const region1Id = uuidv4();
  const region2Id = uuidv4();

  try {
    await Region.create({
      region_id: region1Id,
      name: "Test Region Alpha " + Date.now(),
      code: "TR_ALPHA_" + Date.now().toString().slice(-4),
      is_active: true,
    });

    await Region.create({
      region_id: region2Id,
      name: "Test Region Beta " + Date.now(),
      code: "TR_BETA_" + Date.now().toString().slice(-4),
      is_active: true,
    });

    // 1. Regional Permissions Catalog Availability
    const regionalPermissions = await Permission.findAll({
      where: {
        is_active: true,
        resource: ["regional_roles", "regional_permission_groups", "regional_users", "regions"],
      },
    });
    console.log(`[1] Regional Permissions Catalog found: ${regionalPermissions.length} permissions`);
    if (regionalPermissions.length === 0) {
      throw new Error("No regional permissions found in database!");
    }
    console.log("  PASS: Regional permissions catalog available across regions.");

    // 2. Create custom role in Region 1
    const role1 = await Role.create({
      role_id: uuidv4(),
      name: "Senior Mining Inspector",
      scope: ROLE_SCOPE.REGIONAL,
      region_id: region1Id,
      is_active: true,
    });
    console.log("  PASS: Role created in Region 1:", role1.name);

    // 3. Create same role name in Region 2 (should succeed because name uniqueness is per region)
    const role2 = await Role.create({
      role_id: uuidv4(),
      name: "Senior Mining Inspector",
      scope: ROLE_SCOPE.REGIONAL,
      region_id: region2Id,
      is_active: true,
    });
    console.log("  PASS: Identical role name allowed in Region 2 (isolated namespace):", role2.name);

    // 4. Role Accessibility across regions
    const reqRegion1 = {
      user: {
        user_id: uuidv4(),
        is_regional: true,
        region_id: region1Id,
        roles: ["Regional Administrator"],
        permissions: ["regional_roles:read", "regional_roles:manage"],
      },
    };

    assertRoleAccessible(role1, reqRegion1);
    console.log("  PASS: Region 1 user can access Region 1 role");

    let blockedCrossRegion = false;
    try {
      assertRoleAccessible(role2, reqRegion1);
    } catch (err) {
      blockedCrossRegion = true;
      console.log("  PASS: Region 1 user blocked from accessing Region 2 role:", err.message);
    }
    if (!blockedCrossRegion) {
      throw new Error("Region 1 user was not blocked from Region 2 role!");
    }

    // 5. Create permission group in Region 1
    const group1 = await PermissionGroup.create({
      permission_group_id: uuidv4(),
      name: "Field Inspectors Group",
      group_kind: "regional",
      region_id: region1Id,
      is_active: true,
    });
    console.log("  PASS: Permission group created in Region 1:", group1.name);

    // Same group name in Region 2
    const group2 = await PermissionGroup.create({
      permission_group_id: uuidv4(),
      name: "Field Inspectors Group",
      group_kind: "regional",
      region_id: region2Id,
      is_active: true,
    });
    console.log("  PASS: Identical permission group name allowed in Region 2:", group2.name);

    // Clean up
    await group1.destroy();
    await group2.destroy();
    await role1.destroy();
    await role2.destroy();
    await Region.destroy({ where: { region_id: [region1Id, region2Id] } });

    console.log("\n========================================================");
    console.log("  ALL REGIONAL RBAC ISOLATION TESTS PASSED!");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Verification failed:", err);
    try {
      await Region.destroy({ where: { region_id: [region1Id, region2Id] } });
    } catch {}
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
