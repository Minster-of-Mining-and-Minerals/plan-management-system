"use strict";

const db = require("../models");
const companyService = require("../services/companyService");
const companyStructureService = require("../services/companyStructureService");
const companyPlanService = require("../services/companyPlanService");
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
  console.log("  PHASE 5.7 COMPANY PLAN MANAGEMENT LIFECYCLE VERIFICATION");
  console.log("========================================================\n");

  const testSuffix = Math.floor(Math.random() * 100000);
  let company1;
  let company2;
  let deptC1;
  let deptC2;
  let testUser1;
  let testUser2;

  let masterPlan1;
  let annualPlan1;
  let periodPlanQ1;

  try {
    // ----------------------------------------------------
    // SETUP: TEST COMPANIES & DEPARTMENTS
    // ----------------------------------------------------
    console.log("[1] Setting up Test Companies and Departments...");

    company1 = await companyService.createCompany({
      name: `Midroc Gold Mining Test ${testSuffix}`,
      code: `MG_${testSuffix}`,
      description: "Test Company 1 for Plan Lifecycle",
    });

    company2 = await companyService.createCompany({
      name: `National Mining Corp Test ${testSuffix}`,
      code: `NM_${testSuffix}`,
      description: "Test Company 2 for Isolation Testing",
    });

    deptC1 = await companyStructureService.createCompanyStructure(company1.company_id, {
      name: "Operations & Extraction Directorate",
      level: 1,
    });

    deptC2 = await companyStructureService.createCompanyStructure(company2.company_id, {
      name: "Exploration & Metallurgy Directorate",
      level: 1,
    });

    testUser1 = await db.User.create({
      user_id: uuidv4(),
      email: `planner_c1_${testSuffix}@example.com`,
      full_name: "Tadesse Corporate Planner",
      password: "HashedPasswordPlaceholder123!",
      company_id: company1.company_id,
      company_structure_id: deptC1.company_structure_id,
      is_active: true,
    });

    testUser2 = await db.User.create({
      user_id: uuidv4(),
      email: `planner_c2_${testSuffix}@example.com`,
      full_name: "Almaz Corporate Planner",
      password: "HashedPasswordPlaceholder123!",
      company_id: company2.company_id,
      company_structure_id: deptC2.company_structure_id,
      is_active: true,
    });

    assert(company1 && company1.company_id, "Company 1 successfully created");
    assert(company2 && company2.company_id, "Company 2 successfully created");
    assert(deptC1 && deptC1.company_structure_id, "Company 1 department created");
    assert(deptC2 && deptC2.company_structure_id, "Company 2 department created");

    // ----------------------------------------------------
    // TEST 1: PLANNING CONFIGURATION
    // ----------------------------------------------------
    console.log("\n[2] Testing Company Planning Configuration...");

    const initialConfig = await companyPlanService.getEffectiveCompanyPlanningConfig(company1.company_id);
    assert(initialConfig && initialConfig.min_duration_years === 1, "Default company planning config generated");
    assert(initialConfig.breakdown_mode === "quarterly", "Default breakdown mode is quarterly");

    const updatedConfig = await companyPlanService.updateCompanyPlanningConfig(company1.company_id, {
      max_duration_years: 15,
      planning_period_label: "Corporate Strategic Horizon",
    });
    assert(updatedConfig.max_duration_years === 15, "Planning config updated max_duration_years");
    assert(updatedConfig.planning_period_label === "Corporate Strategic Horizon", "Planning config updated label");

    // ----------------------------------------------------
    // TEST 2: PLANNING RULES & STEPS
    // ----------------------------------------------------
    console.log("\n[3] Testing Company Planning Rules and Hierarchy Steps...");

    const rules = await companyPlanService.listCompanyPlanRules(company1.company_id);
    assert(rules.length > 0, "Default company plan rule initialized");
    const defaultRule = rules[0];
    assert(defaultRule.steps && defaultRule.steps.length === 4, "Default rule has 4 hierarchical steps");

    const customRule = await companyPlanService.createCompanyPlanRule(company1.company_id, {
      name: "Custom Corporate 3-Level Rule",
      performance_scoring_policy: "UNCAPPED",
      steps: [
        { level: 1, name: "Pillar", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
        { level: 2, name: "Strategic Objective", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
        { level: 3, name: "Output Indicator", requires_weight: true, requires_contribution_weight: true, allow_kpi: true },
      ],
    });
    assert(customRule && customRule.steps.length === 3, "Custom company plan rule created with 3 steps");
    assert(customRule.performance_scoring_policy === "UNCAPPED", "Performance scoring policy set to UNCAPPED");

    // ----------------------------------------------------
    // TEST 3: MASTER PLAN DRAFT CREATION & REOPEN
    // ----------------------------------------------------
    console.log("\n[4] Testing Master Plan Creation and Draft Management...");

    masterPlan1 = await companyPlanService.createCompanyPlanDraft(company1.company_id, {
      draft_name: "Five-Year Gold Production Master Plan (2026-2030)",
      start_year: 2026,
      planning_duration_years: 5,
      company_plan_rule_id: defaultRule.company_plan_rule_id,
    });

    assert(masterPlan1 && masterPlan1.status === "draft", "Master plan created in draft status");
    assert(masterPlan1.end_year === 2030, "Calculated end_year is 2030");
    assert(!masterPlan1.is_locked, "Draft plan is unlocked for editing");

    // ----------------------------------------------------
    // TEST 4: HIERARCHY NODE CREATION (SF -> Goal -> KPI -> Activity)
    // ----------------------------------------------------
    console.log("\n[5] Testing Hierarchy Node Creation (Strategic Focus -> Goal -> KPI -> Activity)...");

    // Level 1: Strategic Focus
    const sfNode = await companyPlanService.createCompanyPlanNode(
      company1.company_id,
      {
        company_plan_version_id: masterPlan1.company_plan_version_id,
        parent_id: null,
        type: "strategic_focus",
        title: "Sustainable Extraction & ESG Compliance",
        level: 1,
        order: 0,
        department_ids: [deptC1.company_structure_id],
      },
      testUser1
    );
    assert(sfNode && sfNode.company_plan_node_id, "Created Level 1 Strategic Focus node");

    // Level 2: Goal
    const goalNode = await companyPlanService.createCompanyPlanNode(
      company1.company_id,
      {
        company_plan_version_id: masterPlan1.company_plan_version_id,
        parent_id: sfNode.company_plan_node_id,
        type: "goal",
        title: "Expand Clean Extraction Facilities",
        level: 2,
        order: 0,
      },
      testUser1
    );
    assert(goalNode && goalNode.parent_id === sfNode.company_plan_node_id, "Created Level 2 Goal under SF");

    // Level 3: KPI
    const kpiNode = await companyPlanService.createCompanyPlanNode(
      company1.company_id,
      {
        company_plan_version_id: masterPlan1.company_plan_version_id,
        parent_id: goalNode.company_plan_node_id,
        type: "kpi",
        title: "Refined Gold Output (Kilograms)",
        target_unit: "Kilograms",
        weight: 100,
        contribution_weight: 100,
        annual_target: 500,
        level: 3,
        order: 0,
      },
      testUser1
    );
    assert(kpiNode && kpiNode.target_unit === "Kilograms", "Created Level 3 KPI node with target unit");

    // Level 4: Operational Task / Activity
    const actNode = await companyPlanService.createCompanyPlanNode(
      company1.company_id,
      {
        company_plan_version_id: masterPlan1.company_plan_version_id,
        parent_id: kpiNode.company_plan_node_id,
        type: "activity",
        title: "Commission Leach Plant Unit 2",
        contribution_weight: 100,
        level: 4,
        order: 0,
      },
      testUser1
    );
    assert(actNode && actNode.parent_id === kpiNode.company_plan_node_id, "Created Level 4 Activity node");

    // Fetch complete tree
    const hierarchy = await companyPlanService.getCompanyPlanHierarchy(
      masterPlan1.company_plan_version_id,
      company1.company_id
    );
    assert(hierarchy.tree.length === 1, "Hierarchy root contains 1 Strategic Focus");
    assert(hierarchy.tree[0].children.length === 1, "SF contains 1 Goal child");
    assert(hierarchy.tree[0].children[0].children.length === 1, "Goal contains 1 KPI child");

    // ----------------------------------------------------
    // TEST 5: FINALIZATION READINESS & DRAFT FINALIZATION
    // ----------------------------------------------------
    console.log("\n[6] Testing Draft Finalization Readiness & Finalization...");

    const readiness = await companyPlanService.getCompanyDraftFinalizationReadiness(
      masterPlan1.company_plan_version_id,
      company1.company_id
    );
    assert(readiness.ready === true, "Draft finalization readiness passed");

    const finalizedMaster = await companyPlanService.finalizeCompanyPlanDraft(
      masterPlan1.company_plan_version_id,
      company1.company_id,
      testUser1
    );
    assert(finalizedMaster.status === "finalized", "Master plan status updated to finalized");
    assert(finalizedMaster.is_locked === true, "Master plan locked after finalization");

    // ----------------------------------------------------
    // TEST 6: ANNUAL PLANNING & TARGET ALLOCATION
    // ----------------------------------------------------
    console.log("\n[7] Testing Annual Planning & Target Allocation...");

    const annualVersions = await companyPlanService.listCompanyAnnualVersions(
      masterPlan1.company_plan_version_id,
      company1.company_id
    );
    assert(annualVersions.length === 5, "5 Annual plan versions generated for 5-year cycle");

    annualPlan1 = annualVersions[0]; // Year 2026
    assert(annualPlan1.planning_year === 2026, "Annual Plan 1 planning year is 2026");

    const annualNodes = await companyPlanService.getCompanyAnnualTargetAllocations(
      annualPlan1.company_plan_version_id,
      company1.company_id
    );
    const annualKpi = annualNodes.find((n) => n.level === 3 || n.type === "kpi");
    assert(annualKpi !== undefined, "Found cloned KPI in Annual Plan 1");

    await companyPlanService.updateCompanyAnnualTarget(
      annualKpi.company_plan_node_id,
      company1.company_id,
      120, // 120 kg target for 2026
      testUser1
    );

    const updatedAnnualNodes = await companyPlanService.getCompanyAnnualTargetAllocations(
      annualPlan1.company_plan_version_id,
      company1.company_id
    );
    const updatedKpi = updatedAnnualNodes.find((n) => n.company_plan_node_id === annualKpi.company_plan_node_id);
    assert(parseFloat(updatedKpi.annual_target) === 120, "Updated annual target to 120 kg");

    const finalizedAnnual = await companyPlanService.finalizeCompanyAnnualExecution(
      annualPlan1.company_plan_version_id,
      company1.company_id,
      testUser1
    );
    assert(finalizedAnnual.status === "finalized", "Annual Plan 1 execution finalized");

    // ----------------------------------------------------
    // TEST 7: EXECUTION PERIODS (QUARTERS) & TARGET ALLOCATIONS
    // ----------------------------------------------------
    console.log("\n[8] Testing Execution Period Planning (Quarterly Subdivisions)...");

    const periods = await companyPlanService.initializeCompanyExecutionPeriods(
      annualPlan1.company_plan_version_id,
      company1.company_id,
      { subdivision_mode: "quarterly" }
    );
    assert(periods.length === 4, "4 Quarterly execution periods initialized");

    periodPlanQ1 = periods[0];
    assert(periodPlanQ1.period_label === "Quarter 1", "Period 1 labeled Quarter 1");

    const periodNodes = await companyPlanService.getCompanyPeriodTargetAllocations(
      periodPlanQ1.company_plan_version_id,
      company1.company_id
    );
    const periodKpi = periodNodes.find((n) => n.level === 3 || n.type === "kpi");
    assert(periodKpi !== undefined, "Found KPI node in Q1 period plan");

    await companyPlanService.updateCompanyPeriodTarget(
      periodKpi.company_plan_node_id,
      company1.company_id,
      30, // 30 kg target in Q1
      testUser1
    );

    const finalizedPeriod = await companyPlanService.finalizeCompanyPeriodTargets(
      periodPlanQ1.company_plan_version_id,
      company1.company_id,
      testUser1
    );
    assert(finalizedPeriod.status === "finalized", "Q1 Period targets finalized");

    // ----------------------------------------------------
    // TEST 8: PROCESS INITIATION
    // ----------------------------------------------------
    console.log("\n[9] Testing Plan Process Start...");

    const startedMaster = await companyPlanService.startCompanyPlanProcess(
      masterPlan1.company_plan_version_id,
      company1.company_id,
      testUser1
    );
    assert(startedMaster.execution_status === "in_progress", "Master plan execution status is in_progress");

    // ----------------------------------------------------
    // TEST 9: ACTUAL REPORTING & SIGN-OFF WORKFLOW
    // ----------------------------------------------------
    console.log("\n[10] Testing Achievement Sign-off Workflow (Draft -> Submit -> Approve -> Validate)...");

    // 1. Report draft actual
    const draftActual = await companyPlanService.updateCompanyPeriodActual(
      periodKpi.company_plan_node_id,
      company1.company_id,
      28.5, // 28.5 kg actual achieved out of 30 kg target
      testUser1
    );
    assert(draftActual.period_actual === 28.5, "Recorded draft period actual of 28.5 kg");
    assert(draftActual.period_actual_status === "empty", "Status remains empty before submit");

    // 2. Submit achievement
    const submitted = await companyPlanService.submitCompanyAchievement(
      periodKpi.company_plan_node_id,
      company1.company_id,
      { narration: "Strong recovery from Shaft 3 operations" },
      testUser1
    );
    assert(submitted.period_actual_status === "submitted", "Status transitioned to submitted");

    // 3. Approve achievement
    const approved = await companyPlanService.approveCompanyAchievement(
      periodKpi.company_plan_node_id,
      company1.company_id,
      {},
      testUser1
    );
    assert(approved.period_actual_status === "approved", "Status transitioned to approved");

    // 4. Validate achievement
    const validated = await companyPlanService.validateCompanyAchievement(
      periodKpi.company_plan_node_id,
      company1.company_id,
      {},
      testUser1
    );
    assert(validated.period_actual_status === "validated", "Status transitioned to validated");

    // ----------------------------------------------------
    // TEST 10: EXECUTION DASHBOARD & ANALYTICS
    // ----------------------------------------------------
    console.log("\n[11] Testing Company Execution Dashboard & Progress Aggregation...");

    const dashboardSummary = await companyPlanService.getCompanyExecutionDashboardSummary(
      company1.company_id
    );
    assert(dashboardSummary.company.company_id === company1.company_id, "Dashboard scoped to Company 1");
    assert(dashboardSummary.metrics.total_master_plans >= 1, "Metrics report total master plans");
    assert(dashboardSummary.metrics.total_annual_plans === 5, "Metrics report 5 annual plans");
    assert(dashboardSummary.metrics.total_execution_periods === 4, "Metrics report 4 execution periods");
    assert(dashboardSummary.metrics.total_kpis >= 1, "Metrics report KPI count");
    console.log(`  Dashboard Overall Execution Progress: ${dashboardSummary.metrics.overall_execution_progress}%`);

    const deptProgress = await companyPlanService.getCompanyExecutionDashboardDepartmentUser(
      company1.company_id
    );
    assert(deptProgress.departments.length >= 1, "Dashboard reports department progress");
    const dept1Report = deptProgress.departments.find(
      (d) => d.company_structure_id === deptC1.company_structure_id
    );
    assert(dept1Report !== undefined, "Found Department 1 progress in dashboard");

    // ----------------------------------------------------
    // TEST 11: CROSS-COMPANY DATA ISOLATION
    // ----------------------------------------------------
    console.log("\n[12] Testing Strict Cross-Company Isolation...");

    // Company 2 user trying to access Company 1's master plan -> MUST return null or error
    const crossAccess = await companyPlanService.getCompanyPlanVersionById(
      masterPlan1.company_plan_version_id,
      company2.company_id // querying under Company 2 scope
    );
    assert(crossAccess === null, "Company 2 cannot view Company 1's plan version");

    const crossNodeAccess = await companyPlanService.getCompanyPlanNodeById(
      kpiNode.company_plan_node_id,
      company2.company_id // querying under Company 2 scope
    );
    assert(crossNodeAccess === null, "Company 2 cannot view Company 1's hierarchy node");

    await assertThrowsAsync(
      async () => {
        await companyPlanService.updateCompanyPlanNode(
          kpiNode.company_plan_node_id,
          company2.company_id,
          { title: "Unauthorized Title" },
          testUser2
        );
      },
      "Company 2 cannot modify Company 1's node",
      "not found"
    );

    // ----------------------------------------------------
    // CLEANUP
    // ----------------------------------------------------
    console.log("\n[13] Cleaning up test records...");
    await db.Company.destroy({
      where: { company_id: [company1.company_id, company2.company_id] },
    });
    console.log("  PASS: Cleaned up test companies and cascaded records");

  } catch (err) {
    console.error("Test execution failed with error:", err);
    failedCount++;
  }

  console.log("\n========================================================");
  console.log(`  SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
