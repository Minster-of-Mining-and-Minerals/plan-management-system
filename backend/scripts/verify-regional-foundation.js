"use strict";

const db = require("../models");
const regionService = require("../services/regionService");
const regionalStructureService = require("../services/regionalStructureService");
const regionalBrandingService = require("../services/regionalBrandingService");
const structureScopeUtils = require("../utils/structureScopeUtils");
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

async function runTests() {
  console.log("\n========================================================");
  console.log("  PHASE 3 REGIONAL FOUNDATION AUTOMATED VERIFICATION");
  console.log("========================================================\n");

  const testSuffix = Math.floor(Math.random() * 100000);
  const region1Code = `R1_${testSuffix}`;
  const region2Code = `R2_${testSuffix}`;

  let region1;
  let region2;
  let deptR1A;
  let deptR1B;
  let deptR2A;
  let regionalUser1;
  let regionalUser2;
  let federalUser;

  try {
    // ----------------------------------------------------
    // TEST SUITE 1: REGION REGISTRY & LIFECYCLE
    // ----------------------------------------------------
    console.log("[1] Testing Region Registry & Administration...");

    region1 = await regionService.createRegion({
      name: `Oromia Test Mining Bureau ${testSuffix}`,
      code: region1Code,
      description: "Automated Test Region 1",
    });
    assert(region1.region_id && region1.code === region1Code, "Region 1 registered successfully");

    region2 = await regionService.createRegion({
      name: `Amhara Test Mining Bureau ${testSuffix}`,
      code: region2Code,
      description: "Automated Test Region 2",
    });
    assert(region2.region_id && region2.code === region2Code, "Region 2 registered successfully");

    // Duplicate code prevention
    await assertThrowsAsync(
      async () => {
        await regionService.createRegion({
          name: `Duplicate Region ${testSuffix}`,
          code: region1Code,
        });
      },
      "Duplicate region code registration is rejected",
      "already exists"
    );

    // Duplicate name prevention
    await assertThrowsAsync(
      async () => {
        await regionService.createRegion({
          name: `Oromia Test Mining Bureau ${testSuffix}`,
          code: `OR_DUP_${testSuffix}`,
        });
      },
      "Duplicate region name registration is rejected",
      "already exists"
    );

    // ----------------------------------------------------
    // TEST SUITE 2: ORGANIZATIONAL STRUCTURE ISOLATION
    // ----------------------------------------------------
    console.log("\n[2] Testing Regional Department & Hierarchy Isolation...");

    deptR1A = await regionalStructureService.createRegionalStructure(region1.region_id, {
      name: "Licensing Directorate",
    });
    assert(deptR1A.level === 1 && deptR1A.region_id === region1.region_id, "Region 1 Root department created (Level 1)");

    deptR1B = await regionalStructureService.createRegionalStructure(region1.region_id, {
      name: "Large Scale Licensing Section",
      parent_id: deptR1A.regional_structure_id,
    });
    assert(deptR1B.level === 2 && deptR1B.parent_id === deptR1A.regional_structure_id, "Region 1 Sub-department created under Region 1 parent (Level 2)");

    deptR2A = await regionalStructureService.createRegionalStructure(region2.region_id, {
      name: "Geology Directorate",
    });
    assert(deptR2A.level === 1 && deptR2A.region_id === region2.region_id, "Region 2 Root department created independently");

    // MANDATORY ISOLATION: Cross-region parent reference is rejected
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.createRegionalStructure(region2.region_id, {
          name: "Invalid Cross-Region Dept",
          parent_id: deptR1A.regional_structure_id, // Parent belongs to Region 1!
        });
      },
      "Cross-region parent department assignment is rejected",
      "Parent must belong to the same region"
    );

    // Circular hierarchy prevention
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.updateRegionalStructure(deptR1A.regional_structure_id, {
          parent_id: deptR1B.regional_structure_id, // would create a loop A -> B -> A
        });
      },
      "Circular department hierarchy is rejected",
      "Circular department hierarchy detected"
    );

    // Same-name duplicate under same parent level
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.createRegionalStructure(region1.region_id, {
          name: "Licensing Directorate", // Duplicate under root
        });
      },
      "Duplicate department name under same parent is rejected",
      "already exists under this parent level"
    );

    // ----------------------------------------------------
    // TEST SUITE 3: ACCOUNT-DOMAIN SEPARATION & DB CONSTRAINTS
    // ----------------------------------------------------
    console.log("\n[3] Testing Account-Domain Separation & Database CHECK Constraints...");

    // Find an existing federal government structure
    const fedStructure = await db.GovernmentStructure.findOne();
    assert(!!fedStructure, "Existing federal GovernmentStructure found for isolation testing");

    // DB Constraint verification: An account cannot have BOTH government_structure_id AND region_id
    await assertThrowsAsync(
      async () => {
        await db.User.create({
          user_id: uuidv4(),
          full_name: "Invalid Dual Domain User",
          email: `dual_domain_${testSuffix}@example.com`,
          password: "password123",
          government_structure_id: fedStructure.government_structure_id,
          region_id: region1.region_id, // VIOLATION!
          is_active: true,
          is_first_logged_in: false,
        });
      },
      "Database CHECK constraint (chk_user_domain_exclusive) blocks dual-domain assignment",
      "chk_user_domain_exclusive"
    );

    // Create valid Regional User 1 (pinned to Region 1)
    regionalUser1 = await db.User.create({
      user_id: uuidv4(),
      full_name: "Regional Officer 1",
      email: `reg1_${testSuffix}@oromia.gov.et`,
      password: "password123",
      region_id: region1.region_id,
      regional_structure_id: deptR1A.regional_structure_id,
      government_structure_id: null,
      internal_structure_id: null,
      is_active: true,
      is_first_logged_in: false,
    });
    assert(regionalUser1.region_id === region1.region_id, "Valid Regional User 1 created in Region 1");

    // Create valid Regional User 2 (pinned to Region 2)
    regionalUser2 = await db.User.create({
      user_id: uuidv4(),
      full_name: "Regional Officer 2",
      email: `reg2_${testSuffix}@amhara.gov.et`,
      password: "password123",
      region_id: region2.region_id,
      regional_structure_id: deptR2A.regional_structure_id,
      government_structure_id: null,
      internal_structure_id: null,
      is_active: true,
      is_first_logged_in: false,
    });
    assert(regionalUser2.region_id === region2.region_id, "Valid Regional User 2 created in Region 2");

    // Create valid Federal User
    federalUser = await db.User.create({
      user_id: uuidv4(),
      full_name: "Federal Planner",
      email: `fed_${testSuffix}@mines.gov.et`,
      password: "password123",
      government_structure_id: fedStructure.government_structure_id,
      region_id: null,
      regional_structure_id: null,
      is_active: true,
      is_first_logged_in: false,
    });
    assert(federalUser.government_structure_id && !federalUser.region_id, "Valid Federal User created without region assignment");

    // Assigning regional user to department in another region is rejected by service
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.assignUsersToRegionalStructure(deptR2A.regional_structure_id, [
          regionalUser1.user_id, // User is in Region 1, department is in Region 2!
        ]);
      },
      "Assigning user to a department in another region is rejected",
      "belongs to a different domain or region"
    );

    // Assigning federal user to a regional department is rejected by service
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.assignUsersToRegionalStructure(deptR1A.regional_structure_id, [
          federalUser.user_id, // Federal user!
        ]);
      },
      "Assigning federal user to a regional department is rejected",
      "is a federal user and cannot be assigned to a regional department"
    );

    // ----------------------------------------------------
    // TEST SUITE 4: DOMAIN-AWARE AUTHORIZATION SCOPING HELPERS
    // ----------------------------------------------------
    console.log("\n[4] Testing Domain-Aware Authorization & Scoping Helpers...");

    const mockRegionalReq1 = {
      user: {
        user_id: regionalUser1.user_id,
        is_regional: true,
        is_federal: false,
        region_id: region1.region_id,
        roles: ["User"],
        permissions: ["regional_users:update", "regional_users:manage", "regional_users:read"],
      },
    };

    const mockRegionalReq2 = {
      user: {
        user_id: regionalUser2.user_id,
        is_regional: true,
        is_federal: false,
        region_id: region2.region_id,
        roles: ["User"],
      },
    };

    const mockFederalReq = {
      user: {
        user_id: federalUser.user_id,
        is_regional: false,
        is_federal: true,
        government_structure_id: fedStructure.government_structure_id,
        roles: ["User"],
      },
    };

    const mockSuperAdminReq = {
      user: {
        user_id: "00000000-0000-0000-0000-000000000001",
        is_regional: false,
        is_federal: true,
        government_structure_id: null,
        roles: ["Super Admin"],
      },
    };

    // Regional actor 1 accessing their own region -> Allowed
    let reg1Allowed = false;
    try {
      structureScopeUtils.assertRegionAccessible(mockRegionalReq1, region1.region_id);
      reg1Allowed = true;
    } catch (e) {
      reg1Allowed = false;
    }
    assert(reg1Allowed, "Regional User 1 can access own Region 1");

    // Regional actor 1 accessing Region 2 -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertRegionAccessible(mockRegionalReq1, region2.region_id);
      },
      "Regional User 1 is blocked from accessing Region 2 (Cross-region isolation)",
      "Access denied"
    );

    // Regional actor 1 accessing Federal structure -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertFederalAccessible(mockRegionalReq1);
      },
      "Regional User 1 is blocked from accessing Federal organizational resources",
      "Access denied: regional users cannot access federal organizational resources"
    );

    // Federal ordinary user accessing Regional resource -> FORBIDDEN (403)
    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertRegionAccessible(mockFederalReq, region1.region_id);
      },
      "Federal User is blocked from accessing Regional resources",
      "Access denied: federal account lacks regional management permission"
    );

    // Super Admin accessing both Federal and Regional -> Allowed
    let saRegionAllowed = false;
    try {
      structureScopeUtils.assertRegionAccessible(mockSuperAdminReq, region1.region_id);
      structureScopeUtils.assertRegionAccessible(mockSuperAdminReq, region2.region_id);
      structureScopeUtils.assertFederalAccessible(mockSuperAdminReq);
      saRegionAllowed = true;
    } catch (e) {
      saRegionAllowed = false;
    }
    assert(saRegionAllowed, "Super Admin can access both regional and federal domains");

    // Target user manageability isolation
    let canManageOwnRegional = false;
    try {
      structureScopeUtils.assertUserManageable(regionalUser1, mockRegionalReq1, []);
      canManageOwnRegional = true;
    } catch (e) {
      canManageOwnRegional = false;
    }
    assert(canManageOwnRegional, "Regional User can manage users within their own region");

    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertUserManageable(regionalUser2, mockRegionalReq1, []);
      },
      "Regional User 1 cannot manage user from Region 2",
      "Access denied"
    );

    await assertThrowsAsync(
      async () => {
        structureScopeUtils.assertUserManageable(federalUser, mockRegionalReq1, []);
      },
      "Regional User 1 cannot manage federal user",
      "Access denied"
    );

    // ----------------------------------------------------
    // TEST SUITE 5: INDEPENDENT BRANDING & SETTINGS
    // ----------------------------------------------------
    console.log("\n[5] Testing Independent Regional Branding & Injection Prevention...");

    const r1BrandingBefore = await regionalBrandingService.resolveEffectiveRegionalBranding(region1.region_id);
    assert(r1BrandingBefore.region_name === region1.name, "Initial Region 1 branding resolved");

    // Update Region 1 branding with custom colors
    const r1Updated = await regionalBrandingService.updateRegionalBranding(region1.region_id, {
      system_name_full: "Customized Oromia Mining PMS",
      primary_color: "#1E3A8A",
      secondary_color: "#047857",
      accent_color: "#B45309",
    });
    assert(r1Updated.primary_color === "#1E3A8A", "Region 1 custom primary color saved");
    assert(r1Updated.css_variables["--primary"] !== undefined, "Region 1 CSS variables dynamically generated");

    // Verify Region 2 branding remained completely unchanged
    const r2Branding = await regionalBrandingService.resolveEffectiveRegionalBranding(region2.region_id);
    assert(r2Branding.primary_color !== "#1E3A8A", "Region 2 branding is isolated and unaffected by Region 1 changes");

    // CSS injection prevention: reject invalid hex color strings
    await assertThrowsAsync(
      async () => {
        await regionalBrandingService.updateRegionalBranding(region1.region_id, {
          primary_color: "red; } * { display: none } /* malicious */",
        });
      },
      "CSS injection attempt in primary_color is rejected by validator",
      "Invalid color"
    );

    // ----------------------------------------------------
    // TEST SUITE 6: DEACTIVATION LIFECYCLE SAFETY
    // ----------------------------------------------------
    console.log("\n[6] Testing Deactivation Lifecycle & Safe Deletion...");

    // Deactivate Region 1
    await regionService.setRegionActiveStatus(region1.region_id, false);
    const deactivatedRegion = await regionService.getRegionById(region1.region_id);
    assert(deactivatedRegion.is_active === false, "Region 1 deactivated successfully");

    // New departments cannot be created under inactive region
    await assertThrowsAsync(
      async () => {
        await regionalStructureService.createRegionalStructure(region1.region_id, {
          name: "Should Fail Under Inactive Region",
        });
      },
      "Cannot add departments to a deactivated region",
      "Cannot add departments to an inactive region"
    );

    // Safe deletion: Deleting a region with active users is blocked
    await assertThrowsAsync(
      async () => {
        await regionService.deleteRegion(region1.region_id);
      },
      "Deleting a region with active accounts is blocked (prevents orphan data)",
      "Cannot delete region"
    );

    // Reactivate Region 1
    await regionService.setRegionActiveStatus(region1.region_id, true);
    assert((await regionService.getRegionById(region1.region_id)).is_active === true, "Region 1 reactivated successfully");

  } finally {
    // Cleanup test records
    console.log("\n[7] Cleaning up test records...");
    if (regionalUser1) await db.User.destroy({ where: { user_id: regionalUser1.user_id }, force: true });
    if (regionalUser2) await db.User.destroy({ where: { user_id: regionalUser2.user_id }, force: true });
    if (federalUser) await db.User.destroy({ where: { user_id: federalUser.user_id }, force: true });

    if (deptR1B) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptR1B.regional_structure_id }, force: true });
    if (deptR1A) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptR1A.regional_structure_id }, force: true });
    if (deptR2A) await db.RegionalStructure.destroy({ where: { regional_structure_id: deptR2A.regional_structure_id }, force: true });

    if (region1) {
      await db.RegionalBrandingSetting.destroy({ where: { region_id: region1.region_id }, force: true });
      await db.Region.destroy({ where: { region_id: region1.region_id }, force: true });
    }
    if (region2) {
      await db.RegionalBrandingSetting.destroy({ where: { region_id: region2.region_id }, force: true });
      await db.Region.destroy({ where: { region_id: region2.region_id }, force: true });
    }
    console.log("  Cleaned up all temporary test records.");
  }

  console.log("\n========================================================");
  console.log(`  VERIFICATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Verification script execution failed:", err);
  process.exit(1);
});
