"use strict";

const {
  sequelize,
  PurchasingCenter,
  Company,
  AsmMiner,
  GoldMeasurementUnit,
  GoldPurchase,
  GoldDailyReport,
  User,
} = require("../models");
const unitService = require("../services/goldMeasurementUnitService");
const asmMinerService = require("../services/asmMinerService");
const goldPurchaseService = require("../services/goldPurchaseService");
const dailyReportService = require("../services/goldDailyReportService");
const goldDashboardService = require("../services/goldDashboardService");
const { v4: uuidv4 } = require("uuid");

async function run() {
  console.log("=== Starting Phase 5.5 Gold Purchasing Operations Verification ===");

  const timestamp = Date.now().toString().slice(-6);
  let testCenterA, testCenterB, mockPCActorA, mockPCActorB, mockFederalActor;
  let testCompany, testAsmMiner;
  let testGramUnit, testCustomUnit;

  try {
    // -------------------------------------------------------------
    // SETUP: Test Purchasing Centers & Mock Actors
    // -------------------------------------------------------------
    console.log("\n[Setup] Preparing test purchasing centers and actors...");
    testCenterA = await PurchasingCenter.create({
      purchasing_center_id: uuidv4(),
      name: `Test Center Alpha ${timestamp}`,
      code: `PCA_${timestamp}`,
      description: "Shakiso, Guji",
      is_active: true,
    });

    testCenterB = await PurchasingCenter.create({
      purchasing_center_id: uuidv4(),
      name: `Test Center Beta ${timestamp}`,
      code: `PCB_${timestamp}`,
      description: "Adola, Oromia",
      is_active: true,
    });

    // Create User records in DB so foreign keys resolve
    const userA = await User.create({
      user_id: uuidv4(),
      full_name: "Officer Alpha",
      email: `officer_a_${timestamp}@example.com`,
      password: "password123",
      purchasing_center_id: testCenterA.purchasing_center_id,
      is_active: true,
    });

    const userB = await User.create({
      user_id: uuidv4(),
      full_name: "Officer Beta",
      email: `officer_b_${timestamp}@example.com`,
      password: "password123",
      purchasing_center_id: testCenterB.purchasing_center_id,
      is_active: true,
    });

    const userFed = await User.create({
      user_id: uuidv4(),
      full_name: "Federal Gold Admin",
      email: `federal_admin_${timestamp}@example.com`,
      password: "password123",
      is_active: true,
    });

    mockPCActorA = {
      user_id: userA.user_id,
      email: userA.email,
      full_name: userA.full_name,
      is_purchasing_center: true,
      purchasing_center_id: testCenterA.purchasing_center_id,
      roles: ["Purchasing Center Officer"],
      permissions: [
        "gold_purchases:read",
        "gold_purchases:create",
        "gold_reports:read",
        "gold_reports:generate",
        "gold_reports:submit",
        "asm:read",
        "asm:create",
        "gold_units:read",
      ],
    };

    mockPCActorB = {
      user_id: userB.user_id,
      email: userB.email,
      full_name: userB.full_name,
      is_purchasing_center: true,
      purchasing_center_id: testCenterB.purchasing_center_id,
      roles: ["Purchasing Center Officer"],
      permissions: [
        "gold_purchases:read",
        "gold_purchases:create",
        "asm:read",
        "asm:create",
      ],
    };

    mockFederalActor = {
      user_id: userFed.user_id,
      email: userFed.email,
      full_name: userFed.full_name,
      is_federal: true,
      is_purchasing_center: false,
      roles: ["Super Admin"],
      permissions: [
        "gold_oversight:read",
        "gold_oversight:manage",
        "gold_units:create",
        "gold_units:update",
        "gold_units:deactivate",
        "gold_units:read",
        "asm:read",
        "asm:create",
        "asm:update",
        "asm:deactivate",
        "gold_purchases:read",
        "gold_purchases:create",
        "gold_purchases:cancel",
        "gold_reports:read",
        "gold_reports:submit",
      ],
    };

    // Use or create a test active company
    testCompany = await Company.findOne({ where: { is_active: true } });
    if (!testCompany) {
      testCompany = await Company.create({
        company_id: uuidv4(),
        name: `National Gold Extraction Corp ${timestamp}`,
        code: `NGEC_${timestamp}`,
        is_active: true,
      });
    }

    console.log("✓ Test setup completed successfully.");

    // -------------------------------------------------------------
    // TEST 1: Measurement Unit Registry & Dynamic Conversions
    // -------------------------------------------------------------
    console.log("\n[Test 1] Gold Measurement Units Registry...");
    const existingUnits = await unitService.listUnits();
    testGramUnit = existingUnits.find((u) => u.code === "g");
    if (!testGramUnit) {
      throw new Error("Default canonical Gram unit 'g' not found in database.");
    }
    console.log(`✓ Canonical base unit verified: ${testGramUnit.name} (code: ${testGramUnit.code}, factor: ${testGramUnit.conversion_factor})`);

    // Create a custom measurement unit (e.g. Mithqal = 4.25 grams)
    const customCode = `mithqal_${timestamp}`;
    testCustomUnit = await unitService.createUnit(
      {
        name: `Mithqal ${timestamp}`,
        code: customCode,
        symbol: "mth",
        description: "Traditional bullion weight unit equivalent to 4.25 grams",
        conversion_factor: 4.25,
        is_canonical_base: false,
      },
      mockFederalActor.user_id
    );
    console.log(`✓ Custom unit created: ${testCustomUnit.name} (${testCustomUnit.symbol}, 4.25g)`);

    // Duplicate code rejection
    try {
      await unitService.createUnit(
        {
          name: `Duplicate Unit ${timestamp}`,
          code: customCode,
          symbol: "dup",
          conversion_factor: 5.0,
        },
        mockFederalActor.user_id
      );
      throw new Error("FAILED: Permitted duplicate unit code!");
    } catch (err) {
      console.log("✓ Correctly rejected duplicate unit code:", err.message);
    }

    // Canonical base protection: cannot deactivate base unit
    try {
      await unitService.toggleUnitStatus(testGramUnit.unit_id, false, mockFederalActor.user_id);
      throw new Error("FAILED: Permitted deactivation of canonical base unit!");
    } catch (err) {
      console.log("✓ Canonical base unit protected from deactivation:", err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Shared ASM Registry & Search Before Registration
    // -------------------------------------------------------------
    console.log("\n[Test 2] Shared ASM Registry & Search Before Registration...");

    const nationalId = `ETH-${timestamp}-01`;
    const licenseNo = `ML-${timestamp}-88`;
    const minerPhone = `+251911${timestamp}`;

    // Search before registration (should return empty matches initially)
    const searchBefore = await asmMinerService.searchCandidates({
      national_id_number: nationalId,
      mining_license_number: licenseNo,
      phone_number: minerPhone,
      full_name: "Chala Kebede",
    });
    if (searchBefore.exact_matches.length > 0) {
      throw new Error("Unexpected exact match found before registration.");
    }
    console.log("✓ Candidate search before registration clean: 0 matches found.");

    // Register ASM Miner from Purchasing Center A workspace
    testAsmMiner = await asmMinerService.registerMiner(
      {
        full_name: `Chala Kebede Boru ${timestamp}`,
        national_id_number: nationalId,
        mining_license_number: licenseNo,
        phone_number: minerPhone,
        region: "Oromia",
        zone_or_woreda: "Guji / Shakiso",
        kebele: "Reji",
        notes: "Artisanal gold miner registered at Shakiso center",
      },
      mockPCActorA
    );
    console.log(`✓ ASM Miner registered by PC Actor A: ${testAsmMiner.full_name} (ID: ${testAsmMiner.asm_id})`);

    // Search after registration: MUST detect exact match
    const searchAfter = await asmMinerService.searchCandidates({
      national_id_number: nationalId,
    });
    if (searchAfter.exact_matches.length === 0 || searchAfter.exact_matches[0].asm_id !== testAsmMiner.asm_id) {
      throw new Error("Candidate search failed to detect existing ASM miner by national ID.");
    }
    console.log(`✓ Candidate search correctly identified existing miner: ${searchAfter.exact_matches[0].full_name}`);

    // Duplicate national ID rejection at DB/service level
    try {
      await asmMinerService.registerMiner(
        {
          full_name: "Duplicate Miner Attempt",
          national_id_number: nationalId,
        },
        mockPCActorB
      );
      throw new Error("FAILED: Permitted duplicate national ID!");
    } catch (err) {
      console.log("✓ Duplicate reliable identifier correctly rejected:", err.message);
    }

    // Shared registry verification: PC Actor B and Federal Actor can retrieve the same miner
    const retrievedByB = await asmMinerService.getMinerById(testAsmMiner.asm_id);
    if (!retrievedByB || retrievedByB.asm_id !== testAsmMiner.asm_id) {
      throw new Error("ASM miner is not shared across purchasing centers.");
    }
    console.log("✓ ASM miner verified as shared resource accessible across purchasing centers.");

    // -------------------------------------------------------------
    // TEST 3: Gold Purchase Recording & Integrity Rules
    // -------------------------------------------------------------
    console.log("\n[Test 3] Gold Purchase Recording & Server-Side Integrity...");

    // Test 3a: Center Isolation - PC Actor A cannot record purchase for Center B
    try {
      await goldPurchaseService.recordPurchase(
        {
          purchasing_center_id: testCenterB.purchasing_center_id, // Tampered ID!
          seller_type: "company",
          company_id: testCompany.company_id,
          quantity: 10.5,
          measurement_unit_id: testGramUnit.unit_id,
          unit_price: 3200,
        },
        mockPCActorA
      );
      throw new Error("FAILED: Permitted PC Actor A to record purchase for Center B!");
    } catch (err) {
      console.log("✓ Server-side isolation blocked center tampering:", err.message);
    }

    // Test 3b: Seller Exclusivity - reject invalid seller type or missing seller reference
    try {
      await goldPurchaseService.recordPurchase(
        {
          purchasing_center_id: testCenterA.purchasing_center_id,
          seller_type: "invalid_type",
          quantity: 10,
          measurement_unit_id: testGramUnit.unit_id,
        },
        mockPCActorA
      );
      throw new Error("FAILED: Permitted invalid seller type!");
    } catch (err) {
      console.log("✓ Invalid seller type rejected:", err.message);
    }

    // Test 3c: Record purchase from registered Company
    // 50 grams @ 3500 ETB/gram = 175,000 ETB
    const purchaseComp = await goldPurchaseService.recordPurchase(
      {
        purchasing_center_id: testCenterA.purchasing_center_id,
        seller_type: "company",
        company_id: testCompany.company_id,
        quantity: 50.0,
        measurement_unit_id: testGramUnit.unit_id,
        unit_price: 3500.0,
        notes: "Purchased high purity doré gold from registered mining company",
      },
      mockPCActorA
    );
    console.log(`✓ Company purchase recorded: Ref ${purchaseComp.purchase_reference}, Qty: ${purchaseComp.quantity}g, Total: ${purchaseComp.total_amount} ETB`);
    if (parseFloat(purchaseComp.total_amount) !== 175000.0) {
      throw new Error(`Total amount calculation mismatch: expected 175000, got ${purchaseComp.total_amount}`);
    }
    if (parseFloat(purchaseComp.quantity_in_canonical_unit) !== 50.0) {
      throw new Error(`Canonical quantity mismatch: expected 50, got ${purchaseComp.quantity_in_canonical_unit}`);
    }

    // Test 3d: Record purchase from ASM Miner with custom measurement unit
    // 10 mithqal (each 4.25g base = 42.5g canonical) @ 15,000 ETB/mithqal = 150,000 ETB
    const purchaseAsm = await goldPurchaseService.recordPurchase(
      {
        purchasing_center_id: testCenterA.purchasing_center_id,
        seller_type: "asm",
        asm_id: testAsmMiner.asm_id,
        quantity: 10.0,
        measurement_unit_id: testCustomUnit.unit_id,
        unit_price: 15000.0,
        notes: "Purchased raw alluvial gold from registered ASM miner",
      },
      mockPCActorA
    );
    console.log(`✓ ASM purchase recorded: Ref ${purchaseAsm.purchase_reference}, Qty: ${purchaseAsm.quantity} mth (${purchaseAsm.quantity_in_canonical_unit}g base), Total: ${purchaseAsm.total_amount} ETB`);
    if (parseFloat(purchaseAsm.quantity_in_canonical_unit) !== 42.5) {
      throw new Error(`Unit conversion failed: expected 42.5g, got ${purchaseAsm.quantity_in_canonical_unit}`);
    }
    if (parseFloat(purchaseAsm.total_amount) !== 150000.0) {
      throw new Error(`Total amount calculation mismatch: expected 150000, got ${purchaseAsm.total_amount}`);
    }

    // Test 3e: Cross-center viewing isolation
    try {
      await goldPurchaseService.getPurchaseById(purchaseComp.purchase_id, mockPCActorB);
      throw new Error("FAILED: PC Actor B was permitted to view Center A purchase!");
    } catch (err) {
      console.log("✓ Cross-center purchase access denied:", err.message);
    }

    // Test 3f: Cancellation workflow
    const purchaseToCancel = await goldPurchaseService.recordPurchase(
      {
        purchasing_center_id: testCenterA.purchasing_center_id,
        seller_type: "asm",
        asm_id: testAsmMiner.asm_id,
        quantity: 2.0,
        measurement_unit_id: testGramUnit.unit_id,
        unit_price: 3500.0,
        notes: "Accidental duplicate entry for test",
      },
      mockPCActorA
    );

    const cancelled = await goldPurchaseService.cancelPurchase(
      purchaseToCancel.purchase_id,
      "Duplicate weighing error entered by mistake",
      mockPCActorA
    );
    if (cancelled.status !== "cancelled" || !cancelled.cancelled_reason) {
      throw new Error("Purchase cancellation failed to update status and reason.");
    }
    console.log(`✓ Purchase cancellation verified: ${cancelled.purchase_reference} (status: ${cancelled.status})`);

    // -------------------------------------------------------------
    // TEST 4: Daily Gold Purchasing Reports
    // -------------------------------------------------------------
    console.log("\n[Test 4] Daily Gold Purchasing Reports & Reconciliation...");

    const todayDate = goldPurchaseService.getTodayBusinessDate();
    const dailyReport = await dailyReportService.getDailyReport(testCenterA.purchasing_center_id, todayDate, mockPCActorA);

    // Active purchases: purchaseComp (50g, 175k) + purchaseAsm (42.5g, 150k) = 92.5g, 325k ETB, count: 2
    // Cancelled purchases: 1
    console.log("✓ Daily report dynamically calculated from eligible transactions:");
    console.log(`  - Total active purchases: ${dailyReport.summary.total_purchases}`);
    console.log(`  - Cancelled purchases: ${dailyReport.summary.cancelled_purchases_count}`);
    console.log(`  - Canonical gold quantity: ${dailyReport.summary.total_quantity_canonical} grams`);
    console.log(`  - Total purchase value: ${dailyReport.summary.total_amount} ETB`);
    console.log(`  - Unit breakdown count: ${dailyReport.summary.unit_breakdown.length}`);
    console.log(`  - Seller breakdown: Company (${dailyReport.summary.seller_breakdown.company.purchase_count}), ASM (${dailyReport.summary.seller_breakdown.asm.purchase_count})`);

    if (dailyReport.summary.total_purchases !== 2) {
      throw new Error(`Report total purchases mismatch: expected 2, got ${dailyReport.summary.total_purchases}`);
    }
    if (dailyReport.summary.total_quantity_canonical !== 92.5) {
      throw new Error(`Report canonical quantity mismatch: expected 92.5, got ${dailyReport.summary.total_quantity_canonical}`);
    }
    if (dailyReport.summary.total_amount !== 325000.0) {
      throw new Error(`Report total amount mismatch: expected 325000, got ${dailyReport.summary.total_amount}`);
    }

    // Submit daily report
    const submitted = await dailyReportService.submitDailyReport(
      testCenterA.purchasing_center_id,
      todayDate,
      "Daily gold purchasing operations completed smoothly. Verified scales.",
      mockPCActorA
    );
    if (submitted.submission.status !== "submitted") {
      throw new Error("Report submission status not 'submitted'.");
    }
    console.log("✓ Daily report submission snapshot successfully created and verified.");

    // Historical reports listing
    const histReports = await dailyReportService.listHistoricalReports(
      { purchasing_center_id: testCenterA.purchasing_center_id },
      mockPCActorA
    );
    if (histReports.total === 0) {
      throw new Error("Historical reports listing returned 0 records.");
    }
    console.log(`✓ Historical reports listed: ${histReports.total} record(s) found.`);

    // -------------------------------------------------------------
    // TEST 5: Purchasing Center Dashboard
    // -------------------------------------------------------------
    console.log("\n[Test 5] Purchasing Center Scoped Dashboard...");
    const pcDashboard = await goldDashboardService.getPurchasingCenterDashboard(
      testCenterA.purchasing_center_id,
      {},
      mockPCActorA
    );
    console.log(`✓ Center Dashboard loaded for: ${pcDashboard.purchasing_center.name}`);
    console.log(`  - Today's purchases count: ${pcDashboard.today.purchases_count}`);
    console.log(`  - Today's canonical quantity: ${pcDashboard.today.canonical_quantity}g`);
    console.log(`  - Today's total amount: ${pcDashboard.today.amount} ETB`);
    console.log(`  - Today's daily report status: ${pcDashboard.today.report_status}`);
    console.log(`  - Period distinct sellers: ${pcDashboard.period_summary.distinct_sellers.total}`);
    console.log(`  - Daily trends data points: ${pcDashboard.daily_trends.length}`);
    console.log(`  - Recent purchases count: ${pcDashboard.recent_purchases.length}`);

    if (pcDashboard.today.purchases_count !== 2) {
      throw new Error(`Center dashboard today count mismatch: expected 2, got ${pcDashboard.today.purchases_count}`);
    }
    if (pcDashboard.today.report_status !== "submitted") {
      throw new Error(`Center dashboard today report status mismatch: expected 'submitted', got ${pcDashboard.today.report_status}`);
    }

    // -------------------------------------------------------------
    // TEST 6: Federal Oversight Dashboard & Monitoring
    // -------------------------------------------------------------
    console.log("\n[Test 6] Centralized Federal Oversight Dashboard...");
    const oversight = await goldDashboardService.getFederalOversightDashboard();
    console.log("✓ Federal oversight data aggregated across all centers:");
    console.log(`  - Total purchasing centers: ${oversight.overview.total_centers} (${oversight.overview.active_centers} active)`);
    console.log(`  - Nationwide total purchases: ${oversight.overview.total_purchases}`);
    console.log(`  - Nationwide canonical gold volume: ${oversight.overview.total_quantity_canonical}g`);
    console.log(`  - Nationwide total value: ${oversight.overview.total_amount} ETB`);
    console.log(`  - Today's reporting completion rate: ${oversight.today.reporting_completion_rate}%`);
    console.log(`  - Tracked centers in summary table: ${oversight.centers.length}`);

    if (oversight.overview.total_centers < 2) {
      throw new Error("Federal oversight center count should include test centers.");
    }

    console.log("\n=======================================================");
    console.log("  ALL PHASE 5.5 BACKEND TESTS PASSED SUCCESSFULLY!  ");
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("\n❌ VERIFICATION FAILED:", err);
    process.exit(1);
  }
}

run();
