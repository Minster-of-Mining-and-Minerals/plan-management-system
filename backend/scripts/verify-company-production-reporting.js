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
  let assignLeap;
  let itemBauxite;
  let dailyFreq;
  let weeklyFreq;
  let monthlyFreq;

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

    dailyFreq = frequencies.find((f) => f.code === "daily");
    weeklyFreq = frequencies.find((f) => f.code === "weekly");
    monthlyFreq = frequencies.find((f) => f.code === "monthly");
    assert(dailyFreq && dailyFreq.interval_days === 1, "Daily reporting frequency available");
    assert(weeklyFreq && weeklyFreq.code === "weekly", "Weekly reporting frequency available");
    assert(monthlyFreq && monthlyFreq.code === "monthly", "Monthly reporting frequency available");

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
    // [7.5] PHASE 5.11 ENHANCEMENTS: ASSIGNMENT SETTINGS, FREQUENCY-ADAPTIVE REPORTING, COMPLIANCE & DRILL-DOWN
    // ----------------------------------------------------
    console.log("\n[7.5] Testing Phase 5.11 Enhancements (Tests A - F)...");

    // TEST A: Assignment Update (Settings, validation & integrity)
    console.log("  Running Test A: Edit Assignment Settings & Invariants...");
    const updatedAssign1 = await companyProductionService.updateAssignment(assign1.assignment_id, {
      effective_to: "2026-11-30",
      requires_review: true,
      notes: "Updated assignment review requirement and validity to Nov 30",
    });
    assert(updatedAssign1.effective_to === "2026-11-30", "Test A: Assignment effective_to updated to 2026-11-30");
    assert(updatedAssign1.requires_review === true, "Test A: Assignment requires_review updated to true");
    assert(updatedAssign1.notes.includes("Nov 30"), "Test A: Assignment notes updated");

    // Verify historical target records and report counts remain intact
    const assign1TargetCount = await db.CompanyProductionTarget.count({ where: { assignment_id: assign1.assignment_id } });
    assert(assign1TargetCount === 15, "Test A: Historical target records (15 across 3 versions) preserved intact");
    const assign1ReportCount = await db.CompanyProductionReport.count({ where: { assignment_id: assign1.assignment_id } });
    assert(assign1ReportCount === 20, "Test A: Existing submitted reports (20) preserved intact");

    // Validation: End date < Start date
    await assertThrowsAsync(
      () =>
        companyProductionService.updateAssignment(assign1.assignment_id, {
          effective_to: "2025-12-31",
        }),
      "Test A: Invalid date range (effective_to < effective_from) rejected",
      "earlier than"
    );

    // Validation: Unpermitted unit
    await assertThrowsAsync(
      () =>
        companyProductionService.updateAssignment(assign1.assignment_id, {
          default_reporting_unit_id: gramUnit.unit_id,
        }),
      "Test A: Setting default unit to unpermitted unit (g) rejected",
      "not permitted"
    );

    // Validation: Invalid frequency ID
    await assertThrowsAsync(
      () =>
        companyProductionService.updateAssignment(assign1.assignment_id, {
          reporting_frequency_id: uuidv4(),
        }),
      "Test A: Setting non-existent reporting_frequency_id rejected",
      "does not exist"
    );

    // TEST B: Daily submission
    console.log("  Running Test B: Daily Report Submission & Duplicate Protection...");
    const dailyRep = await companyProductionService.submitReport({
      company_id: company1.company_id,
      assignment_id: assign1.assignment_id,
      production_item_id: itemLithium.production_item_id,
      report_date: "2026-01-21",
      quantity_reported: 10,
      reported_unit_id: tonneUnit.unit_id,
      notes: "Day 21 report",
    });
    assert(dailyRep.period_label === "2026-01-21", "Test B: Daily report period_label is 2026-01-21");
    assert(Number(dailyRep.normalized_quantity) === 10, "Test B: Daily report normalized quantity is 10 tonnes");

    // Duplicate submission on same day rejected
    await assertThrowsAsync(
      () =>
        companyProductionService.submitReport({
          company_id: company1.company_id,
          assignment_id: assign1.assignment_id,
          production_item_id: itemLithium.production_item_id,
          report_date: "2026-01-21",
          quantity_reported: 15,
          reported_unit_id: tonneUnit.unit_id,
        }),
      "Test B: Duplicate daily report on same date rejected",
      "already been submitted"
    );

    // TEST C: Weekly submission
    console.log("  Running Test C: Weekly Report Submission & Convention...");
    // Update assign2 to weekly reporting frequency
    await companyProductionService.updateAssignment(assign2.assignment_id, {
      reporting_frequency_id: weeklyFreq.frequency_id,
    });
    const weeklyRep = await companyProductionService.submitReport({
      company_id: company2.company_id,
      assignment_id: assign2.assignment_id,
      production_item_id: itemLithium.production_item_id,
      report_date: "2026-02-01",
      period_label: "2026-W05",
      quantity_reported: 25,
      reported_unit_id: tonneUnit.unit_id,
      notes: "Week 5 production report",
    });
    assert(weeklyRep.period_label === "2026-W05", "Test C: Weekly report period_label is 2026-W05");
    assert(weeklyRep.report_date === "2026-02-01", "Test C: Weekly report representative end date is 2026-02-01");
    assert(Number(weeklyRep.normalized_quantity) === 25, "Test C: Weekly normalized quantity is 25 tonnes");

    // Duplicate weekly report on same report date rejected
    await assertThrowsAsync(
      () =>
        companyProductionService.submitReport({
          company_id: company2.company_id,
          assignment_id: assign2.assignment_id,
          production_item_id: itemLithium.production_item_id,
          report_date: "2026-02-01",
          period_label: "2026-W05",
          quantity_reported: 30,
          reported_unit_id: tonneUnit.unit_id,
        }),
      "Test C: Duplicate weekly report on same date rejected",
      "already been submitted"
    );

    // TEST D: Monthly submission (including February and Leap Year)
    console.log("  Running Test D: Monthly Report Submission & Leap Year...");
    // Update assign2 to monthly frequency
    await companyProductionService.updateAssignment(assign2.assignment_id, {
      reporting_frequency_id: monthlyFreq.frequency_id,
    });
    const monthlyRep2026 = await companyProductionService.submitReport({
      company_id: company2.company_id,
      assignment_id: assign2.assignment_id,
      production_item_id: itemLithium.production_item_id,
      report_date: "2026-02-28",
      period_label: "2026-02",
      quantity_reported: 120,
      reported_unit_id: tonneUnit.unit_id,
      notes: "February 2026 monthly report",
    });
    assert(monthlyRep2026.period_label === "2026-02", "Test D: Monthly report period_label is 2026-02");
    assert(monthlyRep2026.report_date === "2026-02-28", "Test D: Feb 2026 representative report date is 2026-02-28 (non-leap year)");
    assert(Number(monthlyRep2026.normalized_quantity) === 120, "Test D: Feb 2026 normalized quantity is 120 tonnes");

    // Create itemBauxite for Leap Year 2024 test
    itemBauxite = await productionConfigService.createProductionItem({
      name: `Bauxite ${testSuffix}`,
      code: `bauxite_${testSuffix}`,
      description: "Aluminum ore for metallurgical processing",
      category: "Industrial Minerals",
      base_unit_id: tonneUnit.unit_id,
      default_reporting_unit_id: tonneUnit.unit_id,
      supported_units: [
        { unit_id: tonneUnit.unit_id, conversion_factor_to_base: 1.0, is_default: true },
      ],
    });

    assignLeap = await companyProductionService.createAssignment({
      company_id: company2.company_id,
      production_item_id: itemBauxite.production_item_id,
      reporting_frequency_id: monthlyFreq.frequency_id,
      target_allocation_depth: "quarterly",
      default_reporting_unit_id: tonneUnit.unit_id,
      effective_from: "2024-01-01",
      effective_to: "2024-12-31",
      requires_review: false,
    });

    // Save target for 2024 Q1 (600 tonnes)
    await companyProductionService.saveTargetHierarchy({
      assignmentId: assignLeap.assignment_id,
      targets: [
        {
          target_period_type: "year",
          period_label: "2024",
          period_start_date: "2024-01-01",
          period_end_date: "2024-12-31",
          target_quantity: 2400,
          unit_id: tonneUnit.unit_id,
          children: [
            {
              target_period_type: "quarter",
              period_label: "2024-Q1",
              period_start_date: "2024-01-01",
              period_end_date: "2024-03-31",
              target_quantity: 600,
              unit_id: tonneUnit.unit_id,
            },
          ],
        },
      ],
      revisionReason: "2024 baseline targets",
    });

    // Submit leap year report for February 2024
    const leapMonthlyRep = await companyProductionService.submitReport({
      company_id: company2.company_id,
      assignment_id: assignLeap.assignment_id,
      production_item_id: itemBauxite.production_item_id,
      report_date: "2024-02-29",
      period_label: "2024-02",
      quantity_reported: 200,
      reported_unit_id: tonneUnit.unit_id,
      notes: "February 2024 leap year monthly report",
    });
    assert(leapMonthlyRep.period_label === "2024-02", "Test D: Leap year report period_label is 2024-02");
    assert(leapMonthlyRep.report_date === "2024-02-29", "Test D: Leap year Feb 2024 representative report date is 2024-02-29");

    // TEST E: Non-daily compliance calculation
    console.log("  Running Test E: Non-Daily Compliance Calculations...");
    const q12024Perf = await companyProductionService.calculateProductionPerformance({
      companyId: company2.company_id,
      productionItemId: itemBauxite.production_item_id,
      startDate: "2024-01-01",
      endDate: "2024-03-31",
      periodLabel: "2024-Q1",
      periodType: "quarter",
      asOfDate: "2024-03-31",
    });

    assert(q12024Perf.reporting_compliance.expected_reports === 3, "Test E: 3 expected reports for monthly frequency in 3-month window");
    assert(q12024Perf.reporting_compliance.submitted_reports === 1, "Test E: 1 submitted report");
    assert(q12024Perf.reporting_compliance.missing_reports === 2, "Test E: 2 missing reports (3 expected - 1 submitted)");
    assert(q12024Perf.reporting_compliance.compliance_rate === 33.3, "Test E: Compliance rate is 33.3% (1 / 3 * 100)");

    // Test future period compliance:
    const futurePerf = await companyProductionService.calculateProductionPerformance({
      companyId: company2.company_id,
      productionItemId: itemBauxite.production_item_id,
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      periodLabel: "2027",
      periodType: "year",
      asOfDate: "2026-10-26",
    });
    assert(futurePerf.reporting_compliance.expected_reports === 0, "Test E: Future period has 0 expected reports");
    assert(futurePerf.reporting_compliance.missing_reports === 0, "Test E: Future period has 0 missing reports (not overdue)");
    assert(futurePerf.reporting_compliance.compliance_rate === 100, "Test E: Future period compliance defaults cleanly to 100%");

    // TEST F: Quarterly Target Drill-Down
    console.log("  Running Test F: Quarterly Target Drill-Down...");
    const q1DrillDown = await companyProductionService.calculateProductionPerformance({
      companyId: company1.company_id,
      productionItemId: itemLithium.production_item_id,
      periodLabel: "2026-Q1",
      periodType: "quarter",
    });
    assert(q1DrillDown.has_target === true, "Test F: Q1 Drill-down has active target");
    assert(Number(q1DrillDown.target_quantity) === 2000, "Test F: Q1 Target is 2,000 tonnes");
    assert(Number(q1DrillDown.actual_quantity) === 260, "Test F: Q1 Actual is 260 tonnes (250t + 10t from Test B)");
    assert(Number(q1DrillDown.remaining_quantity) === 1740, "Test F: Q1 Remaining is 1,740 tonnes");
    assert(Number(q1DrillDown.achievement_percentage) === 13.0, "Test F: Q1 Achievement is 13.0% (260 / 2,000 * 100)");

    // Verify annual actual includes the exact same reports without duplication
    const annualPerfCheck = await companyProductionService.calculateProductionPerformance({
      companyId: company1.company_id,
      productionItemId: itemLithium.production_item_id,
      periodLabel: "2026",
      periodType: "year",
    });
    assert(Number(annualPerfCheck.target_quantity) === 12000, "Test F: Annual Target is 12,000 tonnes");
    assert(Number(annualPerfCheck.actual_quantity) === 260, "Test F: Annual actual is 260 tonnes (includes Q1 reports exactly once)");

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log("\n[8] Cleaning up test records...");
    await db.CompanyProductionReport.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });
    if (assignLeap) {
      await db.CompanyProductionTarget.destroy({
        where: { assignment_id: assignLeap.assignment_id },
        force: true,
      });
      await db.CompanyProductionAssignment.destroy({
        where: { assignment_id: assignLeap.assignment_id },
        force: true,
      });
    }
    await db.CompanyProductionTarget.destroy({
      where: { assignment_id: [assign1.assignment_id, assign2.assignment_id] },
      force: true,
    });
    await db.CompanyProductionAssignment.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
      force: true,
    });
    if (itemBauxite) {
      await db.ProductionItemUnit.destroy({
        where: { production_item_id: itemBauxite.production_item_id },
        force: true,
      });
      await db.ProductionItem.destroy({
        where: { production_item_id: itemBauxite.production_item_id },
        force: true,
      });
    }
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
