const { sequelize, User, Company, CompanyStructure, CompanyBrandingSetting, Role, Permission } = require("../models");
const { v4: uuidv4 } = require("uuid");
const companyService = require("../services/companyService");
const companyStructureService = require("../services/companyStructureService");
const companyBrandingService = require("../services/companyBrandingService");

async function runVerification() {
  console.log("=== Starting Company Domain Verification ===");

  try {
    await sequelize.authenticate();
    console.log("✓ Database connected.");

    // 1. Test Company Creation with automatic branding
    const compA = await companyService.createCompany({
      name: `Test Mining Corp ${Date.now()}`,
      code: `TMC_${Date.now().toString().slice(-4)}`,
      email: `contact@testmining${Date.now()}.com`,
    });
    console.log("✓ Company A created successfully with ID:", compA.company_id);

    const brandingA = await companyBrandingService.resolveEffectiveCompanyBranding(compA.company_id);
    if (!brandingA || brandingA.company_id !== compA.company_id) {
      throw new Error("Company default branding was not created correctly.");
    }
    console.log("✓ Default branding verified for Company A.");

    const compB = await companyService.createCompany({
      name: `Test Petroleum Ltd ${Date.now()}`,
      code: `TPL_${Date.now().toString().slice(-4)}`,
      email: `contact@testpetro${Date.now()}.com`,
    });
    console.log("✓ Company B created successfully with ID:", compB.company_id);

    // 2. Test Company Structures
    const rootStructA = await companyStructureService.createCompanyStructure(compA.company_id, {
      name: "Exploration Division",
      code: "EXP_DIV",
    });
    console.log("✓ Root department in Company A created with level:", rootStructA.level);

    const childStructA = await companyStructureService.createCompanyStructure(compA.company_id, {
      parent_id: rootStructA.company_structure_id,
      name: "Geology Unit",
      code: "GEO_UNIT",
    });
    console.log("✓ Child department in Company A created with level:", childStructA.level);
    if (childStructA.level !== 2) {
      throw new Error(`Expected level 2 for child department, got ${childStructA.level}`);
    }

    // 3. Test Cross-Company Hierarchy Rejection
    let crossCompanyFailed = false;
    try {
      await companyStructureService.createCompanyStructure(compB.company_id, {
        parent_id: rootStructA.company_structure_id, // Belongs to Comp A!
        name: "Illegal Cross Division",
        code: "ILL_DIV",
      });
    } catch (err) {
      crossCompanyFailed = true;
      console.log("✓ Cross-company department parent correctly rejected:", err.message);
    }
    if (!crossCompanyFailed) {
      throw new Error("Cross-company department assignment should have failed!");
    }

    // 4. Test User Domain Mutual Exclusivity Constraint
    // Attempt to insert user with both company_id and region_id directly into DB
    let multiDomainUserFailed = false;
    try {
      await User.create({
        user_id: uuidv4(),
        full_name: "Multi Domain Violator",
        email: `violator_${Date.now()}@test.com`,
        password: "hashedpassword123",
        company_id: compA.company_id,
        region_id: "10000000-0000-4000-8000-000000000001", // Regional domain collision
      });
    } catch (err) {
      multiDomainUserFailed = true;
      console.log("✓ DB constraint chk_user_domain_exclusive correctly rejected multi-domain user:", err.message);
    }
    if (!multiDomainUserFailed) {
      throw new Error("Multi-domain user should have been rejected by DB constraint!");
    }

    // Attempt to insert user with valid company_id
    const validCompUser = await User.create({
      user_id: uuidv4(),
      full_name: "Valid Company Officer",
      email: `valid_officer_${Date.now()}@test.com`,
      password: "hashedpassword123",
      company_id: compA.company_id,
      company_structure_id: rootStructA.company_structure_id,
    });
    console.log("✓ Company user created successfully with ID:", validCompUser.user_id);

    // 5. Test Status Toggle
    const deactivatedComp = await companyService.toggleCompanyStatus(compA.company_id, false);
    if (deactivatedComp.is_active !== false) {
      throw new Error("Company status toggle to inactive failed");
    }
    console.log("✓ Company status toggle to false verified.");

    // Clean up test records
    await User.destroy({ where: { user_id: validCompUser.user_id }, force: true });
    await CompanyStructure.destroy({ where: { company_structure_id: [childStructA.company_structure_id, rootStructA.company_structure_id] }, force: true });
    await CompanyBrandingSetting.destroy({ where: { company_id: [compA.company_id, compB.company_id] }, force: true });
    await Company.destroy({ where: { company_id: [compA.company_id, compB.company_id] }, force: true });

    console.log("✓ Test records cleaned up.");
    console.log("=== All Company Domain Verifications PASSED Successfully! ===");
    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

runVerification();
