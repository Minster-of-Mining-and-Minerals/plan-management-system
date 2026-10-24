"use strict";

const db = require("../models");
const productionConfigService = require("../services/production/productionConfigService");
const companyProductionService = require("../services/production/companyProductionService");
const companyService = require("../services/companyService");
const { v4: uuidv4 } = require("uuid");

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
      console.error(`  FAIL: ${testName} (threw error '${error.message}', expected '${expectedSubstr}')`);
      failedCount++;
    } else {
      console.log(`  PASS: ${testName} (threw: "${error.message}")`);
      passedCount++;
    }
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("  PHASE 5.8 COMPANY PRODUCTION REPORTING VERIFICATION");
  console.log("========================================================\n");

  const testSuffix = Math.floor(Math.random() * 100000);
  let company1;
  let company2;
  let tonneUnit;
  let kgUnit;
  let gramUnit;
  let itemGold;
  let itemLithium;
  let assign1;
  let assign2;

  try {
    // ----------------------------------------------------
    // SETUP: UNITS & TEST COMPANIES
    // ----------------------------------------------------
    console.log("[1] Setting up Measurement Units and Test Companies...");

    // Retrieve existing measurement units
    tonneUnit = await db.GoldMeasurementUnit.findOne({ where: { code: "tonne" } });
    kgUnit = await db.GoldMeasurementUnit.findOne({ where: { code: "kg" } });
    gramUnit = await db.GoldMeasurementUnit.findOne({ where: { code: "g" } });

    assert(tonneUnit && kgUnit && gramUnit, "Measurement units (tonne, kg, g) retrieved successfully");

    company1 = await companyService.createCompany({
      name: `Production Mining Corp ${testSuffix}`,
      code: `PMC-${testSuffix}`,
      email: `pmc_${testSuffix}@example.com`,
      phone_number: "+251911000001",
      address: "Addis Ababa",
      company_type: "large_scale",
      license_number: `LIC-PMC-${testSuffix}`,
      is_active: true,
    });

    company2 = await companyService.createCompany({
      name: `Rival Minerals Ltd ${testSuffix}`,
      code: `RML-${testSuffix}`,
      email: `rml_${testSuffix}@example.com`,
      phone_number: "+251911000002",
      address: "Mekelle",
      company_type: "medium_scale",
      license_number: `LIC-RML-${testSuffix}`,
      is_active: true,
    });

    assert(company1 && company1.company_id, "Company 1 created");
    assert(company2 && company2.company_id, "Company 2 created");

    // ----------------------------------------------------
    // [2] PRODUCTION ITEMS & SUPPORTED UNITS
    // ----------------------------------------------------
    console.log("\n[2] Testing Production Item Registry & Unit Assignment...");

    // Create item with Metric Tonne base unit and supported units (tonne and kg)
    // 1 tonne = 1000 kg. If base is tonne:
    // conversion_factor_to_base for tonne = 1.0
    // conversion_factor_to_base for kg = 0.001 (1 kg = 0.001 tonne)
    itemLithium = await productionConfigService.createProductionItem({
      name: `Lithium Ore ${testSuffix}`,
      code: `lithium_${testSuffix}`,
      description: "High-grade lithium concentrate",
      category: "Critical Minerals",
      base_unit_id: tonneUnit.unit_id,
      default_reporting_unit_id: tonneUnit.unit_id,
      supported_units: [
        { unit_id: tonneUnit.unit_id, conversion_factor_to_base: 1.0, is_default: true },
        { unit_id: kgUnit.unit_id, conversion_factor_to_base: 0.001, is_default: false },
      ],
    });

    assert(itemLithium && itemLithium.production_item_id, "Lithium Ore production item created");
    assert(itemLithium.supportedUnits.length >= 2, "Item has at least 2 supported units configured");
    assert(itemLithium.baseUnit.code === "tonne", "Base unit is Metric Tonne");

    // Test updating production item
    const updatedItem = await productionConfigService.updateProductionItem(
      itemLithium.production_item_id,
      { description: "Refined high-grade lithium concentrate" }
    );
    assert(updatedItem.description.includes("Refined"), "Production item updated successfully");

    // Test unit conversion
    const conv1 = await productionConfigService.convertQuantity({
      quantity: 5000,
      fromUnitId: kgUnit.unit_id,
      toUnitId: tonneUnit.unit_id,
      productionItemId: itemLithium.production_item_id,
    });
    assert(conv1.convertedQuantity === 5, "5,000 kg correctly converts to 5 tonnes");

    const conv2 = await productionConfigService.convertQuantity({
      quantity: 12,
      fromUnitId: tonneUnit.unit_id,
      toUnitId: kgUnit.unit_id,
      productionItemId: itemLithium.production_item_id,
    });
    assert(conv2.convertedQuantity === 12000, "12 tonnes correctly converts to 12,000 kg");

    // Duplicate item code rejection
    await assertThrowsAsync(
      () =>
        productionConfigService.createProductionItem({
          name: `Another Item ${testSuffix}`,
          code: `lithium_${testSuffix}`,
          base_unit_id: tonneUnit.unit_id,
        }),
      "Duplicate production item code rejected",
      "already exists"
    );

    // ----------------------------------------------------
    // [3] REPORTING FREQUENCIES & DYNAMIC PERIOD GENERATION
    // ----------------------------------------------------
    console.log("\n[3] Testing Reporting Frequencies & Dynamic Period Generation...");

    const frequencies = await productionConfigService.listFrequencies();
    assert(frequencies.length >= 5, "Reporting frequencies loaded (daily, weekly, monthly, quarterly, annual)");

    const dailyFreq = frequencies.find((f) => f.code === "daily");
    assert(dailyFreq && dailyFreq.interval_days === 1, "Daily reporting frequency available");

    // Test dynamic target period generation for 2026
    const annualPeriods = productionConfigService.generateTargetPeriods({
      year: 2026,
      allocationDepth: "annual",
    });
    assert(annualPeriods.length === 1 && annualPeriods[0].children.length === 0, "Annual allocation generates 1 period without children");

    const quarterlyPeriods = productionConfigService.generateTargetPeriods({
      year: 2026,
      allocationDepth: "quarterly",
    });
    assert(quarterlyPeriods[0].children.length === 4, "Quarterly allocation generates 4 quarters (Q1-Q4)");
    assert(quarterlyPeriods[0].children[0].period_label === "2026-Q1", "Q1 labeled '2026-Q1'");
    assert(quarterlyPeriods[0].children[0].period_start_date === "2026-01-01", "Q1 starts 2026-01-01");
    assert(quarterlyPeriods[0].children[0].period_end_date === "2026-03-31", "Q1 ends 2026-03-31");
    assert(quarterlyPeriods[0].children[1].period_start_date === "2026-04-01", "Q2 starts 2026-04-01");

    const monthlyPeriods = productionConfigService.generateTargetPeriods({
      year: 2026,
      allocationDepth: "monthly",
    });
    assert(monthlyPeriods[0].children.length === 12, "Monthly allocation generates 12 months");
    assert(monthlyPeriods[0].children[1].period_end_date === "2026-02-28", "February 2026 ends on 28th (non-leap year)");

    const leapFeb = productionConfigService.generateTargetPeriods({
      year: 2024,
      allocationDepth: "monthly",
    });
    assert(leapFeb[0].children[1].period_end_date === "2024-02-29", "February 2024 ends on 29th (leap year)");

    const semiAnnualPeriods = productionConfigService.generateTargetPeriods({
      year: 2026,
      allocationDepth: "semi_annual",
    });
    assert(semiAnnualPeriods[0].children.length === 2, "Semiannual allocation generates 2 half-years (H1-H2)");

    // ----------------------------------------------------
    // [4] COMPANY ASSIGNMENTS & TARGET HIERARCHY
    // ----------------------------------------------------
    console.log("\n[4] Testing Company Production Assignment & Target Hierarchy...");

    assign1 = await companyProductionService.createAssignment({
      company_id: company1.company_id,
      production_item_id: itemLithium.production_item_id,
      reporting_frequency_id: dailyFreq.frequency_id,
      target_allocation_depth: "quarterly",
      default_reporting_unit_id: tonneUnit.unit_id,
      effective_from: "2026-01-01",
      effective_to: "2026-12-31",
      requires_review: false,
    });

    assert(assign1 && assign1.assignment_id, "Company 1 assigned Lithium Ore with Daily reporting and Quarterly depth");

    // Prevent duplicate active assignment
    await assertThrowsAsync(
      () =>
        companyProductionService.createAssignment({
          company_id: company1.company_id,
          production_item_id: itemLithium.production_item_id,
          reporting_frequency_id: dailyFreq.frequency_id,
          target_allocation_depth: "quarterly",
          effective_from: "2026-01-01",
        }),
      "Duplicate active assignment rejected",
      "already exists"
    );

    // Save target hierarchy:
    // Annual Target: 12,000 tonnes
    // Q1: 2,000 tonnes, Q2: 3,000 tonnes, Q3: 3,000 tonnes, Q4: 4,000 tonnes
    const targetHierarchyPayload = [
      {
        target_period_type: "year",
        period_label: "2026",
        period_start_date: "2026-01-01",
        period_end_date: "2026-12-31",
        target_quantity: 12000,
        unit_id: tonneUnit.unit_id,
        children: [
          {
            target_period_type: "quarter",
            period_label: "2026-Q1",
            period_start_date: "2026-01-01",
            period_end_date: "2026-03-31",
            target_quantity: 2000,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q2",
            period_start_date: "2026-04-01",
            period_end_date: "2026-06-30",
            target_quantity: 3000,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q3",
            period_start_date: "2026-07-01",
            period_end_date: "2026-09-30",
            target_quantity: 3000,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q4",
            period_start_date: "2026-10-01",
            period_end_date: "2026-12-31",
            target_quantity: 4000,
            unit_id: tonneUnit.unit_id,
          },
        ],
      },
    ];

    const savedTargets = await companyProductionService.saveTargetHierarchy({
      assignmentId: assign1.assignment_id,
      targets: targetHierarchyPayload,
      revisionReason: "Initial approved targets for 2026",
    });

    assert(savedTargets.length === 5, "5 target records saved (1 Annual + 4 Quarters)");
    const annualTarget = savedTargets.find((t) => t.target_period_type === "year");
    assert(Number(annualTarget.target_quantity) === 12000, "Annual target is 12,000 tonnes");
    assert(annualTarget.version_number === 1, "Target version is 1");

    // Test over-allocation validation: Child sum > Parent
    await assertThrowsAsync(
      () =>
        companyProductionService.saveTargetHierarchy({
          assignmentId: assign1.assignment_id,
          targets: [
            {
              target_period_type: "year",
              period_label: "2026",
              period_start_date: "2026-01-01",
              period_end_date: "2026-12-31",
              target_quantity: 1000,
              unit_id: tonneUnit.unit_id,
              children: [
                {
                  target_period_type: "quarter",
                  period_label: "2026-Q1",
                  period_start_date: "2026-01-01",
                  period_end_date: "2026-03-31",
                  target_quantity: 800,
                  unit_id: tonneUnit.unit_id,
                },
                {
                  target_period_type: "quarter",
                  period_label: "2026-Q2",
                  period_start_date: "2026-04-01",
                  period_end_date: "2026-06-30",
                  target_quantity: 400, // 800 + 400 = 1200 > 1000
                  unit_id: tonneUnit.unit_id,
                },
              ],
            },
          ],
        }),
      "Over-allocation error thrown when child sum exceeds parent target",
      "exceeds parent target"
    );

    // Test Target Revision & Historical Integrity
    const revisedTargetsPayload = [
      {
        target_period_type: "year",
        period_label: "2026",
        period_start_date: "2026-01-01",
        period_end_date: "2026-12-31",
        target_quantity: 13000,
        unit_id: tonneUnit.unit_id,
        children: [
          {
            target_period_type: "quarter",
            period_label: "2026-Q1",
            period_start_date: "2026-01-01",
            period_end_date: "2026-03-31",
            target_quantity: 2000,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q2",
            period_start_date: "2026-04-01",
            period_end_date: "2026-06-30",
            target_quantity: 3500,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q3",
            period_start_date: "2026-07-01",
            period_end_date: "2026-09-30",
            target_quantity: 3500,
            unit_id: tonneUnit.unit_id,
          },
          {
            target_period_type: "quarter",
            period_label: "2026-Q4",
            period_start_date: "2026-10-01",
            period_end_date: "2026-12-31",
            target_quantity: 4000,
            unit_id: tonneUnit.unit_id,
          },
        ],
      },
    ];

    const v2Targets = await companyProductionService.saveTargetHierarchy({
      assignmentId: assign1.assignment_id,
      targets: revisedTargetsPayload,
      revisionReason: "Upgraded expansion targets in Q2 and Q3",
    });

    assert(v2Targets[0].version_number === 2, "Target revision created Version 2");
    // Verify Version 1 still exists in database marked as superseded
    const v1Records = await companyProductionService.getTargetsByAssignment(assign1.assignment_id, 1);
    assert(v1Records.length === 5, "Version 1 target records preserved intact for audit trail");
    assert(v1Records[0].status === "superseded", "Version 1 target records marked as superseded");

    // Reset back to Version 1 target structure for the core scenario test
    const v3Targets = await companyProductionService.saveTargetHierarchy({
      assignmentId: assign1.assignment_id,
      targets: targetHierarchyPayload,
      revisionReason: "Restored baseline targets for core scenario testing",
    });
    assert(v3Targets[0].version_number === 3, "Version 3 created restoring core scenario targets");

    // ----------------------------------------------------
    // [5] CORE SCENARIO: QUARTERLY TARGETS WITH DAILY REPORTING
    // ----------------------------------------------------
    console.log("\n[5] Testing Core Scenario: Quarterly Targets with Daily Reporting...");

    // Submit 20 daily reports in Q1 (e.g. 2026-01-01 to 2026-01-20)
    // 15 reports of 10 tonnes each = 150 tonnes
    // 5 reports of 20,000 kg each = 100 tonnes
    // Total = 250 tonnes
    console.log("  Submitting 20 daily reports in Q1...");
    for (let day = 1; day <= 15; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      await companyProductionService.submitReport({
        company_id: company1.company_id,
        assignment_id: assign1.assignment_id,
        production_item_id: itemLithium.production_item_id,
        report_date: `2026-01-${dayStr}`,
        quantity_reported: 10,
        reported_unit_id: tonneUnit.unit_id,
        notes: `Daily production report for day ${day}`,
      });
    }

    for (let day = 16; day <= 20; day++) {
      await companyProductionService.submitReport({
        company_id: company1.company_id,
        assignment_id: assign1.assignment_id,
        production_item_id: itemLithium.production_item_id,
        report_date: `2026-01-${day}`,
        quantity_reported: 20000, // 20,000 kg = 20 tonnes
        reported_unit_id: kgUnit.unit_id,
        notes: `Daily production report for day ${day} reported in kg`,
      });
    }

    // 1. Calculate performance for Q1
    const q1Perf = await companyProductionService.calculateProductionPerformance({
      companyId: company1.company_id,
      productionItemId: itemLithium.production_item_id,
      periodLabel: "2026-Q1",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      periodType: "quarter",
    });

    assert(q1Perf.has_target === true, "Q1 has active configured target");
    assert(Number(q1Perf.target_quantity) === 2000, "Q1 Target is exactly 2,000 tonnes");
    assert(Number(q1Perf.actual_quantity) === 250, "Q1 Cumulative Actual is exactly 250 tonnes (150t + 100t from kg)");
    assert(Number(q1Perf.remaining_quantity) === 1750, "Q1 Remaining Target is 1,750 tonnes");
    assert(Number(q1Perf.achievement_percentage) === 12.5, "Q1 Achievement is exactly 12.5% (250 / 2,000 * 100)");
    assert(q1Perf.report_count === 20, "Q1 has 20 submitted daily reports");
    assert(q1Perf.projected_estimate && q1Perf.projected_estimate.is_estimate === true, "Projected estimate is provided and explicitly labeled as estimate");

    // 2. Calculate performance for Full Year 2026
    const annualPerf = await companyProductionService.calculateProductionPerformance({
      companyId: company1.company_id,
      productionItemId: itemLithium.production_item_id,
      periodLabel: "2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      periodType: "year",
    });

    assert(annualPerf.has_target === true, "Annual target is active");
    assert(Number(annualPerf.target_quantity) === 12000, "Annual Target is exactly 12,000 tonnes");
    assert(Number(annualPerf.actual_quantity) === 250, "Annual Cumulative Actual is 250 tonnes");
    assert(Number(annualPerf.remaining_quantity) === 11750, "Annual Remaining Target is 11,750 tonnes");
    assert(Number(annualPerf.achievement_percentage) === 2.08, "Annual Achievement is 2.08% (250 / 12,000 * 100)");

    // 3. Prevent duplicate report submission on same date
    await assertThrowsAsync(
      () =>
        companyProductionService.submitReport({
          company_id: company1.company_id,
          assignment_id: assign1.assignment_id,
          production_item_id: itemLithium.production_item_id,
          report_date: "2026-01-01",
          quantity_reported: 15,
          reported_unit_id: tonneUnit.unit_id,
        }),
      "Duplicate daily report for same date and company rejected",
      "already been submitted"
    );

    // ----------------------------------------------------
    // [6] ANNUAL-ONLY TARGET WITH DAILY REPORTING
    // ----------------------------------------------------
    console.log("\n[6] Testing Annual-Only Target with Daily Reporting...");

    assign2 = await companyProductionService.createAssignment({
      company_id: company2.company_id,
      production_item_id: itemLithium.production_item_id,
      reporting_frequency_id: dailyFreq.frequency_id,
      target_allocation_depth: "annual",
      default_reporting_unit_id: tonneUnit.unit_id,
      effective_from: "2026-01-01",
      effective_to: "2026-12-31",
    });

    // Configure annual target only (no quarterly or daily targets)
    await companyProductionService.saveTargetHierarchy({
      assignmentId: assign2.assignment_id,
      targets: [
        {
          target_period_type: "year",
          period_label: "2026",
          period_start_date: "2026-01-01",
          period_end_date: "2026-12-31",
          target_quantity: 5000,
          unit_id: tonneUnit.unit_id,
          children: [], // No children
        },
      ],
      revisionReason: "Annual-only target allocation",
    });

    // Submit daily report for Company 2
    await companyProductionService.submitReport({
      company_id: company2.company_id,
      assignment_id: assign2.assignment_id,
      production_item_id: itemLithium.production_item_id,
      report_date: "2026-01-05",
      quantity_reported: 50,
      reported_unit_id: tonneUnit.unit_id,
    });

    const comp2AnnualPerf = await companyProductionService.calculateProductionPerformance({
      companyId: company2.company_id,
      productionItemId: itemLithium.production_item_id,
      periodLabel: "2026",
      periodType: "year",
    });

    assert(comp2AnnualPerf.target_quantity === 5000, "Company 2 Annual Target is 5,000 tonnes");
    assert(comp2AnnualPerf.actual_quantity === 50, "Company 2 Daily report directly contributes to annual actual");
    assert(comp2AnnualPerf.remaining_quantity === 4950, "Company 2 Remaining is 4,950 tonnes");

    // ----------------------------------------------------
    // [7] STRICT CROSS-COMPANY AUTHORIZATION & SCOPE
    // ----------------------------------------------------
    console.log("\n[7] Testing Strict Cross-Company Authorization & Scope Isolation...");

    // Company 2 user cannot submit reports for Company 1
    await assertThrowsAsync(
      () =>
        companyProductionService.submitReport(
          {
            company_id: company1.company_id,
            assignment_id: assign1.assignment_id,
            production_item_id: itemLithium.production_item_id,
            report_date: "2026-01-25",
            quantity_reported: 10,
            reported_unit_id: tonneUnit.unit_id,
          },
          uuidv4(),
          company2.company_id // Enforced company scope
        ),
      "Cross-company report submission rejected with Forbidden",
      "Forbidden"
    );

    // List reports with company scope
    const comp1Reports = await companyProductionService.listReports({}, company1.company_id);
    const comp2Reports = await companyProductionService.listReports({}, company2.company_id);
    assert(comp1Reports.total === 20, "Company 1 sees only its 20 reports");
    assert(comp2Reports.total === 1, "Company 2 sees only its 1 report");

    // Company Dashboard Isolation
    const comp1Dash = await companyProductionService.getCompanyDashboard(company1.company_id);
    const comp2Dash = await companyProductionService.getCompanyDashboard(company2.company_id);
    assert(comp1Dash.company_id === company1.company_id, "Company 1 Dashboard isolated");
    assert(comp2Dash.company_id === company2.company_id, "Company 2 Dashboard isolated");
    assert(comp1Dash.performances[0].performance.actual_quantity === 250, "Company 1 Dashboard shows 250t");
    assert(comp2Dash.performances[0].performance.actual_quantity === 50, "Company 2 Dashboard shows 50t");

    // Federal Dashboard Aggregation
    const fedDash = await companyProductionService.getFederalDashboard();
    assert(fedDash.kpis.active_assignments >= 2, "Federal Dashboard aggregates multiple assignments");
    assert(fedDash.kpis.reporting_companies >= 2, "Federal Dashboard tracks active reporting companies");

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log("\n[8] Cleaning up test records...");
    await db.CompanyProductionReport.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });
    await db.CompanyProductionTarget.destroy({
      where: { assignment_id: [assign1.assignment_id, assign2.assignment_id] },
      force: true,
    });
    await db.CompanyProductionAssignment.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });
    await db.ProductionItemUnit.destroy({
      where: { production_item_id: itemLithium.production_item_id },
      force: true,
    });
    await db.ProductionItem.destroy({
      where: { production_item_id: itemLithium.production_item_id },
      force: true,
    });
    await db.CompanyBrandingSetting.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });
    await db.Company.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });

    assert(true, "Test companies and production records cleaned up successfully");

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failedCount++;
  }

  console.log("\n========================================================");
  console.log(`  SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
