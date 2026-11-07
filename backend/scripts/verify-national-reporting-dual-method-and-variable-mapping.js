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

    assert(updatedConfig.national_reporting_method === "form_based", "Method set to form_based");
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

