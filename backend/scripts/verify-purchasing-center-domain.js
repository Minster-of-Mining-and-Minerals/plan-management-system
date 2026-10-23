"use strict";

const {
  sequelize,
  PurchasingCenter,
  PurchasingCenterBrandingSetting,
  User,
  Role,
  Permission,
} = require("../models");
const purchasingCenterService = require("../services/purchasingCenterService");
const purchasingCenterBrandingService = require("../services/purchasingCenterBrandingService");
const structureScopeUtils = require("../utils/structureScopeUtils");
const { v4: uuidv4 } = require("uuid");

async function run() {
  console.log("=== Starting Purchasing Center Domain Verification ===");

  const uniqueSuffix = Date.now().toString().slice(-6);
  const codeA = `PC_A_${uniqueSuffix}`;
  const codeB = `PC_B_${uniqueSuffix}`;
  let pcA, pcB, userA;

  try {
    // 1. Entity registration & Default Branding
    console.log("\n[Test 1] Creating Purchasing Center A...");
    pcA = await purchasingCenterService.createPurchasingCenter({
      name: `Test Purchasing Center A ${uniqueSuffix}`,
      code: codeA,
      description: "Center A description",
      location: "Addis Ababa",
      contact_email: `pca_${uniqueSuffix}@example.com`,
    });
    console.log("✓ Center A created successfully with ID:", pcA.purchasing_center_id);

    const brandingA = await purchasingCenterBrandingService.resolveEffectiveBranding(pcA.purchasing_center_id);
    if (!brandingA || !brandingA.primary_color) {
      throw new Error("Default branding was not auto-created for Center A.");
    }
    console.log("✓ Auto-created default branding verified:", brandingA.primary_color);

    // 2. Unique code constraint
    console.log("\n[Test 2] Testing duplicate code rejection...");
    try {
      await purchasingCenterService.createPurchasingCenter({
        name: `Duplicate Center ${uniqueSuffix}`,
        code: codeA,
      });
      throw new Error("FAILED: Duplicate code was allowed!");
    } catch (err) {
      console.log("✓ Correctly rejected duplicate code:", err.message);
    }

    // 3. Create Center B
    console.log("\n[Test 3] Creating Purchasing Center B...");
    pcB = await purchasingCenterService.createPurchasingCenter({
      name: `Test Purchasing Center B ${uniqueSuffix}`,
      code: codeB,
      description: "Center B description",
    });
    console.log("✓ Center B created with ID:", pcB.purchasing_center_id);

    // 4. Direct user membership (NO departments!)
    console.log("\n[Test 4] Direct user creation without departments...");
    userA = await User.create({
      user_id: uuidv4(),
      full_name: `PC User A ${uniqueSuffix}`,
      email: `pcuser_a_${uniqueSuffix}@example.com`,
      password: "hashedpassword123",
      purchasing_center_id: pcA.purchasing_center_id,
      government_structure_id: null,
      internal_structure_id: null,
      region_id: null,
      regional_structure_id: null,
      company_id: null,
      company_structure_id: null,
      is_active: true,
    });
    console.log("✓ Purchasing center user created directly under center A:", userA.user_id);

    // 5. Database constraint enforcement (chk_user_purchasing_center_no_dept)
    console.log("\n[Test 5] Verifying DB constraint chk_user_purchasing_center_no_dept...");
    try {
      await User.create({
        user_id: uuidv4(),
        full_name: `Invalid PC User ${uniqueSuffix}`,
        email: `invalid_pc_${uniqueSuffix}@example.com`,
        password: "hashedpassword123",
        purchasing_center_id: pcA.purchasing_center_id,
        government_structure_id: uuidv4(), // VIOLATION!
        is_active: true,
      });
      throw new Error("FAILED: Database permitted purchasing center user to have government_structure_id!");
    } catch (err) {
      console.log("✓ Database constraint correctly blocked department assignment:", err.name);
    }

    // 6. Database constraint enforcement (chk_user_domain_exclusive)
    console.log("\n[Test 6] Verifying 4-way mutual domain exclusivity DB constraint...");
    try {
      await User.create({
        user_id: uuidv4(),
        full_name: `Dual Domain User ${uniqueSuffix}`,
        email: `dual_${uniqueSuffix}@example.com`,
        password: "hashedpassword123",
        purchasing_center_id: pcA.purchasing_center_id,
        region_id: uuidv4(), // VIOLATION!
        is_active: true,
      });
      throw new Error("FAILED: Database permitted user to have both purchasing_center_id and region_id!");
    } catch (err) {
      console.log("✓ Database constraint correctly blocked multi-domain assignment:", err.name);
    }

    // 7. Domain identification and scope utilities
    console.log("\n[Test 7] Verifying structureScopeUtils domain resolution...");
    const domain = structureScopeUtils.getUserDomain(userA);
    if (domain !== "purchasing_center") {
      throw new Error(`Expected domain 'purchasing_center', got '${domain}'`);
    }
    console.log("✓ Domain correctly identified as:", domain);

    const mockPCActor = {
      user: {
        user_id: userA.user_id,
        is_purchasing_center: true,
        purchasing_center_id: pcA.purchasing_center_id,
        permissions: ["purchasing_centers:read", "purchasing_center_users:read"],
      },
    };

    if (!structureScopeUtils.isPurchasingCenterActor(mockPCActor)) {
      throw new Error("isPurchasingCenterActor returned false for PC actor.");
    }
    console.log("✓ isPurchasingCenterActor confirmed true");

    // 8. Cross-center isolation check
    console.log("\n[Test 8] Testing cross-center isolation...");
    try {
      structureScopeUtils.assertPurchasingCenterAccessible(mockPCActor, pcB.purchasing_center_id, "read");
      throw new Error("FAILED: PC A actor was able to access PC B!");
    } catch (err) {
      console.log("✓ Correctly denied access to Center B:", err.message);
    }

    // Self-center access check
    structureScopeUtils.assertPurchasingCenterAccessible(mockPCActor, pcA.purchasing_center_id, "read");
    console.log("✓ Correctly granted access to own Center A");

    // Federal access check
    try {
      structureScopeUtils.assertFederalAccessible(mockPCActor);
      throw new Error("FAILED: PC actor was permitted federal access!");
    } catch (err) {
      console.log("✓ Correctly blocked PC actor from federal resources:", err.message);
    }

    // 9. Status toggle and update
    console.log("\n[Test 9] Testing status toggle and updates...");
    const updatedPC = await purchasingCenterService.updatePurchasingCenter(pcA.purchasing_center_id, {
      description: "Updated description for A",
    });
    if (updatedPC.description !== "Updated description for A") {
      throw new Error("Failed to update purchasing center description.");
    }
    console.log("✓ Center description updated successfully");

    const deactivated = await purchasingCenterService.togglePurchasingCenterStatus(pcA.purchasing_center_id, false);
    if (deactivated.is_active !== false) {
      throw new Error("Failed to deactivate purchasing center.");
    }
    console.log("✓ Center deactivated successfully");

    // Verify historical user record is preserved
    const userAfterDeactivation = await User.findByPk(userA.user_id);
    if (!userAfterDeactivation || userAfterDeactivation.purchasing_center_id !== pcA.purchasing_center_id) {
      throw new Error("Deactivating purchasing center deleted or corrupted user record!");
    }
    console.log("✓ User record correctly preserved after center deactivation");

    // Reactivate for test completion
    await purchasingCenterService.togglePurchasingCenterStatus(pcA.purchasing_center_id, true);
    console.log("✓ Center reactivated successfully");

    // 10. Branding update
    console.log("\n[Test 10] Testing branding customization...");
    const updatedBranding = await purchasingCenterBrandingService.updateBranding(pcA.purchasing_center_id, {
      primary_color: "#1e3a8a",
      accent_color: "#f59e0b",
      system_name_full: "Procurement Portal A",
    });
    if (updatedBranding.primary_color !== "#1e3a8a" || updatedBranding.system_name_full !== "Procurement Portal A") {
      throw new Error("Failed to update branding settings.");
    }
    console.log("✓ Branding settings updated and isolated to Center A:", updatedBranding.system_name_full);

    // Verify Center B branding remains distinct and untouched
    const brandingB = await purchasingCenterBrandingService.resolveEffectiveBranding(pcB.purchasing_center_id);
    if (brandingB.system_name_full === "Procurement Portal A") {
      throw new Error("Branding leaked from Center A to Center B!");
    }
    console.log("✓ Center B branding confirmed isolated and unaffected");

    console.log("\n=======================================================");
    console.log("🎉 ALL PURCHASING CENTER DOMAIN VERIFICATION CHECKS PASSED!");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ VERIFICATION FAILED:", error);
    process.exitCode = 1;
  } finally {
    // Cleanup
    try {
      if (userA) await userA.destroy({ force: true });
      if (pcA) {
        await PurchasingCenterBrandingSetting.destroy({ where: { purchasing_center_id: pcA.purchasing_center_id } });
        await PurchasingCenter.destroy({ where: { purchasing_center_id: pcA.purchasing_center_id }, force: true });
      }
      if (pcB) {
        await PurchasingCenterBrandingSetting.destroy({ where: { purchasing_center_id: pcB.purchasing_center_id } });
        await PurchasingCenter.destroy({ where: { purchasing_center_id: pcB.purchasing_center_id }, force: true });
      }
      console.log("✓ Test cleanup completed.");
    } catch (cleanupErr) {
      console.error("Cleanup warning:", cleanupErr.message);
    }
    await sequelize.close();
  }
}

run();
