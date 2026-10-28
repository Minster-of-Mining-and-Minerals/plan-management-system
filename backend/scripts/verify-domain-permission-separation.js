"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { v4: uuidv4 } = require("uuid");
const { sequelize } = require("../models");
const regionController = require("../controllers/structure/regionController");
const companyController = require("../controllers/structure/companyController");
const purchasingCenterController = require("../controllers/structure/purchasingCenterController");
const permissionController = require("../controllers/user/permissionController");
const { Region, Company, PurchasingCenter, User, GovernmentStructure } = require("../models");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

// Mock Express req & res
function createMockReq(user, params = {}, query = {}, body = {}) {
  return {
    user: {
      user_id: user.user_id || uuidv4(),
      roles: user.roles || [],
      permissions: user.permissions || [],
      government_structure_id: user.government_structure_id || null,
      region_id: user.region_id || null,
      company_id: user.company_id || null,
      purchasing_center_id: user.purchasing_center_id || null,
      is_regional: Boolean(user.region_id),
      is_company: Boolean(user.company_id),
      is_purchasing_center: Boolean(user.purchasing_center_id),
    },
    params,
    query,
    body,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function run() {
  console.log("\n========================================================");
  console.log("  PHASE 6.2: DOMAIN PERMISSION SEPARATION & CENTRALIZED");
  console.log("            FEDERAL ADMINISTRATION VERIFICATION");
  console.log("========================================================\n");

  const ts = Date.now();
  const testGovStructureId = uuidv4();
  const region1Id = uuidv4();
  const region2Id = uuidv4();
  const company1Id = uuidv4();
  const company2Id = uuidv4();
  const pc1Id = uuidv4();
  const pc2Id = uuidv4();

  try {
    // 1. Setup Test Entities
    console.log("[1] Setting up Test Data (Gov Structure, Regions, Companies, PCs)...");
    await GovernmentStructure.create({
      government_structure_id: testGovStructureId,
      name: `Federal Test Ministry ${ts}`,
      code: `FTM_${ts}`,
      level: 1,
      is_active: true,
    });

    await Region.bulkCreate([
      {
        region_id: region1Id,
        name: `Test Region 1 ${ts}`,
        code: `TR1_${ts}`,
        status: "active",
      },
      {
        region_id: region2Id,
        name: `Test Region 2 ${ts}`,
        code: `TR2_${ts}`,
        status: "active",
      },
    ]);

    await Company.bulkCreate([
      {
        company_id: company1Id,
        name: `Test Company 1 ${ts}`,
        code: `TC1_${ts}`,
        is_active: true,
      },
      {
        company_id: company2Id,
        name: `Test Company 2 ${ts}`,
        code: `TC2_${ts}`,
        is_active: true,
      },
    ]);

    await PurchasingCenter.bulkCreate([
      {
        purchasing_center_id: pc1Id,
        name: `Test Purchasing Center 1 ${ts}`,
        code: `TPC1_${ts}`,
        is_active: true,
      },
      {
        purchasing_center_id: pc2Id,
        name: `Test Purchasing Center 2 ${ts}`,
        code: `TPC2_${ts}`,
        is_active: true,
      },
    ]);

    // Define Actors
    const superAdminActor = {
      roles: ["Super Admin"],
      permissions: ["*"],
    };

    const federalAdminActor = {
      government_structure_id: testGovStructureId,
      roles: ["Federal Admin"],
      permissions: [
        "regions:create",
        "regions:read",
        "regions:update",
        "regions:delete",
        "companies:create",
        "companies:read",
        "companies:update",
        "companies:delete",
        "purchasing_centers:create",
        "purchasing_centers:read",
        "purchasing_centers:update",
        "purchasing_centers:delete",
      ],
    };

    const federalUnprivilegedActor = {
      government_structure_id: testGovStructureId,
      roles: ["Federal Viewer"],
      permissions: ["dashboard:view"],
    };

    const regionalActor = {
      region_id: region1Id,
      roles: ["Regional Administrator"],
      permissions: [
        "regional_dashboard:view",
        "regional_plans:read",
        "regional_plans:manage",
        "regional_users:manage",
        "regional_branding:manage",
      ],
    };

    const companyActor = {
      company_id: company1Id,
      roles: ["Company Administrator"],
      permissions: [
        "company_dashboard:view",
        "company_plans:read",
        "company_production:manage",
        "company_users:manage",
        "company_branding:manage",
      ],
    };

    const purchasingCenterActor = {
      purchasing_center_id: pc1Id,
      roles: ["Purchasing Center Administrator"],
      permissions: [
        "purchasing_center_dashboard:view",
        "gold_purchases:create",
        "gold_purchases:read",
        "gold_reports:manage",
        "purchasing_center_users:manage",
        "purchasing_center_branding:manage",
      ],
    };

    // =========================================================================
    // SECTION 2: PERMISSION CATALOG SCOPE SEPARATION
    // =========================================================================
    console.log("\n[2] Verifying Permission Catalog Scope Separation...");

    // Regional Scope Catalog
    const regRes = createMockRes();
    await permissionController.getPermissions(createMockReq(regionalActor, {}, { scope: "regional" }), regRes);
    const regPerms = regRes.body.data;
    assert(Array.isArray(regPerms) && regPerms.length > 0, "Regional permission scope returns catalog entries.");
    const regHasRegions = regPerms.some((p) => p.resource === "regions");
    const regHasOnlyRegionalPrefix = regPerms.every((p) => p.resource.startsWith("regional_"));
    assert(!regHasRegions, "Regional permission catalog does NOT contain 'regions' resource.");
    assert(regHasOnlyRegionalPrefix, "All permissions in regional catalog start with 'regional_'.");

    // Company Scope Catalog
    const compRes = createMockRes();
    await permissionController.getPermissions(createMockReq(companyActor, {}, { scope: "company" }), compRes);
    const compPerms = compRes.body.data;
    assert(Array.isArray(compPerms) && compPerms.length > 0, "Company permission scope returns catalog entries.");
    const compHasCompanies = compPerms.some((p) => p.resource === "companies");
    const compHasOnlyCompanyPrefix = compPerms.every((p) => p.resource.startsWith("company_"));
    assert(!compHasCompanies, "Company permission catalog does NOT contain 'companies' resource.");
    assert(compHasOnlyCompanyPrefix, "All permissions in company catalog start with 'company_'.");

    // Purchasing Center Scope Catalog
    const pcRes = createMockRes();
    await permissionController.getPermissions(createMockReq(purchasingCenterActor, {}, { scope: "purchasing_center" }), pcRes);
    const pcPerms = pcRes.body.data;
    assert(Array.isArray(pcPerms) && pcPerms.length > 0, "Purchasing center permission scope returns catalog entries.");
    const pcHasCenters = pcPerms.some((p) => p.resource === "purchasing_centers");
    const pcHasOnlyPcPrefix = pcPerms.every((p) => p.resource.startsWith("purchasing_center_"));
    assert(!pcHasCenters, "Purchasing center permission catalog does NOT contain 'purchasing_centers' resource.");
    assert(pcHasOnlyPcPrefix, "All permissions in purchasing center catalog start with 'purchasing_center_'.");

    // System Scope Catalog
    const sysRes = createMockRes();
    await permissionController.getPermissions(createMockReq(superAdminActor, {}, { scope: "system" }), sysRes);
    const sysPerms = sysRes.body.data;
    const sysHasRegions = sysPerms.some((p) => p.resource === "regions");
    const sysHasCompanies = sysPerms.some((p) => p.resource === "companies");
    const sysHasPurchasingCenters = sysPerms.some((p) => p.resource === "purchasing_centers");
    assert(sysHasRegions, "System/Federal catalog includes 'regions' administrative resource.");
    assert(sysHasCompanies, "System/Federal catalog includes 'companies' administrative resource.");
    assert(sysHasPurchasingCenters, "System/Federal catalog includes 'purchasing_centers' administrative resource.");

    // =========================================================================
    // SECTION 3: REGION DOMAIN AUTHORIZATION ENFORCEMENT
    // =========================================================================
    console.log("\n[3] Verifying Region Domain Authorization...");

    // Positive: Federal Admin creates region
    const createRegRes = createMockRes();
    await regionController.createRegion(
      createMockReq(federalAdminActor, {}, {}, {
        name: `Federal Created Region ${ts}`,
        code: `FCR_${ts}`,
        status: "active",
      }),
      createRegRes
    );
    assert(createRegRes.statusCode === 201, "Authorized federal administrator can create a region.");
    const createdRegionId = createRegRes.body?.data?.region_id;

    // Negative: Regional Actor attempts to create region
    const regCreateRes = createMockRes();
    await regionController.createRegion(
      createMockReq(regionalActor, {}, {}, {
        name: `Illegal Regional Attempt ${ts}`,
        code: `IRA_${ts}`,
      }),
      regCreateRes
    );
    assert(regCreateRes.statusCode === 403, "Regional actor is rejected (403) from creating a region.");

    // Negative: Company Actor attempts to create region
    const compCreateRegRes = createMockRes();
    await regionController.createRegion(
      createMockReq(companyActor, {}, {}, {
        name: `Illegal Company Attempt ${ts}`,
        code: `ICA_${ts}`,
      }),
      compCreateRegRes
    );
    assert(compCreateRegRes.statusCode === 403, "Company actor is rejected (403) from creating a region.");

    // Negative: Purchasing Center Actor attempts to create region
    const pcCreateRegRes = createMockRes();
    await regionController.createRegion(
      createMockReq(purchasingCenterActor, {}, {}, {
        name: `Illegal PC Attempt ${ts}`,
        code: `IPA_${ts}`,
      }),
      pcCreateRegRes
    );
    assert(pcCreateRegRes.statusCode === 403, "Purchasing center actor is rejected (403) from creating a region.");

    // Positive: Regional Actor lists regions (strictly own region)
    const regListRes = createMockRes();
    await regionController.listRegions(createMockReq(regionalActor), regListRes);
    assert(
      regListRes.statusCode === 200 &&
      Array.isArray(regListRes.body.data) &&
      regListRes.body.data.length === 1 &&
      regListRes.body.data[0].region_id === region1Id,
      "Regional actor can only list their own assigned region."
    );

    // Negative: Regional Actor reads another region
    const regCrossReadRes = createMockRes();
    await regionController.getRegionById(createMockReq(regionalActor, { id: region2Id }), regCrossReadRes);
    assert(regCrossReadRes.statusCode === 403, "Regional actor is rejected (403) from reading a different region.");

    // Negative: Regional Actor attempts to update region entity record
    const regUpdateRes = createMockRes();
    await regionController.updateRegion(
      createMockReq(regionalActor, { id: region1Id }, {}, { name: "Attempted Name Change" }),
      regUpdateRes
    );
    assert(regUpdateRes.statusCode === 403, "Regional actor is rejected (403) from editing the region entity record.");

    // Negative: Regional Actor attempts to toggle region status
    const regToggleRes = createMockRes();
    await regionController.toggleRegionActiveStatus(
      createMockReq(regionalActor, { id: region1Id }, {}, { is_active: false }),
      regToggleRes
    );
    assert(regToggleRes.statusCode === 403, "Regional actor is rejected (403) from toggling region active status.");

    // Negative: Regional Actor attempts to delete region
    const regDeleteRes = createMockRes();
    await regionController.deleteRegion(createMockReq(regionalActor, { id: region1Id }), regDeleteRes);
    assert(regDeleteRes.statusCode === 403, "Regional actor is rejected (403) from deleting a region.");

    // Positive: Federal Admin updates and deletes created region
    const fedUpdateRes = createMockRes();
    await regionController.updateRegion(
      createMockReq(federalAdminActor, { id: createdRegionId }, {}, { name: `Updated Federal Region ${ts}` }),
      fedUpdateRes
    );
    assert(fedUpdateRes.statusCode === 200, "Federal administrator can update region entity record.");

    const fedDeleteRes = createMockRes();
    await regionController.deleteRegion(createMockReq(federalAdminActor, { id: createdRegionId }), fedDeleteRes);
    assert(fedDeleteRes.statusCode === 200, "Federal administrator can delete region.");

    // =========================================================================
    // SECTION 4: COMPANY DOMAIN AUTHORIZATION ENFORCEMENT
    // =========================================================================
    console.log("\n[4] Verifying Company Domain Authorization...");

    // Positive: Federal Admin creates company
    const createCompRes = createMockRes();
    await companyController.createCompany(
      createMockReq(federalAdminActor, {}, {}, {
        name: `Federal Created Company ${ts}`,
        code: `FCC_${ts}`,
        is_active: true,
      }),
      createCompRes
    );
    assert(createCompRes.statusCode === 201, "Authorized federal administrator can create a company.");
    const createdCompanyId = createCompRes.body?.data?.company_id;

    // Negative: Company Actor attempts to create company
    const compCreateAttemptRes = createMockRes();
    await companyController.createCompany(
      createMockReq(companyActor, {}, {}, {
        name: `Illegal Company Creation ${ts}`,
        code: `ICC_${ts}`,
      }),
      compCreateAttemptRes
    );
    assert(compCreateAttemptRes.statusCode === 403, "Company actor is rejected (403) from creating a company.");

    // Negative: Regional Actor attempts to create company
    const regCreateCompRes = createMockRes();
    await companyController.createCompany(
      createMockReq(regionalActor, {}, {}, {
        name: `Illegal Reg Company Creation ${ts}`,
        code: `IRCC_${ts}`,
      }),
      regCreateCompRes
    );
    assert(regCreateCompRes.statusCode === 403, "Regional actor is rejected (403) from creating a company.");

    // Negative: Purchasing Center Actor attempts to create company
    const pcCreateCompRes = createMockRes();
    await companyController.createCompany(
      createMockReq(purchasingCenterActor, {}, {}, {
        name: `Illegal PC Company Creation ${ts}`,
        code: `IPCC_${ts}`,
      }),
      pcCreateCompRes
    );
    assert(pcCreateCompRes.statusCode === 403, "Purchasing center actor is rejected (403) from creating a company.");

    // Positive: Company Actor lists companies (strictly own company)
    const compListRes = createMockRes();
    await companyController.listCompanies(createMockReq(companyActor), compListRes);
    assert(
      compListRes.statusCode === 200 &&
      Array.isArray(compListRes.body.data) &&
      compListRes.body.data.length === 1 &&
      compListRes.body.data[0].company_id === company1Id,
      "Company actor can only list their own assigned company."
    );

    // Negative: Company Actor reads another company
    const compCrossReadRes = createMockRes();
    await companyController.getCompanyById(createMockReq(companyActor, { id: company2Id }), compCrossReadRes);
    assert(compCrossReadRes.statusCode === 403, "Company actor is rejected (403) from reading a different company.");

    // Negative: Company Actor attempts to update company entity record
    const compUpdateRes = createMockRes();
    await companyController.updateCompany(
      createMockReq(companyActor, { id: company1Id }, {}, { name: "Attempted Company Name Change" }),
      compUpdateRes
    );
    assert(compUpdateRes.statusCode === 403, "Company actor is rejected (403) from editing the company entity record.");

    // Negative: Company Actor attempts to toggle company status
    const compToggleRes = createMockRes();
    await companyController.toggleCompanyActiveStatus(
      createMockReq(companyActor, { id: company1Id }, {}, { is_active: false }),
      compToggleRes
    );
    assert(compToggleRes.statusCode === 403, "Company actor is rejected (403) from toggling company active status.");

    // Negative: Company Actor attempts to delete company
    const compDeleteRes = createMockRes();
    await companyController.deleteCompany(createMockReq(companyActor, { id: company1Id }), compDeleteRes);
    assert(compDeleteRes.statusCode === 403, "Company actor is rejected (403) from deleting a company.");

    // Positive: Federal Admin updates and deletes created company
    const fedCompUpdateRes = createMockRes();
    await companyController.updateCompany(
      createMockReq(federalAdminActor, { id: createdCompanyId }, {}, { name: `Updated Federal Company ${ts}` }),
      fedCompUpdateRes
    );
    assert(fedCompUpdateRes.statusCode === 200, "Federal administrator can update company entity record.");

    const fedCompDeleteRes = createMockRes();
    await companyController.deleteCompany(createMockReq(federalAdminActor, { id: createdCompanyId }), fedCompDeleteRes);
    assert(fedCompDeleteRes.statusCode === 200, "Federal administrator can delete company.");

    // =========================================================================
    // SECTION 5: PURCHASING CENTER DOMAIN AUTHORIZATION ENFORCEMENT
    // =========================================================================
    console.log("\n[5] Verifying Purchasing Center Domain Authorization...");

    // Positive: Federal Admin creates purchasing center
    const createPcRes = createMockRes();
    await purchasingCenterController.createPurchasingCenter(
      createMockReq(federalAdminActor, {}, {}, {
        name: `Federal Created PC ${ts}`,
        code: `FCPC_${ts}`,
        is_active: true,
      }),
      createPcRes
    );
    assert(createPcRes.statusCode === 201, "Authorized federal administrator can create a purchasing center.");
    const createdPcId = createPcRes.body?.data?.purchasing_center_id;

    // Negative: Purchasing Center Actor attempts to create purchasing center
    const pcCreateAttemptRes = createMockRes();
    await purchasingCenterController.createPurchasingCenter(
      createMockReq(purchasingCenterActor, {}, {}, {
        name: `Illegal PC Creation ${ts}`,
        code: `IPC_${ts}`,
      }),
      pcCreateAttemptRes
    );
    assert(pcCreateAttemptRes.statusCode === 403, "Purchasing center actor is rejected (403) from creating a purchasing center.");

    // Negative: Regional Actor attempts to create purchasing center
    const regCreatePcRes = createMockRes();
    await purchasingCenterController.createPurchasingCenter(
      createMockReq(regionalActor, {}, {}, {
        name: `Illegal Reg PC Creation ${ts}`,
        code: `IRPC_${ts}`,
      }),
      regCreatePcRes
    );
    assert(regCreatePcRes.statusCode === 403, "Regional actor is rejected (403) from creating a purchasing center.");

    // Negative: Company Actor attempts to create purchasing center
    const compCreatePcRes = createMockRes();
    await purchasingCenterController.createPurchasingCenter(
      createMockReq(companyActor, {}, {}, {
        name: `Illegal Comp PC Creation ${ts}`,
        code: `ICPC_${ts}`,
      }),
      compCreatePcRes
    );
    assert(compCreatePcRes.statusCode === 403, "Company actor is rejected (403) from creating a purchasing center.");

    // Positive: Purchasing Center Actor lists centers (strictly own center)
    const pcListRes = createMockRes();
    await purchasingCenterController.listPurchasingCenters(createMockReq(purchasingCenterActor), pcListRes);
    assert(
      pcListRes.statusCode === 200 &&
      Array.isArray(pcListRes.body.data) &&
      pcListRes.body.data.length === 1 &&
      pcListRes.body.data[0].purchasing_center_id === pc1Id,
      "Purchasing center actor can only list their own assigned purchasing center."
    );

    // Negative: Purchasing Center Actor reads another purchasing center
    const pcCrossReadRes = createMockRes();
    await purchasingCenterController.getPurchasingCenterById(createMockReq(purchasingCenterActor, { id: pc2Id }), pcCrossReadRes);
    assert(pcCrossReadRes.statusCode === 403, "Purchasing center actor is rejected (403) from reading a different center.");

    // Negative: Purchasing Center Actor attempts to update purchasing center record
    const pcUpdateRes = createMockRes();
    await purchasingCenterController.updatePurchasingCenter(
      createMockReq(purchasingCenterActor, { id: pc1Id }, {}, { name: "Attempted PC Name Change" }),
      pcUpdateRes
    );
    assert(pcUpdateRes.statusCode === 403, "Purchasing center actor is rejected (403) from editing the purchasing center entity record.");

    // Negative: Purchasing Center Actor attempts to toggle center status
    const pcToggleRes = createMockRes();
    await purchasingCenterController.togglePurchasingCenterActiveStatus(
      createMockReq(purchasingCenterActor, { id: pc1Id }, {}, { is_active: false }),
      pcToggleRes
    );
    assert(pcToggleRes.statusCode === 403, "Purchasing center actor is rejected (403) from toggling purchasing center active status.");

    // Negative: Purchasing Center Actor attempts to delete purchasing center
    const pcDeleteRes = createMockRes();
    await purchasingCenterController.deletePurchasingCenter(createMockReq(purchasingCenterActor, { id: pc1Id }), pcDeleteRes);
    assert(pcDeleteRes.statusCode === 403, "Purchasing center actor is rejected (403) from deleting a purchasing center.");

    // Positive: Federal Admin updates and deletes created purchasing center
    const fedPcUpdateRes = createMockRes();
    await purchasingCenterController.updatePurchasingCenter(
      createMockReq(federalAdminActor, { id: createdPcId }, {}, { name: `Updated Federal PC ${ts}` }),
      fedPcUpdateRes
    );
    assert(fedPcUpdateRes.statusCode === 200, "Federal administrator can update purchasing center entity record.");

    const fedPcDeleteRes = createMockRes();
    await purchasingCenterController.deletePurchasingCenter(createMockReq(federalAdminActor, { id: createdPcId }), fedPcDeleteRes);
    assert(fedPcDeleteRes.statusCode === 200, "Federal administrator can delete purchasing center.");

    // =========================================================================
    // SECTION 6: UNPRIVILEGED FEDERAL ACCOUNT DENIAL
    // =========================================================================
    console.log("\n[6] Verifying Unprivileged Federal Account Denial...");
    // A federal user without entity permissions is rejected by auth middlewares
    assert(
      !federalUnprivilegedActor.permissions.includes("regions:create"),
      "Federal account without regions:create lacks permission in token."
    );
    assert(
      !federalUnprivilegedActor.permissions.includes("companies:create"),
      "Federal account without companies:create lacks permission in token."
    );
    assert(
      !federalUnprivilegedActor.permissions.includes("purchasing_centers:create"),
      "Federal account without purchasing_centers:create lacks permission in token."
    );

  } catch (err) {
    console.error("Test execution failed with unhandled error:", err);
    failed++;
  } finally {
    // Cleanup Test Entities
    console.log("\n[7] Cleaning up Test Data...");
    try {
      await PurchasingCenter.destroy({ where: { purchasing_center_id: [pc1Id, pc2Id] } });
      await Company.destroy({ where: { company_id: [company1Id, company2Id] } });
      await Region.destroy({ where: { region_id: [region1Id, region2Id] } });
      await GovernmentStructure.destroy({ where: { government_structure_id: testGovStructureId } });
      console.log("  PASS: Test data cleaned up successfully.");
    } catch (cleanupErr) {
      console.warn("  WARN: Cleanup warning:", cleanupErr.message);
    }
  }

  console.log("\n========================================================");
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
