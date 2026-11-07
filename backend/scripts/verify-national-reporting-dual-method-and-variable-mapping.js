"use strict";

const db = require("../models");
const regionalNationalReportingService = require("../services/regionalNationalReportingService");
const nationalReportingService = require("../services/nationalReportingService");
const {
  areUnitsCompatible,
  getConversionFactor,
  convertValue,
  getUnitCategory,
} = require("../utils/nationalUnitCompatibilityUtils");

const {
  Region,
  NationalReportingRequirement,
  NationalReportingAssignment,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  RegionalPlanningConfiguration,
  User,
} = db;

async function runVerification() {
  console.log("==================================================================");
  console.log("STARTING NATIONAL REPORTING DUAL METHOD & VARIABLE MAPPING TEST");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Unit Compatibility and Stem/Synonym Resolution
    // -------------------------------------------------------------
    console.log("\n--- TEST 1: Unit Compatibility & Synonym Matching ---");
    assert(areUnitsCompatible("Datasets", "datasets"), "Case 1: 'Datasets' vs 'datasets' matches");
    assert(areUnitsCompatible("datasets", "dataset"), "Plural stem: 'datasets' vs 'dataset' matches");
    assert(areUnitsCompatible("Percentage", "percent"), "Category percentage: 'Percentage' vs 'percent' matches");
    assert(areUnitsCompatible("Percentage", "%"), "Symbol percentage: 'Percentage' vs '%' matches");
    assert(areUnitsCompatible("Occurrences", "occurrences"), "Custom count: 'Occurrences' vs 'occurrences' matches");
    assert(areUnitsCompatible("metric_ton", "kg"), "Mass conversion: 'metric_ton' vs 'kg' matches");
    assert(getConversionFactor("kg", "metric_ton") === 0.001, "Conversion factor kg -> metric_ton is 0.001");
    assert(getConversionFactor("metric_ton", "kg") === 1000, "Conversion factor metric_ton -> kg is 1000");
    assert(areUnitsCompatible("licenses", "license"), "Count synonyms: 'licenses' vs 'license' matches");
    assert(!areUnitsCompatible("kg", "birr"), "Case 2: Mismatch correctly rejected: 'kg' vs 'birr'");
    assert(areUnitsCompatible(null, "count"), "Case 3: Unconfigured regional unit falls back safely");
    assert(areUnitsCompatible("kg", null), "Case 4: Unconfigured national requirement unit falls back safely");

    // -------------------------------------------------------------
    // TEST 2: Per-Region Reporting Method Controls
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: Per-Region Reporting Method Controls ---");
    let testRegion = await Region.findOne({ where: { is_active: true } });
    if (!testRegion) {
      testRegion = await Region.create({
        name: "Test Dual Reporting Region " + Date.now(),
        code: "TDR" + Math.floor(Math.random() * 1000),
        is_active: true,
      });
    }

    const initialConfig = await regionalNationalReportingService.getRegionReportingConfig(testRegion.region_id);
    assert(initialConfig && initialConfig.region_id === testRegion.region_id, "Get region reporting config succeeded");
    console.log("Initial Config:", initialConfig);

    // Update region to Option B (form-based) with active status
    const updatedConfig = await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      {
        national_reporting_method: "form_based",
        form_reporting_active: true,
        form_reporting_start_date: "2020-01-01",
        form_reporting_end_date: "2030-12-31",
        form_reporting_notes: "Activated for temporary direct form submissions during regional transition",
      },
      null
    );

    assert(updatedConfig.node_mapping_available === true, "Node mapping is permanent and always available");
    assert(updatedConfig.form_reporting_active === true, "form_reporting_active is true");
    assert(updatedConfig.is_form_reporting_effective === true, "Form reporting is currently effective within date range");

    // Test Expiration Check
    const expiredConfig = await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      {
        form_reporting_end_date: "2020-01-01", // Past date
      },
      null
    );
    assert(expiredConfig.is_form_reporting_effective === false, "Expired end_date renders form reporting ineffective");

    // Reactivate for subsequent tests
    await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      {
        form_reporting_end_date: "2035-12-31",
      },
      null
    );

    // -------------------------------------------------------------
    // TEST 3: Direct Form Submission & Idempotent/Duplicate Prevention
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: Option B Direct Form Reporting & Duplicate Prevention ---");
    // Find or create a test requirement
    let testReq = await NationalReportingRequirement.findOne({ where: { is_active: true } });
    if (!testReq) {
      testReq = await NationalReportingRequirement.create({
        code: "TEST-KPI-DUAL-" + Date.now(),
        title: "Test Dual Reporting KPI " + Date.now(),
        category: "mining_and_extractive",
        unit_category: "mass",
        expected_unit: "metric_ton",
        frequency: "quarterly",
        is_active: true,
      });
    }

    // Ensure assigned to region
    let [assignment] = await NationalReportingAssignment.findOrCreate({
      where: {
        requirement_id: testReq.requirement_id,
        region_id: testRegion.region_id,
      },
      defaults: {
        is_mandatory: true,
        status: "active",
      },
    });

    const testYear = 2026;
    const testPeriod = "Q3_DUAL_TEST";

    // 3.1 First submission
    const sub1 = await regionalNationalReportingService.submitDirectFormReport(
      testRegion.region_id,
      {
        assignmentId: assignment.assignment_id,
        reportingYear: testYear,
        reportingPeriodLabel: testPeriod,
        plannedTarget: 100,
        reportedActual: 85,
        localUnit: testReq.expected_unit,
        narrative: "Initial Q3 submission via direct form",
      },
      null
    );

    assert(sub1 && sub1.publishedRecord, "First direct form submission succeeded");
    assert(sub1.publishedRecord.submission_method === "form_based", "Record has submission_method = 'form_based'");
    assert(sub1.publishedRecord.status === "published", "Record status is 'published'");
    assert(sub1.publishedRecord.achievement_percent === 85.0, "Achievement percent correctly calculated (85%)");

    const recordId1 = sub1.publishedRecord.published_record_id;

    // 3.2 Second submission for the SAME requirement and period (updated performance)
    const sub2 = await regionalNationalReportingService.submitDirectFormReport(
      testRegion.region_id,
      {
        assignmentId: assignment.assignment_id,
        reportingYear: testYear,
        reportingPeriodLabel: testPeriod,
        plannedTarget: 100,
        reportedActual: 95, // Revised actual
        localUnit: testReq.expected_unit,
        narrative: "Revised Q3 submission via direct form with updated execution records",
      },
      null
    );

    assert(sub2 && sub2.publishedRecord, "Second direct form submission succeeded");
    assert(sub2.publishedRecord.revision_number === 2, "Revision number incremented to 2");
    assert(sub2.publishedRecord.achievement_percent === 95.0, "Achievement percent updated to 95%");

    // Verify first record was marked superseded
    const prevRecord = await NationalPublishedRecord.findByPk(recordId1);
    assert(prevRecord.status === "superseded", "Previous record marked status = 'superseded'");
    assert(prevRecord.superseded_by_id === sub2.publishedRecord.published_record_id, "Previous record linked to new record via superseded_by_id");

    // 3.3 Dashboard Summary check: ensure only the 1 active record is aggregated (NO DOUBLE COUNTING)
    const summary = await nationalReportingService.getNationalDashboardSummary({
      reporting_year: testYear,
      reporting_period_label: testPeriod,
    });

    const reqStats = summary.requirements?.find((r) => r.requirement_id === testReq.requirement_id);
    if (reqStats) {
      assert(reqStats.reporting_regions_count === 1, "National aggregation counts exactly 1 active region for this requirement");
      assert(reqStats.total_actual === 95, "Total actual equals updated submission (95, not 85+95=180)");
      console.log(`Aggregation stats: total_target=${reqStats.total_target}, total_actual=${reqStats.total_actual}, regions_count=${reqStats.reporting_regions_count}`);
    } else {
      console.log("No specific filter match in dashboard summary, verifying directly via active published count");
      const activePubs = await NationalPublishedRecord.count({
        where: {
          requirement_id: testReq.requirement_id,
          region_id: testRegion.region_id,
          reporting_year: testYear,
          reporting_period_label: testPeriod,
          status: "published",
        },
      });
      assert(activePubs === 1, "Exactly 1 active published record in database");
    }

    // -------------------------------------------------------------
    // TEST 4: Disabling Form Reporting preserves historical records & switches back to Option A
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Disabling Form Reporting & Preservation ---");
    await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      {
        form_reporting_active: false,
        national_reporting_method: "node_mapping",
      },
      null
    );

    // Try submitting form while deactivated -> expect 403 error
    let blockedAsExpected = false;
    try {
      await regionalNationalReportingService.submitDirectFormReport(
        testRegion.region_id,
        {
          assignmentId: assignment.assignment_id,
          reportingYear: testYear,
          reportingPeriodLabel: "Q4_BLOCKED_TEST",
          plannedTarget: 50,
          reportedActual: 50,
        },
        null
      );
    } catch (err) {
      blockedAsExpected = err.status === 403;
      console.log("Deactivated form submission blocked with message:", err.message);
    }
    assert(blockedAsExpected, "Form submission correctly blocked when form_reporting_active is false");

    // Verify historical published records are still intact
    const historicalCount = await NationalPublishedRecord.count({
      where: {
        requirement_id: testReq.requirement_id,
        region_id: testRegion.region_id,
      },
    });
    assert(historicalCount >= 2, `Historical records preserved after deactivation (count: ${historicalCount})`);

    // -------------------------------------------------------------
    // TEST 5: Annual Period Derivation & Period Generation
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Annual Period Derivation & Period Generation ---");
    const {
      calculateAnnualEndDate,
      validateAnnualDateRange,
      generateReportingPeriods,
      getExpectedPeriodCount,
    } = require("../utils/nationalReportingPeriodUtils");

    const testStartDate = "2026-07-01";
    const testEndDate = calculateAnnualEndDate(testStartDate);
    assert(testEndDate === "2027-06-30", `calculateAnnualEndDate correctly returns 2027-06-30 (got: ${testEndDate})`);

    const validCheck = validateAnnualDateRange(testStartDate, testEndDate);
    assert(validCheck.valid === true, `validateAnnualDateRange confirms 365-day range is valid`);

    const invalidCheck = validateAnnualDateRange("2026-07-01", "2026-10-01");
    assert(invalidCheck.valid === false, `validateAnnualDateRange rejects invalid short range (~92 days)`);

    const monthlyPeriods = generateReportingPeriods(testStartDate, testEndDate, "monthly");
    assert(monthlyPeriods.length === 12, `Monthly frequency generates exactly 12 periods (got: ${monthlyPeriods.length})`);
    assert(monthlyPeriods[0].period_label === "Month 1" && monthlyPeriods[11].period_label === "Month 12", "Monthly period labels match Month 1 .. Month 12");

    const quarterlyPeriods = generateReportingPeriods(testStartDate, testEndDate, "quarterly");
    assert(quarterlyPeriods.length === 4, `Quarterly frequency generates exactly 4 periods (got: ${quarterlyPeriods.length})`);
    assert(quarterlyPeriods[0].period_label === "Q1" && quarterlyPeriods[0].start_date === "2026-07-01", "Q1 starts on configured annual start date 2026-07-01");
    assert(quarterlyPeriods[3].period_label === "Q4" && quarterlyPeriods[3].end_date === "2027-06-30", "Q4 ends on configured annual end date 2027-06-30");

    const semiannualPeriods = generateReportingPeriods(testStartDate, testEndDate, "semi_annually");
    assert(semiannualPeriods.length === 2, `Semi-annual frequency generates exactly 2 periods (got: ${semiannualPeriods.length})`);

    const annualPeriods = generateReportingPeriods(testStartDate, testEndDate, "annually");
    assert(annualPeriods.length === 1, `Annual frequency generates exactly 1 period (got: ${annualPeriods.length})`);

    // -------------------------------------------------------------
    // TEST 6: Multi-Period Recurring KPI Submissions (No Overwriting)
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Multi-Period Recurring Submissions (No Overwriting) ---");
    // Reactivate form reporting for testRegion
    await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      {
        form_reporting_active: true,
        form_reporting_start_date: "2026-07-01",
        form_reporting_end_date: "2027-06-30",
        form_reporting_notes: "Testing multi-period recurring submissions",
      },
      null
    );

    // Create a new requirement with the fiscal calendar
    const recurringReq = await NationalReportingRequirement.create({
      code: "TEST-RECURRING-" + Date.now(),
      title: "Test Recurring Multi-Period Submissions " + Date.now(),
      category: "mining_and_extractive",
      unit_category: "mass",
      expected_unit: "kg",
      frequency: "quarterly",
      effective_start_date: "2026-07-01",
      effective_end_date: "2027-06-30",
      is_active: true,
    });

    const [recurringAssign] = await NationalReportingAssignment.findOrCreate({
      where: {
        requirement_id: recurringReq.requirement_id,
        region_id: testRegion.region_id,
      },
      defaults: { is_mandatory: true, status: "active" },
    });

    // 6.1 Submit Period Q1
    const q1Sub = await regionalNationalReportingService.submitDirectFormReport(
      testRegion.region_id,
      {
        assignmentId: recurringAssign.assignment_id,
        reportingYear: 2026,
        reportingPeriodLabel: "Q1",
        plannedTarget: 500,
        reportedActual: 480,
        localUnit: "kg",
        narrative: "Submitting Q1 report",
      },
      null
    );
    assert(q1Sub && q1Sub.publishedRecord, "Q1 submission succeeded");

    // 6.2 Submit Period Q2
    const q2Sub = await regionalNationalReportingService.submitDirectFormReport(
      testRegion.region_id,
      {
        assignmentId: recurringAssign.assignment_id,
        reportingYear: 2026,
        reportingPeriodLabel: "Q2",
        plannedTarget: 600,
        reportedActual: 620,
        localUnit: "kg",
        narrative: "Submitting subsequent Q2 report",
      },
      null
    );
    assert(q2Sub && q2Sub.publishedRecord, "Q2 submission succeeded");

    // 6.3 Verify Q1 is NOT overwritten by Q2 submission
    const q1Record = await NationalPublishedRecord.findOne({
      where: {
        requirement_id: recurringReq.requirement_id,
        region_id: testRegion.region_id,
        reporting_year: 2026,
        reporting_period_label: "Q1",
        status: "published",
      },
    });
    assert(q1Record !== null, "Q1 record still exists with status = 'published'");
    assert(Number(q1Record.planned_target) === 500, `Q1 planned target is still 500 (not overwritten, got: ${q1Record.planned_target})`);
    assert(Number(q1Record.reported_actual) === 480, `Q1 reported actual is still 480 (not overwritten, got: ${q1Record.reported_actual})`);

    const q2Record = await NationalPublishedRecord.findOne({
      where: {
        requirement_id: recurringReq.requirement_id,
        region_id: testRegion.region_id,
        reporting_year: 2026,
        reporting_period_label: "Q2",
        status: "published",
      },
    });
    assert(q2Record !== null, "Q2 record exists with status = 'published'");
    assert(Number(q2Record.planned_target) === 600, `Q2 planned target is 600 (got: ${q2Record.planned_target})`);
    assert(Number(q2Record.reported_actual) === 620, `Q2 reported actual is 620 (got: ${q2Record.reported_actual})`);

    // 6.4 Verify listAssignedRequirementsForRegion returns period-by-period granularity
    const assignedList = await regionalNationalReportingService.listAssignedRequirementsForRegion(testRegion.region_id);
    const assignedReq = assignedList.find((a) => a.requirement_id === recurringReq.requirement_id);
    assert(assignedReq !== undefined, "Found assigned requirement in regional list");
    assert(assignedReq.recurringPeriods && assignedReq.recurringPeriods.length === 4, "assigned requirement has 4 recurringPeriods");

    const pQ1 = assignedReq.recurringPeriods.find((p) => p.period_label === "Q1");
    const pQ2 = assignedReq.recurringPeriods.find((p) => p.period_label === "Q2");
    const pQ3 = assignedReq.recurringPeriods.find((p) => p.period_label === "Q3");

    assert(pQ1 && pQ1.status === "published" && Number(pQ1.reported_actual) === 480, "pQ1 has status published and actual 480");
    assert(pQ2 && pQ2.status === "published" && Number(pQ2.reported_actual) === 620, "pQ2 has status published and actual 620");
    assert(pQ3 && pQ3.status === "unmapped" && pQ3.reported_actual === null, "pQ3 is unmapped and unreported");

    // -------------------------------------------------------------
    // TEST 7: Node Mapping Permanent Availability Verification
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Regional Plan-Node Mapping Permanent Availability ---");
    const cfgActive = await regionalNationalReportingService.getRegionReportingConfig(testRegion.region_id);
    assert(cfgActive.node_mapping_available === true, "Node mapping available when form reporting active");

    await regionalNationalReportingService.updateRegionReportingConfig(
      testRegion.region_id,
      { form_reporting_active: false },
      null
    );
    const cfgDisabled = await regionalNationalReportingService.getRegionReportingConfig(testRegion.region_id);
    assert(cfgDisabled.node_mapping_available === true, "Node mapping STILL available when form reporting disabled");
    assert(cfgDisabled.form_reporting_active === false, "Form reporting confirmed disabled");

    console.log("\n==================================================================");
    console.log(`ALL VERIFICATION TESTS FINISHED: Passed: ${passed}, Failed: ${failed}`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("FATAL ERROR DURING VERIFICATION:", err);
    process.exit(1);
  }
}

runVerification();

