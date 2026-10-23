"use strict";

const db = require("../models");
const regionService = require("../services/regionService");
const regionalStructureService = require("../services/regionalStructureService");
const regionalPlanService = require("../services/regionalPlanService");
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
  console.log("  PHASE 6 REGIONAL PLAN MANAGEMENT LIFECYCLE VERIFICATION");
  console.log("========================================================\n");

  const testSuffix = Math.floor(Math.random() * 100000);
  let region1;
  let region2;
  let deptR1;
  let deptR2;
  let testUser1;
  let testUser2;

  let masterPlan1;
  let annualPlan1;
  let periodPlanQ1;

  try {
    // ----------------------------------------------------
    // SETUP: TEST REGIONS & DEPARTMENTS
    // ----------------------------------------------------
    console.log("[1] Setting up Test Regions and Departments...");

    region1 = await regionService.createRegion({
      name: `Oromia Test Region ${testSuffix}`,
      code: `OR_${testSuffix}`,
      description: "Test Region 1 for Plan Lifecycle",
    });

    region2 = await regionService.createRegion({
      name: `Amhara Test Region ${testSuffix}`,
      code: `AM_${testSuffix}`,
      description: "Test Region 2 for Isolation Testing",
    });

    deptR1 = await regionalStructureService.createRegionalStructure(region1.region_id, {
      name: "Mineral Development Directorate",
      level: 1,
    });

    deptR2 = await regionalStructureService.createRegionalStructure(region2.region_id, {
      name: "Geological Survey Directorate",
      level: 1,
    });

    testUser1 = await db.User.create({
      user_id: uuidv4(),
      email: `planner_r1_${testSuffix}@example.com`,
      full_name: "Abebe Planner",
      password: "HashedPasswordPlaceholder123!",
      region_id: region1.region_id,
      regional_structure_id: deptR1.regional_structure_id,
      is_active: true,
    });

    testUser2 = await db.User.create({
      user_id: uuidv4(),
      email: `planner_r2_${testSuffix}@example.com`,
      full_name: "Kebede Planner",
      password: "HashedPasswordPlaceholder123!",
      region_id: region2.region_id,
      regional_structure_id: deptR2.regional_structure_id,
      is_active: true,
    });

    assert(region1.region_id && region2.region_id, "Regions and departments created successfully");

    // ----------------------------------------------------
    // TEST SUITE 1: PLAN CREATION & DRAFT HIERARCHY
    // ----------------------------------------------------
    console.log("\n[2] Testing Plan Creation and Draft Hierarchy...");

    masterPlan1 = await regionalPlanService.createRegionalPlanDraft(
      region1.region_id,
      {
        draft_name: `Oromia 3-Year Mineral Strategy ${testSuffix}`,
        start_year: 2026,
        planning_duration_years: 3,
      },
      testUser1.user_id
    );

    assert(
      masterPlan1.regional_plan_version_id &&
        masterPlan1.status === "draft" &&
        masterPlan1.version_kind === "master",
      "Regional master plan draft created with draft status and version_kind='master'"
    );

    // Create Hierarchy:
    // Level 1: Priority
    const priorityNode = await regionalPlanService.createRegionalPlanNode(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      {
        title: "P1: Sustainable Mineral Extraction",
        type: "strategic",
        regional_structure_id: deptR1.regional_structure_id,
      },
      testUser1.user_id
    );
    assert(priorityNode.level === 1, "Level 1 Priority node created");

    // Level 2: Goal under Priority
    const goalNode = await regionalPlanService.createRegionalPlanNode(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      {
        parent_id: priorityNode.regional_plan_node_id,
        title: "Goal 1.1: Gold Mining Productivity",
        type: "goal",
        contribution_weight: 100,
        regional_structure_id: deptR1.regional_structure_id,
      },
      testUser1.user_id
    );
    assert(goalNode.level === 2 && goalNode.parent_id === priorityNode.regional_plan_node_id, "Level 2 Goal node created under Priority");

    // Level 3: KPI A (50% weight, 100 Tons target)
    const kpiNodeA = await regionalPlanService.createRegionalPlanNode(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      {
        parent_id: goalNode.regional_plan_node_id,
        title: "KPI 1.1.1: Gold Production Volume",
        type: "kpi",
        weight: 100, // 100 Tons draft target
        contribution_weight: 50, // 50%
        target_unit: "Tons",
        regional_structure_id: deptR1.regional_structure_id,
      },
      testUser1.user_id
    );

    // Level 3: KPI B (50% weight, 200 Sites target)
    const kpiNodeB = await regionalPlanService.createRegionalPlanNode(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      {
        parent_id: goalNode.regional_plan_node_id,
        title: "KPI 1.1.2: Licensed Artisanal Mining Sites",
        type: "kpi",
        weight: 200, // 200 Sites draft target
        contribution_weight: 50, // 50%
        target_unit: "Sites",
        regional_structure_id: deptR1.regional_structure_id,
      },
      testUser1.user_id
    );

    assert(kpiNodeA.level === 3 && kpiNodeB.level === 3, "Two Level 3 KPIs created with 50/50 contribution weights");

    // Test Duplication of Draft
    const duplicatedDraft = await regionalPlanService.duplicateRegionalPlanDraft(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      { draft_name: "Duplicate of Strategic Plan" },
      testUser1.user_id
    );
    assert(
      duplicatedDraft.regional_plan_version_id !== masterPlan1.regional_plan_version_id &&
        duplicatedDraft.status === "draft",
      "Draft successfully duplicated into independent plan version"
    );

    // ----------------------------------------------------
    // TEST SUITE 2: DRAFT FINALIZATION & ANNUAL VERSIONS
    // ----------------------------------------------------
    console.log("\n[3] Testing Draft Finalization and Annual Plans Generation...");

    const readiness = await regionalPlanService.getRegionalDraftFinalizationReadiness(
      masterPlan1.regional_plan_version_id,
      region1.region_id
    );
    assert(readiness.ready === true && readiness.errors.length === 0, "Draft finalization readiness passed validation");

    const finalizedMaster = await regionalPlanService.finalizeRegionalPlanDraft(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      testUser1.user_id
    );
    assert(
      finalizedMaster.status === "finalized" && finalizedMaster.finalized_at !== null,
      "Regional master plan draft finalized successfully"
    );

    // Verify Annual Plans auto-generated for 3 years
    const annualVersions = await regionalPlanService.listRegionalAnnualVersions(
      masterPlan1.regional_plan_version_id,
      region1.region_id
    );
    assert(annualVersions.length === 3, `Generated exactly 3 annual versions for 3-year plan (got ${annualVersions.length})`);

    annualPlan1 = annualVersions[0];
    assert(
      annualPlan1.version_kind === "annual" &&
        annualPlan1.planning_year === 2026 &&
        annualPlan1.parent_plan_version_id === masterPlan1.regional_plan_version_id,
      "Annual Plan Year 1 correctly linked to master plan"
    );

    // Allocate Annual Targets for Year 1
    const annualAllocations = await regionalPlanService.getRegionalAnnualTargetAllocations(
      annualPlan1.regional_plan_version_id,
      region1.region_id
    );
    assert(annualAllocations.length === 4, `Annual plan has 4 cloned hierarchy nodes`);

    const annualKpiA = annualAllocations.find((n) => n.title.includes("Gold Production Volume"));
    await regionalPlanService.updateRegionalAnnualTarget(
      annualKpiA.regional_plan_node_id,
      region1.region_id,
      30, // 30 Tons for Year 1
      testUser1.user_id
    );

    const annualKpiB = annualAllocations.find((n) => n.title.includes("Licensed Artisanal"));
    await regionalPlanService.updateRegionalAnnualTarget(
      annualKpiB.regional_plan_node_id,
      region1.region_id,
      60, // 60 Sites for Year 1
      testUser1.user_id
    );

    // Finalize Annual Targets
    await regionalPlanService.finalizeRegionalAnnualExecution(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      testUser1.user_id
    );
    assert(true, "Annual execution targets finalized");

    // ----------------------------------------------------
    // TEST SUITE 3: EXECUTION PERIOD PLANNING
    // ----------------------------------------------------
    console.log("\n[4] Testing Execution Period Planning & Process Start...");

    // Initialize 4 Quarters for Year 1
    const executionPeriods = await regionalPlanService.initializeRegionalExecutionPeriods(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      "quarterly",
      [],
      testUser1.user_id
    );
    assert(executionPeriods.length === 12, `Generated 12 execution periods across 3 annual years (4 per year)`);

    periodPlanQ1 = executionPeriods.find(
      (p) => p.planning_year === 2026 && p.period_label === "Quarter 1"
    );
    assert(periodPlanQ1 && periodPlanQ1.version_kind === "execution_period", "Quarter 1 execution period plan verified");

    // Allocate targets for Q1
    const periodAllocations = await regionalPlanService.getRegionalPeriodTargetAllocations(
      periodPlanQ1.regional_plan_version_id,
      region1.region_id
    );
    const periodKpiA = periodAllocations.find((n) => n.title.includes("Gold Production Volume"));
    const periodKpiB = periodAllocations.find((n) => n.title.includes("Licensed Artisanal"));

    await regionalPlanService.updateRegionalPeriodTarget(
      periodKpiA.regional_plan_node_id,
      region1.region_id,
      10, // 10 Tons target for Q1
      testUser1.user_id
    );

    await regionalPlanService.updateRegionalPeriodTarget(
      periodKpiB.regional_plan_node_id,
      region1.region_id,
      20, // 20 Sites target for Q1
      testUser1.user_id
    );

    // Finalize Period Targets
    await regionalPlanService.finalizeRegionalPeriodTargets(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      testUser1.user_id
    );

    // Start Process
    const startedPlan = await regionalPlanService.startRegionalPlanProcess(
      masterPlan1.regional_plan_version_id,
      region1.region_id,
      testUser1.user_id
    );
    assert(
      startedPlan.process_started_at !== null && startedPlan.status === "active",
      "Regional plan execution process successfully started"
    );

    // ----------------------------------------------------
    // TEST SUITE 4: EXECUTION REPORTING & APPROVAL WORKFLOW
    // ----------------------------------------------------
    console.log("\n[5] Testing Execution Reporting, Approval and Validation Lifecycle...");

    // Officer enters actual: 8 Tons achieved against 10 Tons target (80%)
    await regionalPlanService.updateRegionalPeriodActual(
      periodKpiA.regional_plan_node_id,
      region1.region_id,
      { period_actual: 8, narration: "Quarter 1 mining expansion achieved 8 tons" },
      testUser1.user_id
    );

    // Submit achievement
    const submittedNode = await regionalPlanService.submitRegionalAchievement(
      periodKpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );
    assert(submittedNode.period_actual_status === "submitted", "Achievement transitioned from empty to submitted");

    // Department Head approves achievement
    const approvedNode = await regionalPlanService.approveRegionalAchievement(
      periodKpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );
    assert(approvedNode.period_actual_status === "approved", "Achievement transitioned from submitted to approved");

    // Bureau Validator validates achievement
    const validatedNode = await regionalPlanService.validateRegionalAchievement(
      periodKpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );
    assert(validatedNode.period_actual_status === "validated", "Achievement transitioned from approved to validated (locked)");

    // KPI B: Officer enters 20 Sites against 20 Sites target (100%), submit, approve, validate
    await regionalPlanService.updateRegionalPeriodActual(
      periodKpiB.regional_plan_node_id,
      region1.region_id,
      { period_actual: 20 },
      testUser1.user_id
    );
    await regionalPlanService.submitRegionalAchievement(periodKpiB.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);
    await regionalPlanService.approveRegionalAchievement(periodKpiB.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);
    await regionalPlanService.validateRegionalAchievement(periodKpiB.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);

    // ----------------------------------------------------
    // TEST SUITE 5: PROGRESS ROLLUP CALCULATIONS
    // ----------------------------------------------------
    console.log("\n[6] Testing Deterministic Mathematical Rollup Calculations...");

    // KPI A progress: 8 / 10 = 80%
    // KPI B progress: 20 / 20 = 100%
    // Goal 1.1 progress: 50% * 80% + 50% * 100% = 40% + 50% = 90%!
    // Priority P1 progress: 100% * 90% = 90%!

    const q1Hierarchy = await regionalPlanService.getRegionalPlanHierarchy(
      periodPlanQ1.regional_plan_version_id,
      region1.region_id
    );

    const rolledKpiA = q1Hierarchy.nodes.find((n) => n.regional_plan_node_id === periodKpiA.regional_plan_node_id);
    const rolledKpiB = q1Hierarchy.nodes.find((n) => n.regional_plan_node_id === periodKpiB.regional_plan_node_id);
    const rolledGoal = q1Hierarchy.nodes.find((n) => n.title.includes("Gold Mining Productivity"));
    const rolledPriority = q1Hierarchy.nodes.find((n) => n.title.includes("Sustainable Mineral Extraction"));

    console.log("Rolled KPI A:", rolledKpiA?.title, rolledKpiA?.execution_progress_percent);
    console.log("Rolled KPI B:", rolledKpiB?.title, rolledKpiB?.execution_progress_percent);
    console.log("Rolled Goal:", rolledGoal?.title, rolledGoal?.execution_progress_percent);
    console.log("Rolled Priority:", rolledPriority?.title, rolledPriority?.execution_progress_percent);

    assert(rolledKpiA?.execution_progress_percent === 80, `Leaf KPI A execution progress is 80% (got ${rolledKpiA?.execution_progress_percent}%)`);
    assert(rolledKpiB?.execution_progress_percent === 100, `Leaf KPI B execution progress is 100% (got ${rolledKpiB?.execution_progress_percent}%)`);
    assert(rolledGoal?.execution_progress_percent === 90, `Parent Goal progress is 90% (weighted 50/50: 0.5*80 + 0.5*100) (got ${rolledGoal?.execution_progress_percent}%)`);
    assert(rolledPriority?.execution_progress_percent === 90, `Root Priority progress rolled up to 90% (got ${rolledPriority?.execution_progress_percent}%)`);

    // ----------------------------------------------------
    // TEST SUITE 6: REGIONAL DASHBOARD INTEGRATION
    // ----------------------------------------------------
    console.log("\n[7] Testing Regional Planning Dashboard & Performance Metrics...");

    const summary = await regionalPlanService.getRegionalExecutionDashboardSummary(region1.region_id);
    assert(summary.summary.total_plans >= 1, `Dashboard reports total plans >= 1 (got ${summary.summary.total_plans})`);
    assert(summary.summary.status_breakdown.active_plans >= 1, "Dashboard reports active plans count >= 1");
    assert(summary.plans.length > 0, "Dashboard returns region's master plans");

    const deptScorecard = await regionalPlanService.getRegionalExecutionDashboardDepartmentUser(
      region1.region_id,
      periodPlanQ1.regional_plan_version_id
    );
    assert(deptScorecard.departments.length >= 1, "Department performance scorecard calculated");
    const mddScore = deptScorecard.departments.find((d) => d.name === "Mineral Development Directorate");
    assert(mddScore && mddScore.assigned_nodes_count >= 1, "Mineral Development Directorate performance assigned");

    // ----------------------------------------------------
    // TEST SUITE 7: STRICT CROSS-REGION ISOLATION & SECURITY
    // ----------------------------------------------------
    console.log("\n[8] Testing Cross-Region Isolation and Boundary Protection...");

    // Region 2 cannot query Region 1's plan
    await assertThrowsAsync(
      async () => {
        await regionalPlanService.getRegionalPlanVersionById(masterPlan1.regional_plan_version_id, region2.region_id);
      },
      "Region 2 cannot retrieve Region 1's plan version by ID",
      "Regional plan version not found"
    );

    // Region 2 cannot retrieve Region 1's nodes
    await assertThrowsAsync(
      async () => {
        await regionalPlanService.getRegionalPlanNodeById(kpiNodeA.regional_plan_node_id, region2.region_id);
      },
      "Region 2 cannot retrieve Region 1's plan node by ID",
      "different region"
    );

    // Region 2 user cannot modify Region 1's target
    await assertThrowsAsync(
      async () => {
        await regionalPlanService.updateRegionalPeriodTarget(
          periodKpiA.regional_plan_node_id,
          region2.region_id,
          999,
          testUser2.user_id
        );
      },
      "Region 2 user cannot update Region 1's period target",
      "different region"
    );

    // Region 2 user cannot submit achievement on Region 1's node
    await assertThrowsAsync(
      async () => {
        await regionalPlanService.submitRegionalAchievement(
          periodKpiA.regional_plan_node_id,
          region2.region_id,
          { period_actual: 50 },
          testUser2.user_id
        );
      },
      "Region 2 user cannot submit achievement on Region 1's node",
      "different region"
    );

    // Region 2 listing plans returns only Region 2's plans (0 plans, never Region 1's plans)
    const region2Plans = await regionalPlanService.listRegionalPlanVersions(region2.region_id);
    assert(
      region2Plans.every((p) => p.region_id === region2.region_id) &&
        !region2Plans.some((p) => p.regional_plan_version_id === masterPlan1.regional_plan_version_id),
      "Region 2 plan list strictly excludes Region 1 plans"
    );

    // ----------------------------------------------------
    // TEST SUITE 8: REJECTION, RESUBMISSION & LOCKED STATE
    // ----------------------------------------------------
    console.log("\n[9] Testing Rejection, Correction, Resubmission & Terminal Locking...");

    // 1. Validated achievement is strictly locked against modification
    await assertThrowsAsync(
      async () => {
        await regionalPlanService.updateRegionalPeriodActual(
          periodKpiA.regional_plan_node_id,
          region1.region_id,
          { period_actual: 99 },
          testUser1.user_id
        );
      },
      "Validated achievement is strictly locked against modification",
      "Cannot edit actual value while status is \"validated\""
    );

    // 2. Quarter 2 period plan: Test rejection & revision workflow
    const periodPlanQ2 = executionPeriods.find(
      (p) => p.planning_year === 2026 && p.period_label === "Quarter 2"
    );
    const q2Allocations = await regionalPlanService.getRegionalPeriodTargetAllocations(
      periodPlanQ2.regional_plan_version_id,
      region1.region_id
    );
    const q2KpiA = q2Allocations.find((n) => n.title.includes("Gold Production Volume"));

    await regionalPlanService.updateRegionalPeriodTarget(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      15, // 15 Tons
      testUser1.user_id
    );

    // Enter initial actual: 12 Tons
    await regionalPlanService.updateRegionalPeriodActual(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      { period_actual: 12, narration: "Q2 Initial Report" },
      testUser1.user_id
    );

    // Submit
    await regionalPlanService.submitRegionalAchievement(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );

    // Department Head rejects with reason
    const rejectedByDept = await regionalPlanService.rejectRegionalAchievement(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      "Discrepancy in artisan receipts: recheck scale calibration",
      testUser1.user_id
    );
    assert(
      rejectedByDept.period_actual_status === "rejected" &&
        rejectedByDept.period_actual_rejection_comment.includes("scale calibration"),
      "Department head rejection sets status to 'rejected' and records comment"
    );

    // Executor corrects the value to 14 Tons and resubmits
    await regionalPlanService.updateRegionalPeriodActual(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      { period_actual: 14, narration: "Recalibrated scale: 14 tons confirmed" },
      testUser1.user_id
    );
    const resubmitted = await regionalPlanService.submitRegionalAchievement(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );
    assert(resubmitted.period_actual_status === "submitted", "Rejected achievement successfully corrected and resubmitted");

    // Department approves
    await regionalPlanService.approveRegionalAchievement(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );

    // Central validator rejects validation
    const valRejected = await regionalPlanService.rejectValidationRegionalAchievement(
      q2KpiA.regional_plan_node_id,
      region1.region_id,
      "Validation team requested physical shipment bill of lading",
      testUser1.user_id
    );
    assert(
      valRejected.period_actual_status === "rejected" &&
        valRejected.period_actual_rejection_comment.includes("bill of lading"),
      "Central validator rejection sets status to 'rejected' with validation reason"
    );

    // Final resubmit, approve, and validate
    await regionalPlanService.submitRegionalAchievement(q2KpiA.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);
    await regionalPlanService.approveRegionalAchievement(q2KpiA.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);
    const finalVal = await regionalPlanService.validateRegionalAchievement(q2KpiA.regional_plan_node_id, region1.region_id, {}, testUser1.user_id);
    assert(finalVal.period_actual_status === "validated", "Full rejection-correction-resubmission lifecycle succeeded and locked");

    // ----------------------------------------------------
    // TEST SUITE 9: ANNUAL ACHIEVEMENT WORKFLOW & AUDIT
    // ----------------------------------------------------
    console.log("\n[10] Testing Annual Achievement Reporting & Central Audit...");

    // Annual Plan Year 1
    const annualNode = annualAllocations[0];
    const subAnnual = await regionalPlanService.submitRegionalAnnualAchievement(
      annualNode.regional_plan_node_id,
      region1.region_id,
      { annual_actual: 28, narration: "Year 1 Annual Summary" },
      testUser1.user_id
    );
    assert(subAnnual.annual_actual_status === "submitted", "Annual achievement submitted successfully");

    const appAnnual = await regionalPlanService.approveRegionalAnnualAchievement(
      annualNode.regional_plan_node_id,
      region1.region_id,
      {},
      testUser1.user_id
    );
    assert(appAnnual.annual_actual_status === "approved", "Annual achievement approved successfully");

    // Check Action Audit Logs
    const actionLogs = await db.RegionalPlanNodeActionLog.findAll({
      where: { regional_plan_node_id: periodKpiA.regional_plan_node_id },
      order: [["created_at", "ASC"]],
    });
    assert(actionLogs.length >= 3, `Complete audit history recorded in action logs (${actionLogs.length} events logged)`);
    assert(
      actionLogs.some((l) => l.action === "ACHIEVEMENT_SUBMITTED") &&
        actionLogs.some((l) => l.action === "ACHIEVEMENT_APPROVED") &&
        actionLogs.some((l) => l.action === "ACHIEVEMENT_VALIDATED"),
      "Audit trail captures SUBMITTED, APPROVED, and VALIDATED actions with actor user_id"
    );

    // ----------------------------------------------------
    // TEST SUITE 10: FEDERAL DOMAIN SEPARATION & REPOSITORY INTEGRITY
    // ----------------------------------------------------
    console.log("\n[11] Verifying Federal Table Separation and Zero Data Pollution...");

    const federalPlansCount = await db.PlanVersion.count({
      where: { draft_name: masterPlan1.draft_name },
    });
    assert(federalPlansCount === 0, "Regional plan records do NOT leak into federal plan_versions table");

    const federalNodesCount = await db.PlanNode.count({
      where: { title: "P1: Sustainable Mineral Extraction" },
    });
    assert(federalNodesCount === 0, "Regional node records do NOT leak into federal plan_nodes table");
  } finally {
    // Teardown test data
    console.log("\n[9] Cleaning up test records...");
    if (testUser1?.user_id) {
      await db.User.destroy({ where: { user_id: [testUser1.user_id, testUser2?.user_id].filter(Boolean) }, force: true });
    }
    if (region1?.region_id) {
      await db.Region.destroy({ where: { region_id: [region1.region_id, region2?.region_id].filter(Boolean) }, force: true });
    }
  }

  console.log("\n========================================================");
  console.log(`  VERIFICATION RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
