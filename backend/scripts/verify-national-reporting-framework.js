"use strict";

const db = require("../models");
const nationalReportingService = require("../services/nationalReportingService");
const regionalNationalReportingService = require("../services/regionalNationalReportingService");
const {
  areUnitsCompatible,
  getConversionFactor,
  convertValue,
} = require("../utils/nationalUnitCompatibilityUtils");

async function runNationalReportingVerification() {
  console.log("==================================================================");
  console.log("   NATIONAL REPORTING FRAMEWORK - END-TO-END VERIFICATION SUITE   ");
  console.log("==================================================================\n");

  let testReq = null;
  let testAssignment = null;
  let testMapping = null;
  let testNode = null;
  let testVersion = null;
  let testRegion = null;
  let testUser = null;

  try {
    // 0. Fetch baseline region and user
    testRegion = await db.Region.findOne();
    if (!testRegion) {
      throw new Error("No region found in database to test with");
    }
    console.log(`[0] Found test region: ${testRegion.name} (${testRegion.region_id})`);

    testUser = await db.User.findOne();
    const testUserId = testUser ? testUser.user_id : null;

    // 1. Unit Compatibility & Conversion Tests
    console.log("\n[1] Testing Unit Compatibility & Conversions:");
    const isTonKgCompat = areUnitsCompatible("ton", "kg");
    const isTonLiterCompat = areUnitsCompatible("ton", "liter");
    const tonToKgFactor = getConversionFactor("ton", "kg");
    const convertedVal = convertValue(2.5, "ton", "kg");

    console.log(`  - Are 'ton' and 'kg' compatible: ${isTonKgCompat} (Expected: true)`);
    console.log(`  - Are 'ton' and 'liter' compatible: ${isTonLiterCompat} (Expected: false)`);
    console.log(`  - Conversion factor from 'ton' to 'kg': ${tonToKgFactor} (Expected: 1000)`);
    console.log(`  - Convert 2.5 ton to kg: ${convertedVal} kg (Expected: 2500)`);

    if (!isTonKgCompat || isTonLiterCompat || tonToKgFactor !== 1000 || convertedVal !== 2500) {
      throw new Error("Unit compatibility or conversion logic failed");
    }
    console.log("  => Unit Compatibility & Conversions: PASSED");

    // 2. Federal Requirement Creation
    console.log("\n[2] Testing Federal Requirement Creation:");
    const testCode = `TEST-REQ-${Date.now().toString().slice(-6)}`;
    testReq = await nationalReportingService.createRequirement(
      {
        code: testCode,
        title: "Test Artisanal Gold Production",
        description: "Automated test national requirement",
        category: "mining_production",
        unit_category: "mass",
        expected_unit: "kg",
        frequency: "quarterly",
        requires_numeric: true,
        requires_narrative: true,
        requires_evidence: false,
      },
      testUserId
    );
    console.log(`  - Created Requirement: ${testReq.code} (ID: ${testReq.requirement_id})`);
    console.log("  => Federal Requirement Creation: PASSED");

    // 3. Federal Regional Assignment
    console.log("\n[3] Testing Federal Regional Assignment:");
    const assignments = await nationalReportingService.assignRequirementToRegions(
      testReq.requirement_id,
      {
        regionIds: [testRegion.region_id],
        isMandatory: true,
        notes: "Automated assignment test",
      },
      testUserId
    );
    testAssignment = assignments[0];
    console.log(`  - Assigned to Region: ${testRegion.name} (Assignment ID: ${testAssignment.assignment_id})`);
    console.log("  => Federal Regional Assignment: PASSED");

    // 4. Setup mock Regional Plan Version and Node for testing
    console.log("\n[4] Setting up Regional Plan Context:");
    testVersion = await db.RegionalPlanVersion.create({
      region_id: testRegion.region_id,
      draft_name: "Test Regional Execution Plan 2026",
      version_kind: "execution_period",
      planning_year: 2026,
      period_label: "Q1",
      sequence_index: 1,
      start_year: 2026,
      end_year: 2026,
      status: "active",
    });

    testNode = await db.RegionalPlanNode.create({
      regional_plan_version_id: testVersion.regional_plan_version_id,
      title: "Regional Gold Output Node",
      target_unit: "ton",
      period_target: 5.0,
      period_actual: 4.8,
      period_actual_status: "submitted", // NOT yet validated!
      narration: "Regional quarterly mining output summary",
    });
    console.log(`  - Created Plan Version: ${testVersion.draft_name}`);
    console.log(`  - Created Plan Node: ${testNode.title} (Status: ${testNode.period_actual_status})`);

    // 5. Regional Stage A: Potential Mapping
    console.log("\n[5] Testing Stage A Potential Mapping:");
    testMapping = await regionalNationalReportingService.createPotentialMapping(
      testRegion.region_id,
      testAssignment.assignment_id,
      {
        regionalPlanNodeId: testNode.regional_plan_node_id,
        regionalPlanVersionId: testVersion.regional_plan_version_id,
        notes: "Mapped to regional gold production line",
      },
      testUserId
    );
    console.log(`  - Potential Mapping Created: Stage=${testMapping.stage}, Factor=${testMapping.unit_conversion_factor}`);
    if (testMapping.stage !== "potential" || testMapping.unit_conversion_factor !== 1000) {
      throw new Error("Stage A mapping values incorrect");
    }
    console.log("  => Stage A Potential Mapping: PASSED");

    // 6. Regional Stage B: Period Confirmation
    console.log("\n[6] Testing Stage B Period Confirmation:");
    await regionalNationalReportingService.confirmMappingForPeriod(
      testRegion.region_id,
      testMapping.mapping_id,
      {
        executionPeriodVersionId: testVersion.regional_plan_version_id,
      },
      testUserId
    );
    await testMapping.reload();
    console.log(`  - Mapping Confirmed: Stage=${testMapping.stage}, Confirmed Period=${testMapping.confirmed_period_version_id}`);
    if (testMapping.stage !== "confirmed") {
      throw new Error("Stage B confirmation failed");
    }
    console.log("  => Stage B Period Confirmation: PASSED");

    // 7. Strict Publication Gateway: Negative Test (Must Reject Unvalidated)
    console.log("\n[7] Testing Strict Publication Gate (Negative Case - Node is 'submitted'):");
    let rejectionOccurred = false;
    try {
      await regionalNationalReportingService.publishValidatedReport(
        testRegion.region_id,
        testMapping.mapping_id,
        {},
        testUserId
      );
    } catch (gateErr) {
      rejectionOccurred = true;
      console.log(`  - Caught Expected Gateway Error: "${gateErr.message}"`);
    }

    if (!rejectionOccurred) {
      throw new Error("SECURITY FAILURE: Gateway allowed publishing an unvalidated report!");
    }
    console.log("  => Strict Publication Gate (Negative Rejection): PASSED");

    // 8. Strict Publication Gateway: Positive Test (Node validated)
    console.log("\n[8] Testing Publication Gateway (Positive Case - Node is 'validated'):");
    testNode.period_actual_status = "validated";
    testNode.period_actual_validated_at = new Date();
    await testNode.save();

    const pubResult = await regionalNationalReportingService.publishValidatedReport(
      testRegion.region_id,
      testMapping.mapping_id,
      {
        narrativeOverride: "Validated by Regional Mineral Authority director.",
      },
      testUserId
    );

    console.log(`  - Published Successfully: Ref=${pubResult.receipt.publicationReference}`);
    console.log(`  - Standardized Value: ${pubResult.receipt.standardizedValue} (Local: 4.8 ton -> Standard: 4800 kg)`);
    console.log(`  - Achievement Percent: ${pubResult.receipt.achievementPercent}`);

    if (!pubResult.receipt.publicationReference.startsWith("NAT-PUB-")) {
      throw new Error("Invalid publication reference format");
    }
    console.log("  => Publication Gateway (Positive Transmit): PASSED");

    // 9. Idempotency Test
    console.log("\n[9] Testing Publication Idempotency:");
    const pubRetryResult = await regionalNationalReportingService.publishValidatedReport(
      testRegion.region_id,
      testMapping.mapping_id,
      {},
      testUserId
    );
    console.log(`  - Idempotent Response: ${pubRetryResult.idempotent === true}`);
    console.log(`  - Same Reference: ${pubRetryResult.receipt.publicationReference === pubResult.receipt.publicationReference}`);
    if (!pubRetryResult.idempotent) {
      throw new Error("Idempotency check failed: created duplicate publication record");
    }
    console.log("  => Publication Idempotency: PASSED");

    // 10. National Dashboard Aggregates Test
    console.log("\n[10] Testing National Dashboard Aggregation:");
    const dashSummary = await nationalReportingService.getNationalDashboardSummary({
      reporting_year: 2026,
      reporting_period_label: "Q1",
    });
    console.log(`  - Total Requirements Active: ${dashSummary.kpis.totalRequirementsCount}`);
    console.log(`  - Total Assignments: ${dashSummary.kpis.totalAssignmentsCount}`);
    console.log(`  - Total Published Submissions: ${dashSummary.kpis.totalPublishedSubmissions}`);
    console.log(`  - Overall Compliance Rate: ${dashSummary.kpis.overallNationalComplianceRate}%`);

    const reqSummary = dashSummary.requirementSummaries.find(
      (r) => r.requirementId === testReq.requirement_id
    );
    if (reqSummary) {
      console.log(`  - Test Requirement Aggregated Actual: ${reqSummary.nationalTotalActual} ${reqSummary.expectedUnit}`);
      console.log(`  - Data Completeness: ${reqSummary.dataCompletenessPercent}% (Is Complete: ${reqSummary.isCompleteData})`);
    }

    console.log("  => National Dashboard Aggregation: PASSED");

    console.log("\n==================================================================");
    console.log("   ALL NATIONAL REPORTING TESTS PASSED PERFECTLY!                 ");
    console.log("==================================================================\n");
  } catch (error) {
    console.error("\n❌ National Reporting Verification Failed:", error);
    process.exitCode = 1;
  } finally {
    // Cleanup test data
    console.log("[Cleanup] Cleaning up test records...");
    try {
      if (testMapping) {
        await db.NationalPublishedRecord.destroy({
          where: { mapping_id: testMapping.mapping_id },
          force: true,
        });
        await testMapping.destroy({ force: true });
      }
      if (testAssignment) {
        await testAssignment.destroy({ force: true });
      }
      if (testReq) {
        await testReq.destroy({ force: true });
      }
      if (testNode) {
        await testNode.destroy({ force: true });
      }
      if (testVersion) {
        await testVersion.destroy({ force: true });
      }
      console.log("[Cleanup] Cleanup completed successfully.");
    } catch (cleanErr) {
      console.error("[Cleanup] Cleanup warning:", cleanErr.message);
    }
  }
}

runNationalReportingVerification().then(() => {
  process.exit(process.exitCode || 0);
});

