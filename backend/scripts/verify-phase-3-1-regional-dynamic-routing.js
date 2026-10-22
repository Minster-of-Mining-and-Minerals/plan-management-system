"use strict";

const db = require("../models");
const regionService = require("../services/regionService");
const regionalStructureService = require("../services/regionalStructureService");
const regionalBrandingService = require("../services/regionalBrandingService");
const structureScopeUtils = require("../utils/structureScopeUtils");
const { ROLE_SCOPE, SYSTEM_ROLES } = require("../constants/systemRoles");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  FAIL: ${testName}`);
    failedCount++;
  }
}

async function assertThrowsAsync(fn, testName, expectedSubstr) {
  try {
    await fn();
    console.error(`  FAIL: ${testName} (did not throw as expected)`);
    failedCount++;
  } catch (error) {
    if (expectedSubstr && !error.message.toLowerCase().includes(expectedSubstr.toLowerCase())) {
      console.error(`  FAIL: ${testName} (threw error '${error.message}', expected substring '${expectedSubstr}')`);
      failedCount++;
    } else {
      console.log(`  PASS: ${testName} (threw: "${error.message}")`);
      passedCount++;
    }
  }
}

async function runPhase31Tests() {
  console.log("\n========================================================");
  console.log("  PHASE 3.1: REGIONAL DYNAMIC ROUTING & PERMISSIONS");
  console.log("========================================================\n");

  const suffix = Math.floor(Math.random() * 100000);
  const codeA = `RO_A_${suffix}`;
  const codeB = `RO_B_${suffix}`;
  const codeInactive = `RO_INA_${suffix}`;

  let regionA;
  let regionB;
  let regionInactive;
  let deptA1;
  let deptA2;
  let deptB1;
  let userAAdmin;
  let userBAdmin;
  let userAViewer;
  let federalAdminExplicit;
  let federalAdminNone;

  try {
    // ----------------------------------------------------
    // 1. SETUP REGIONS & SEEDED BRANDING
    // ----------------------------------------------------
    console.log("[1] Setting up Test Regions & Regional Branding...");

    regionA = await regionService.createRegion({
      name: `Oromia Test Region ${suffix}`,
      code: codeA,
      description: "Regional Dynamic Routing Test A",
    });

    regionB = await regionService.createRegion({
      name: `Amhara Test Region ${suffix}`,
      code: codeB,
      description: "Regional Dynamic Routing Test B",
    });

    regionInactive = await regionService.createRegion({
      name: `Inactive Test Region ${suffix}`,
      code: codeInactive,
      description: "Inactive Region Test",
    });
    regionInactive = await regionService.setRegionActiveStatus(regionInactive.region_id, false);

    assert(regionA.region_id && regionB.region_id, "Test regions A and B created successfully");
    assert(regionInactive.is_active === false, "Inactive test region successfully deactivated");

    // Configure distinct branding
    await regionalBrandingService.updateRegionalBranding(regionA.region_id, {
      system_name_full: "Oromia Mineral Development Authority PMS",
      system_name_short: "OMDA PMS",
      primary_color: "#0f766e",
      secondary_color: "#0d9488",
      accent_color: "#f59e0b",
    });

    await regionalBrandingService.updateRegionalBranding(regionB.region_id, {
      system_name_full: "Amhara Mineral Resources Bureau PMS",
      system_name_short: "AMRB PMS",
      primary_color: "#1e3a8a",
      secondary_color: "#2563eb",
      accent_color: "#dc2626",
    });

    const brandingA = await regionalBrandingService.resolveEffectiveRegionalBranding(regionA.region_id);
    const brandingB = await regionalBrandingService.resolveEffectiveRegionalBranding(regionB.region_id);

    assert(brandingA.primary_color === "#0f766e", "Region A branding resolved distinct primary color #0f766e");
    assert(brandingB.primary_color === "#1e3a8a", "Region B branding resolved distinct primary color #1e3a8a");
    assert(brandingA.system_name_short === "OMDA PMS", "Region A system name resolved dynamically");
    assert(brandingB.system_name_short === "AMRB PMS", "Region B system name resolved dynamically");

    // ----------------------------------------------------
    // 2. SETUP DEPARTMENTS & PREVENT CROSS-REGION
    // ----------------------------------------------------
    console.log("\n[2] Setting up Regional Departments & Hierarchy Invariants...");

    deptA1 = await regionalStructureService.createRegionalStructure(regionA.region_id, {
      name: `Mineral Exploration Directorate ${suffix}`,
    });
    assert(deptA1.level === 1 && deptA1.region_id === regionA.region_id, "Region A Root department created");

    deptA2 = await regionalStructureService.createRegionalStructure(regionA.region_id, {
      name: `Geology Mapping Section ${suffix}`,
      parent_id: deptA1.regional_structure_id,
    });
    assert(deptA2.level === 2 && deptA2.parent_id === deptA1.regional_structure_id, "Region A Sub-department created under parent");

    deptB1 = await regionalStructureService.createRegionalStructure(regionB.region_id, {
      name: `Mining Operations Directorate ${suffix}`,
    });
    assert(deptB1.region_id === regionB.region_id, "Region B department created independently");

    // Cross-region parent relationship rejection
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.createRegionalStructure(regionA.region_id, {
          name: "Illegal Cross-Region Dept",
          parent_id: deptB1.regional_structure_id, // Parent belongs to Region B!
        });
      },
      "Cross-region parent department reference is rejected",
      "parent must belong to the same region"
    );

    // ----------------------------------------------------
    // 3. SETUP USERS & TEST ACCOUNTS
    // ----------------------------------------------------
    console.log("\n[3] Setting up Regional and Federal Test Accounts...");

    userAAdmin = await db.User.create({
      user_id: uuidv4(),
      full_name: `RegAdmin A ${suffix}`,
      email: `regadmin.a.${suffix}@test.mom.gov.et`,
      password: "hashedpassword123",
      region_id: regionA.region_id,
      regional_structure_id: deptA1.regional_structure_id,
      is_active: true,
      is_first_logged_in: false,
    });

    userBAdmin = await db.User.create({
      user_id: uuidv4(),
      full_name: `RegAdmin B ${suffix}`,
      email: `regadmin.b.${suffix}@test.mom.gov.et`,
      password: "hashedpassword123",
      region_id: regionB.region_id,
      regional_structure_id: deptB1.regional_structure_id,
      is_active: true,
      is_first_logged_in: false,
    });

    userAViewer = await db.User.create({
      user_id: uuidv4(),
      full_name: `RegViewer A ${suffix}`,
      email: `regviewer.a.${suffix}@test.mom.gov.et`,
      password: "hashedpassword123",
      region_id: regionA.region_id,
      is_active: true,
      is_first_logged_in: false,
    });

    const fedStructure = await db.GovernmentStructure.findOne({ where: { is_active: true } });

    federalAdminExplicit = await db.User.create({
      user_id: uuidv4(),
      full_name: `FedAdmin Explicit ${suffix}`,
      email: `fedadmin.explicit.${suffix}@test.mom.gov.et`,
      password: "hashedpassword123",
      government_structure_id: fedStructure?.government_structure_id || null,
      region_id: null,
      is_active: true,
      is_first_logged_in: false,
    });

    federalAdminNone = await db.User.create({
      user_id: uuidv4(),
      full_name: `FedAdmin None ${suffix}`,
      email: `fedadmin.none.${suffix}@test.mom.gov.et`,
      password: "hashedpassword123",
      government_structure_id: fedStructure?.government_structure_id || null,
      region_id: null,
      is_active: true,
      is_first_logged_in: false,
    });

    assert(userAAdmin.region_id === regionA.region_id, "User A bound to Region A");
    assert(userBAdmin.region_id === regionB.region_id, "User B bound to Region B");
    assert(federalAdminExplicit.region_id === null, "Federal explicit admin has no region assignment");

    // ----------------------------------------------------
    // 4. REGIONAL ACCOUNT PERMISSION & SCOPE BOUNDARY TESTS
    // ----------------------------------------------------
    console.log("\n[4] Testing Regional Account Permission & Data Boundary Isolation...");

    const reqUserA = {
      user: {
        user_id: userAAdmin.user_id,
        is_regional: true,
        is_federal: false,
        region_id: regionA.region_id,
        roles: ["Regional Administrator"],
        permissions: [
          "regional_dashboard:view",
          "regional_structures:read",
          "regional_structures:create",
          "regional_structures:update",
          "regional_structures:delete",
          "regional_structures:manage",
          "regional_users:read",
          "regional_users:create",
          "regional_users:update",
          "regional_users:delete",
          "regional_users:manage",
          "regional_users:assign_role",
          "regional_branding:read",
          "regional_branding:manage",
        ],
      },
    };

    const reqUserAViewer = {
      user: {
        user_id: userAViewer.user_id,
        is_regional: true,
        is_federal: false,
        region_id: regionA.region_id,
        roles: ["Regional Viewer"],
        permissions: [
          "regional_dashboard:view",
          "regional_structures:read",
          "regional_branding:read",
        ],
      },
    };

    // User A accessing own region A -> Allowed
    let userAOwnAllowed = false;
    try {
      structureScopeUtils.assertRegionAccessible(reqUserA, regionA.region_id, "read");
      userAOwnAllowed = true;
    } catch {
      userAOwnAllowed = false;
    }
    assert(userAOwnAllowed, "Regional User A can access own Region A");

    // User A accessing Region B -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertRegionAccessible(reqUserA, regionB.region_id, "read");
      },
      "Regional User A is strictly blocked from accessing Region B (Cross-Region Isolation)",
      "Access denied: you do not have permission to access another region"
    );

    // User A managing user in Region A -> Allowed
    let userAManageOwnAllowed = false;
    try {
      structureScopeUtils.assertUserManageable(userAViewer, reqUserA, [], "update");
      userAManageOwnAllowed = true;
    } catch {
      userAManageOwnAllowed = false;
    }
    assert(userAManageOwnAllowed, "Regional User A can manage users within own Region A");

    // User A managing user in Region B -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertUserManageable(userBAdmin, reqUserA, [], "update");
      },
      "Regional User A cannot manage users in Region B",
      "Access denied: you do not have permission to access another region"
    );

    // User A Viewer attempting user creation (missing regional_users:create) -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertRegionalUserManageable(userAAdmin, reqUserAViewer, "create");
      },
      "Regional Viewer without regional_users:create is denied management action",
      "missing regional user create permission"
    );

    // Regional User accessing Federal organizational structures -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertFederalAccessible(reqUserA);
      },
      "Regional User cannot access federal organizational resources",
      "Access denied: regional users cannot access federal organizational resources"
    );

    // ----------------------------------------------------
    // 5. FEDERAL ADMINISTRATORS WITH EXPLICIT REGIONAL PERMISSIONS
    // ----------------------------------------------------
    console.log("\n[5] Testing Federal Administrators Managing Regional Data...");

    const reqFedExplicit = {
      user: {
        user_id: federalAdminExplicit.user_id,
        is_regional: false,
        is_federal: true,
        roles: ["Federal Regional Manager"],
        permissions: [
          "regions:read",
          "regional_structures:read",
          "regional_structures:manage",
          "regional_users:read",
          "regional_users:manage",
        ],
      },
    };

    const reqFedNone = {
      user: {
        user_id: federalAdminNone.user_id,
        is_regional: false,
        is_federal: true,
        roles: ["Federal Planner"],
        permissions: ["dashboard:view", "plans:read"],
      },
    };

    // Federal admin with explicit regional permission can access regional data
    let fedExplicitAllowed = false;
    try {
      structureScopeUtils.assertRegionAccessible(reqFedExplicit, regionA.region_id, "read");
      fedExplicitAllowed = true;
    } catch {
      fedExplicitAllowed = false;
    }
    assert(fedExplicitAllowed, "Federal Admin with explicit regional permission CAN access Region A");

    // Federal admin with explicit permission can manage regional users
    let fedExplicitManageAllowed = false;
    try {
      structureScopeUtils.assertUserManageable(userAAdmin, reqFedExplicit, [], "update");
      fedExplicitManageAllowed = true;
    } catch {
      fedExplicitManageAllowed = false;
    }
    assert(fedExplicitManageAllowed, "Federal Admin with explicit regional permission CAN manage regional accounts");

    // Federal admin WITHOUT explicit regional permission is DENIED
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertRegionAccessible(reqFedNone, regionA.region_id, "read");
      },
      "Federal Admin WITHOUT regional permission is denied regional access",
      "Access denied: federal account lacks regional management permission"
    );

    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertUserManageable(userAAdmin, reqFedNone, [], "update");
      },
      "Federal Admin WITHOUT regional permission is denied managing regional accounts",
      "Access denied: federal account lacks regional user management permission"
    );

    // ----------------------------------------------------
    // 6. REGIONAL ROLE SCOPING & ROLE ASSIGNMENT INVARIANTS
    // ----------------------------------------------------
    console.log("\n[6] Testing Regional Role Assignment & Scope Invariants...");

    const regionalAdminRole = await db.Role.findOne({
      where: { scope: "regional", name: "Regional Administrator" },
    });
    const structureRole = await db.Role.findOne({
      where: { scope: "structure" },
    });

    assert(regionalAdminRole && regionalAdminRole.scope === "regional", "Seeded Regional Administrator role found with scope='regional'");

    // Regional role assignable to regional user -> Allowed
    let regRoleAssignable = false;
    try {
      structureScopeUtils.assertRegionalRoleAssignable(regionalAdminRole, reqUserA);
      regRoleAssignable = true;
    } catch {
      regRoleAssignable = false;
    }
    assert(regRoleAssignable, "Regional Administrator role is assignable to regional user");

    // Structure-scoped role assigned to regional user -> FORBIDDEN (403)
    if (structureRole) {
      await assertThrowsAsync(
        async () => {
          structureScopeUtils.assertRegionalRoleAssignable(structureRole, reqUserA);
        },
        "Structure-scoped role is rejected for regional user assignment",
        "only regional-scoped roles can be assigned to regional accounts"
      );
    }

    // ----------------------------------------------------
    // 7. INACTIVE REGION ACCESS REJECTION
    // ----------------------------------------------------
    console.log("\n[7] Testing Inactive Region Isolation...");

    await assertThrowsAsync(
      async () => {
        await regionalStructureService.createRegionalStructure(regionInactive.region_id, {
          name: "Test Dept In Inactive Region",
        });
      },
      "Cannot add departments to an inactive region",
      "Cannot add departments to an inactive region"
    );

  } catch (error) {
    console.error("Unexpected error during test execution:", error);
    failedCount++;
  } finally {
    // ----------------------------------------------------
    // 8. CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log("\n[8] Cleaning up Test Data...");
    try {
      if (userAAdmin) await userAAdmin.destroy({ force: true });
      if (userBAdmin) await userBAdmin.destroy({ force: true });
      if (userAViewer) await userAViewer.destroy({ force: true });
      if (federalAdminExplicit) await federalAdminExplicit.destroy({ force: true });
      if (federalAdminNone) await federalAdminNone.destroy({ force: true });

      if (deptA2) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptA2.regional_structure_id } });
      if (deptA1) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptA1.regional_structure_id } });
      if (deptB1) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptB1.regional_structure_id } });

      if (regionA) {
        await db.RegionalBrandingSetting.destroy({ where: { region_id: regionA.region_id } });
        await db.Region.destroy({ where: { region_id: regionA.region_id } });
      }
      if (regionB) {
        await db.RegionalBrandingSetting.destroy({ where: { region_id: regionB.region_id } });
        await db.Region.destroy({ where: { region_id: regionB.region_id } });
      }
      if (regionInactive) {
        await db.RegionalBrandingSetting.destroy({ where: { region_id: regionInactive.region_id } });
        await db.Region.destroy({ where: { region_id: regionInactive.region_id } });
      }
      console.log("  PASS: Test cleanup completed cleanly");
      passedCount++;
    } catch (cleanupErr) {
      console.error("  Warning: cleanup encountered an issue:", cleanupErr.message);
    }
  }

  console.log("\n========================================================");
  console.log(`  PHASE 3.1 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase31Tests().catch((err) => {
  console.error("Fatal error running Phase 3.1 tests:", err);
  process.exit(1);
});
