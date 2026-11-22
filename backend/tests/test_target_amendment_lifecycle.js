"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  Company,
  CompanyLicense,
  LicenseType,
  ProductionItem,
  ProductionReportingFrequency,
  CompanyProductionAssignment,
  CompanyProductionTarget,
  CompanyProductionTargetAmendment,
  CompanyProductionTargetApprovalHistory,
  CompanyProductionReport,
  GoldMeasurementUnit,
  User,
} = require("../models");
const companyProductionService = require("../services/production/companyProductionService");

async function runTests() {
  console.log("==============================================================================");
  console.log("STARTING TEST SUITE: COMPANY TARGET LIFECYCLE & AMENDMENT WORKFLOW");
  console.log("==============================================================================");

  let assignment;
  let testCompany;
  let testLicense;
  let testItem;
  let testFreq;
  let testUnit;
  let adminUser;
  let companyUser;

  try {
    // 0. Setup test prerequisites
    testCompany = await Company.findOne();
    if (!testCompany) throw new Error("No company found in database.");

    testItem = await ProductionItem.findOne({
      include: [{ model: GoldMeasurementUnit, as: "baseUnit" }],
    });
    if (!testItem) throw new Error("No production item found in database.");

    testUnit = testItem.baseUnit || (await GoldMeasurementUnit.findOne());
    testFreq = await ProductionReportingFrequency.findOne();
    adminUser = (await User.findOne({ where: { email: { [Op.like]: "%admin%" } } })) || (await User.findOne());
    companyUser = (await User.findOne({ where: { email: { [Op.like]: "%test_user%" } } })) || adminUser;

    testLicense = await CompanyLicense.findOne({ where: { status: "active" } });
    if (testLicense) {
      testCompany = await Company.findByPk(testLicense.company_id);
    } else {
      const anyType = await LicenseType.findOne();
      testLicense = await CompanyLicense.create({
        company_id: testCompany.company_id,
        license_type_id: anyType.license_type_id,
        license_number: `TEST-LIC-${Date.now().toString().slice(-6)}`,
        status: "active",
        effective_start_date: "2026-01-01",
        effective_end_date: "2030-12-31",
      });
    }

    // Create a fresh test assignment
    assignment = await CompanyProductionAssignment.create({
      company_id: testCompany.company_id,
      license_id: testLicense.license_id,
      production_item_id: testItem.production_item_id,
      reporting_frequency_id: testFreq.frequency_id,
      default_reporting_unit_id: testUnit.unit_id,
      target_allocation_depth: "quarter",
      effective_from: "2026-07-08",
      effective_to: "2027-07-07",
      is_active: true,
      created_by: adminUser.user_id,
    });
    console.log(`[SETUP] Created test assignment: ${assignment.assignment_id}`);

    const quarterAllocations = [
      {
        target_period_type: "quarter",
        period_label: "Q1 2026/27",
        period_start_date: "2026-07-08",
        period_end_date: "2026-10-07",
        target_quantity: 300,
      },
      {
        target_period_type: "quarter",
        period_label: "Q2 2026/27",
        period_start_date: "2026-10-08",
        period_end_date: "2027-01-07",
        target_quantity: 300,
      },
      {
        target_period_type: "quarter",
        period_label: "Q3 2026/27",
        period_start_date: "2027-01-08",
        period_end_date: "2027-04-07",
        target_quantity: 300,
      },
      {
        target_period_type: "quarter",
        period_label: "Q4 2026/27",
        period_start_date: "2027-04-08",
        period_end_date: "2027-07-07",
        target_quantity: 300,
      },
    ];

    // SCENARIO 1: Initial Target Proposal, Review & Approval
    console.log("\n--- SCENARIO 1: Initial Target Proposal & Federal Approval ---");
    const proposalV1 = await companyProductionService.saveTargetProposal({
      assignmentId: assignment.assignment_id,
      annualTarget: 1200,
      periodType: "quarter",
      periodAllocations: quarterAllocations,
      submissionNotes: "Initial proposed production plan for 1,200 KG.",
      userId: companyUser.user_id,
      autoSubmit: true,
      companyScope: testCompany.company_id,
    });
    console.log(`[PASS] Proposed and submitted initial target. Status: ${proposalV1.status}`);

    const approvedProposal = await companyProductionService.reviewTargetProposal({
      assignmentId: assignment.assignment_id,
      versionNumber: proposalV1.version_number,
      decision: "approved",
      reviewComments: "Federal Ministry approves 1,200 KG annual target.",
      userId: adminUser.user_id,
    });
    console.log(`[PASS] Federal approved proposal. New Status: ${approvedProposal.status}`);

    // Verify reporting is unlocked
    const detailAfterApproval = await companyProductionService.getProductionDetail(assignment.assignment_id);
    if (!detailAfterApproval.isReportingUnlocked) {
      throw new Error("Reporting should be unlocked after target approval.");
    }
    console.log(`[PASS] Production reporting unlocked: ${detailAfterApproval.isReportingUnlocked}`);

    // SCENARIO 4: Approved Target Locking (Mandatory Rule)
    console.log("\n--- SCENARIO 4: Approved Target Locking Verification ---");
    try {
      await companyProductionService.saveTargetProposal({
        assignmentId: assignment.assignment_id,
        annualTarget: 1400,
        periodType: "quarter",
        periodAllocations: quarterAllocations,
        userId: companyUser.user_id,
      });
      throw new Error("FAILED: Direct modification of approved target was unexpectedly permitted!");
    } catch (err) {
      if (err.status === 403 && err.message.includes("permanently locked")) {
        console.log(`[PASS] Direct modification strictly rejected with HTTP 403: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // SCENARIO 5: Formal Target Amendment Request Workflow
    console.log("\n--- SCENARIO 5: Submit Target Amendment (1,200 KG -> 1,500 KG) ---");
    const amendedQuarterAllocations = [
      {
        target_period_type: "quarter",
        period_label: "Q1 2026/27",
        period_start_date: "2026-07-08",
        period_end_date: "2026-10-07",
        target_quantity: 350,
      },
      {
        target_period_type: "quarter",
        period_label: "Q2 2026/27",
        period_start_date: "2026-10-08",
        period_end_date: "2027-01-07",
        target_quantity: 350,
      },
      {
        target_period_type: "quarter",
        period_label: "Q3 2026/27",
        period_start_date: "2027-01-08",
        period_end_date: "2027-04-07",
        target_quantity: 400,
      },
      {
        target_period_type: "quarter",
        period_label: "Q4 2026/27",
        period_start_date: "2027-04-08",
        period_end_date: "2027-07-07",
        target_quantity: 400,
      },
    ];

    const amendmentComparison = await companyProductionService.submitTargetAmendment({
      assignmentId: assignment.assignment_id,
      proposedAnnualTarget: 1500,
      periodAllocations: amendedQuarterAllocations,
      amendmentReason: "Upgraded milling capacity and higher ore recovery rate.",
      effectiveDate: "2026-10-08",
      submissionNotes: "Engineering report attached.",
      userId: companyUser.user_id,
      companyScope: testCompany.company_id,
    });

    const amd = amendmentComparison.amendment;
    console.log(`[PASS] Submitted amendment: Reference: ${amd.amendment_reference}, Status: ${amd.status}`);
    console.log(
      `[PASS] Annual Comparison: Approved ${amendmentComparison.annualComparison.approved_annual} vs Proposed ${amendmentComparison.annualComparison.proposed_annual} (Delta: +${amendmentComparison.annualComparison.difference})`
    );

    // CRITICAL CHECK: Currently approved target must remain 1,200 KG and ACTIVE while amendment is pending
    const detailDuringAmendment = await companyProductionService.getProductionDetail(assignment.assignment_id);
    if (Number(detailDuringAmendment.approvedTarget.target_quantity) !== 1200) {
      throw new Error("FAILED: Approved target was overwritten by pending amendment!");
    }
    console.log(
      `[PASS] Active approved target remains intact at ${detailDuringAmendment.approvedTarget.target_quantity} KG while amendment is pending.`
    );

    // SCENARIO 6: Duplicate amendment prevention
    console.log("\n--- SCENARIO 6: Duplicate Amendment Prevention ---");
    try {
      await companyProductionService.submitTargetAmendment({
        assignmentId: assignment.assignment_id,
        proposedAnnualTarget: 1600,
        periodAllocations: amendedQuarterAllocations,
        amendmentReason: "Another amendment request.",
        userId: companyUser.user_id,
      });
      throw new Error("FAILED: Duplicate amendment request was unexpectedly permitted!");
    } catch (err) {
      if (err.status === 400 && err.message.includes("Duplicate requests are not permitted")) {
        console.log(`[PASS] Duplicate amendment request prevented with HTTP 400: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // SCENARIO 7: Federal Rejection Requires Mandatory Reason
    console.log("\n--- SCENARIO 7: Mandatory Comment Requirement on Decision ---");
    try {
      await companyProductionService.reviewTargetAmendment({
        amendmentId: amd.amendment_id,
        decision: "amendment_rejected",
        reviewComments: "", // empty
        userId: adminUser.user_id,
      });
      throw new Error("FAILED: Rejection without comment was unexpectedly permitted!");
    } catch (err) {
      if (err.status === 400 && err.message.includes("mandatory")) {
        console.log(`[PASS] Rejection without comment rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // SCENARIO 8: Federal Approval of Target Amendment
    console.log("\n--- SCENARIO 8: Federal Approval & Activation of Amendment ---");
    const reviewedAmendment = await companyProductionService.reviewTargetAmendment({
      amendmentId: amd.amendment_id,
      decision: "amendment_approved",
      reviewComments: "Federal Ministry approves amended target of 1,500 KG based on verified metallurgical survey.",
      effectiveDate: "2026-10-08",
      userId: adminUser.user_id,
    });
    console.log(`[PASS] Amendment approved. Status: ${reviewedAmendment.amendment.status}`);

    // Verify new approved target is activated
    const detailAfterAmendment = await companyProductionService.getProductionDetail(assignment.assignment_id);
    const activeTarget = detailAfterAmendment.approvedTarget;
    if (Number(activeTarget.target_quantity) !== 1500 || activeTarget.version_number !== 2) {
      throw new Error(
        `FAILED: Expected active target 1,500 KG (Version 2), but got ${activeTarget.target_quantity} KG (Version ${activeTarget.version_number})`
      );
    }
    console.log(`[PASS] New Approved Target activated: ${activeTarget.target_quantity} KG (Version ${activeTarget.version_number})`);

    // Verify historical audit trail
    const auditLogs = await companyProductionService.getApprovalHistory(assignment.assignment_id);
    console.log(`[PASS] Full Audit Trail preserved (${auditLogs.length} events logged):`);
    for (const log of auditLogs) {
      console.log(`   - [${log.action}] V${log.version_number}: "${log.comments}" by ${log.actor?.email}`);
    }

    console.log("\n==============================================================================");
    console.log("ALL MANDATORY TARGET LIFECYCLE & AMENDMENT TEST SCENARIOS PASSED!");
    console.log("==============================================================================");
  } finally {
    // Cleanup test assignment
    if (assignment) {
      await CompanyProductionTarget.destroy({ where: { assignment_id: assignment.assignment_id }, force: true });
      await CompanyProductionTargetAmendment.destroy({ where: { assignment_id: assignment.assignment_id }, force: true });
      await CompanyProductionTargetApprovalHistory.destroy({ where: { assignment_id: assignment.assignment_id }, force: true });
      await assignment.destroy({ force: true });
      console.log(`[CLEANUP] Deleted test assignment: ${assignment.assignment_id}`);
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
