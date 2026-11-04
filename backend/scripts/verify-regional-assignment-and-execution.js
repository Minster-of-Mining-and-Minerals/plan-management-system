"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  Region,
  RegionalStructure,
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalInternalAssignment,
  RegionalPlanningConfiguration,
  NationalReportingRequirement,
  User,
  sequelize,
} = require("../models");

const regionalPlanService = require("../services/regionalPlanService");
const nationalReportingService = require("../services/nationalReportingService");
const { getStepAssignmentRequirement, stepRequiresAssignment } = require("../services/planRuleStepUtils");

// Mirror of frontend getPlanNodeAssignmentLabels from frontend/src/utils/planAssignmentUtils.ts
function getPlanNodeAssignmentLabels(node) {
  const labels = [];
  for (const assignment of node.externalAssignments?.filter((item) => item.is_active !== false) ?? []) {
    const name = assignment.governmentStructure?.name;
    if (name) {
      labels.push({ type: "sector", name });
    }
  }
  for (const assignment of node.internalAssignments?.filter((item) => item.is_active !== false) ?? []) {
    const userName = assignment.user?.full_name || assignment.assignedUser?.full_name;
    const deptName =
      assignment.internalStructure?.name ||
      assignment.department?.name ||
      assignment.regionalStructure?.name;

    if (userName) {
      labels.push({ type: "user", name: userName });
    }
    if (deptName) {
      labels.push({ type: "department", name: deptName });
    }
  }
  return labels;
}

async function runVerification() {
  console.log("=== STARTING REGIONAL ASSIGNMENT & EXECUTION INITIALIZATION VERIFICATION ===");
  const testId = Date.now();

  // 1. Create a test Region
  const region = await Region.create({
    region_id: uuidv4(),
    code: `REG_TEST_${testId}`,
    name: `Test Region ${testId}`,
    is_active: true,
  });
  console.log(`✓ Test Region created: ${region.name} (${region.region_id})`);

  // 2. Create hierarchical departments in RegionalStructure
  const dirA = await RegionalStructure.create({
    regional_structure_id: uuidv4(),
    region_id: region.region_id,
    name: "Mining Exploration Directorate",
    level: 1,
    parent_id: null,
    is_active: true,
  });

  const divA1 = await RegionalStructure.create({
    regional_structure_id: uuidv4(),
    region_id: region.region_id,
    name: "Geological Survey Division",
    level: 2,
    parent_id: dirA.regional_structure_id,
    is_active: true,
  });

  const dirB = await RegionalStructure.create({
    regional_structure_id: uuidv4(),
    region_id: region.region_id,
    name: "Finance & Administration Directorate",
    level: 1,
    parent_id: null,
    is_active: true,
  });
  console.log("✓ Regional organizational structures created (Dir A, Div A.1 under Dir A, Dir B)");

  // 3. Create test users in these departments
  const userA = await User.create({
    user_id: uuidv4(),
    region_id: region.region_id,
    regional_structure_id: dirA.regional_structure_id,
    full_name: `Alice DirA ${testId}`,
    email: `alice_${testId}@region.gov.et`,
    username: `alice_${testId}`,
    password: "hashed_dummy",
    status: "active",
  });

  const userA1 = await User.create({
    user_id: uuidv4(),
    region_id: region.region_id,
    regional_structure_id: divA1.regional_structure_id,
    full_name: `Bob DivA1 ${testId}`,
    email: `bob_${testId}@region.gov.et`,
    username: `bob_${testId}`,
    password: "hashed_dummy",
    status: "active",
  });

  const userB = await User.create({
    user_id: uuidv4(),
    region_id: region.region_id,
    regional_structure_id: dirB.regional_structure_id,
    full_name: `Charlie DirB ${testId}`,
    email: `charlie_${testId}@region.gov.et`,
    username: `charlie_${testId}`,
    password: "hashed_dummy",
    status: "active",
  });
  console.log("✓ Test users created (Alice in Dir A, Bob in Div A.1, Charlie in Dir B)");

  // 3.5 Test National Reporting KPI creation and update (Part 1 verification)
  console.log("\n--- PART 1: Testing National Reporting Requirement Update ---");
  const natReq = await nationalReportingService.createRequirement({
    code: `NAT-${testId.toString().slice(-6)}`,
    title: "National Artisanal Gold Metric",
    expected_unit: "kg",
    unit_category: "mass",
    frequency: "quarterly",
    requires_numeric: true,
    effective_start_date: "",
    effective_end_date: "",
  }, userA.user_id);
  console.log(`✓ National requirement created: ${natReq.code}`);

  // Test updating the requirement with empty date strings (the previous failure point)
  const updatedNatReq = await nationalReportingService.updateRequirement(natReq.requirement_id, {
    title: "Updated National Artisanal Gold Metric",
    description: "Detailed description of gold metric",
    effective_start_date: "",
    effective_end_date: "",
  }, userA.user_id);
  console.log(`✓ National requirement successfully updated with empty dates sanitized: title="${updatedNatReq.title}"`);

  // 4. Create Regional Plan Rule with Depth Assignment Configuration
  console.log("\n--- PART 2 & 3: Regional Plan Assignment, Lifecycle & Edit Verification ---");
  const rule = await regionalPlanService.createRegionalPlanRule(region.region_id, {
    name: `Test Mining Strategy Rule ${testId}`,
    performance_scoring_policy: "CAP_100",
    steps: [
      {
        level: 1,
        name: "Strategic Priority",
        requires_weight: false,
        requires_contribution_weight: false,
        allow_kpi: false,
        requires_assignment: false,
        assignment_requirement: "none",
        allow_assignment: false,
      },
      {
        level: 2,
        name: "Goal",
        requires_weight: false,
        requires_contribution_weight: false,
        allow_kpi: false,
        requires_assignment: true,
        assignment_requirement: "required",
        allow_assignment: true,
      },
      {
        level: 3,
        name: "KPI",
        requires_weight: true,
        requires_contribution_weight: false,
        allow_kpi: true,
      },
    ],
  });

  const ruleSteps = await RegionalPlanRuleStep.findAll({
    where: { regional_plan_rule_id: rule.regional_plan_rule_id },
  });
  const sortedRuleSteps = ruleSteps.sort((a, b) => a.level - b.level);
  console.log(`✓ Regional plan rule created with steps:`);
  sortedRuleSteps.forEach((s) => {
    console.log(`   Level ${s.level} (${s.name}): requires_assignment=${s.requires_assignment}, requirement=${s.assignment_requirement}`);
  });

  if (sortedRuleSteps[0].requires_assignment !== false) throw new Error("Level 1 should not require assignment");
  if (sortedRuleSteps[1].requires_assignment !== true) throw new Error("Level 2 must require assignment");
  if (sortedRuleSteps[2].requires_assignment !== true) throw new Error("Level 3 must inherit assignment requirement");
  console.log("✓ Depth inheritance of assignment requirement verified successfully!");

  // 4.5. Create default RegionalPlanningConfiguration
  await RegionalPlanningConfiguration.create({
    regional_planning_config_id: uuidv4(),
    region_id: region.region_id,
    owned_by_plan_version_id: null,
  });
  console.log("✓ Regional planning configuration initialized");

  // 5. Create Master Plan Draft using this rule
  const plan = await regionalPlanService.createRegionalPlanDraft(region.region_id, {
    draft_name: `Test Strategic Plan ${testId}`,
    start_year: 2026,
    end_year: 2028,
    planning_duration_years: 3,
    regional_plan_rule_id: rule.regional_plan_rule_id,
  });
  console.log(`✓ Master plan draft created: ${plan.draft_name} (${plan.regional_plan_version_id})`);

  // 5.5 Test Edit Action on Draft (Part 2 verification)
  const editedPlan = await regionalPlanService.updateRegionalPlanVersion(
    plan.regional_plan_version_id,
    region.region_id,
    {
      draft_name: `Updated Strategic Plan ${testId}`,
      planning_duration_years: 3,
    }
  );
  console.log(`✓ Plan draft edit action verified successfully: "${editedPlan.draft_name}"`);

  // 6. Create Level 1 node (SF)
  const sfNode = await regionalPlanService.createRegionalPlanNode(
    plan.regional_plan_version_id,
    region.region_id,
    {
      title: "Sustainable Mineral Wealth",
      type: "strategic",
      parent_id: null,
      level: 1,
      weight: 0,
    },
    userA.user_id
  );
  console.log(`✓ Level 1 (SF) created: ${sfNode.title}`);

  // 7. Create Level 2 node (Goal) under SF - unassigned initially
  const goalNode = await regionalPlanService.createRegionalPlanNode(
    plan.regional_plan_version_id,
    region.region_id,
    {
      title: "Expand Gold Exploration Capacity",
      type: "goal",
      parent_id: sfNode.regional_plan_node_id,
      level: 2,
      weight: 0,
    },
    userA.user_id
  );
  console.log(`✓ Level 2 (Goal) created: ${goalNode.title}`);

  // 8. Test Draft Readiness Gate when Level 2 is unassigned -> MUST BLOCK!
  let readiness = await regionalPlanService.getRegionalDraftFinalizationReadiness(
    plan.regional_plan_version_id,
    region.region_id
  );
  console.log(`✓ Draft readiness check (unassigned): ready=${readiness.ready}`);
  if (readiness.ready) {
    throw new Error("Draft finalization should be blocked when an assignment-required node is unassigned!");
  }
  console.log(`   Errors: ${readiness.errors.join("; ")}`);
  console.log("✓ Draft readiness correctly blocked when assignment is missing!");

  // 9. Assign Level 2 (Goal) to Directorate A (Mining Exploration Directorate)
  await regionalPlanService.assignRegionalPlanNode(
    goalNode.regional_plan_node_id,
    region.region_id,
    { regional_structure_id: dirA.regional_structure_id },
    userA.user_id
  );
  console.log(`✓ Assigned Goal to department: ${dirA.name}`);

  // 10. Create Level 3 node (KPI) under Goal
  const kpiNode = await regionalPlanService.createRegionalPlanNode(
    plan.regional_plan_version_id,
    region.region_id,
    {
      title: "Geochemical Mapping Sites",
      type: "kpi",
      parent_id: goalNode.regional_plan_node_id,
      level: 3,
      weight_mode: "custom",
      weight: 50,
      target_unit: "sites",
    },
    userA.user_id
  );
  console.log(`✓ Level 3 (KPI) created: ${kpiNode.title}`);

  // 11. Test Hierarchical Scoping Enforcement!
  // 11a. Try to assign KPI to Directorate B (different department branch) -> MUST BE REJECTED!
  let rejectedCrossDept = false;
  try {
    await regionalPlanService.assignRegionalPlanNode(
      kpiNode.regional_plan_node_id,
      region.region_id,
      { regional_structure_id: dirB.regional_structure_id },
      userA.user_id
    );
  } catch (err) {
    rejectedCrossDept = true;
    console.log(`✓ Rejected cross-branch department assignment as expected: "${err.message}"`);
  }
  if (!rejectedCrossDept) {
    throw new Error("Failed to block cross-branch department assignment!");
  }

  // 11b. Try to assign KPI to User B (Charlie in Directorate B) -> MUST BE REJECTED!
  let rejectedCrossUser = false;
  try {
    await regionalPlanService.assignRegionalPlanNode(
      kpiNode.regional_plan_node_id,
      region.region_id,
      { regional_structure_id: dirB.regional_structure_id, assigned_user_id: userB.user_id },
      userA.user_id
    );
  } catch (err) {
    rejectedCrossUser = true;
    console.log(`✓ Rejected cross-branch user assignment as expected: "${err.message}"`);
  }
  if (!rejectedCrossUser) {
    throw new Error("Failed to block cross-branch user assignment!");
  }

  // 11c. Assign KPI to child department (divA1) -> MUST SUCCEED!
  await regionalPlanService.assignRegionalPlanNode(
    kpiNode.regional_plan_node_id,
    region.region_id,
    { regional_structure_id: divA1.regional_structure_id },
    userA.user_id
  );
  console.log(`✓ Successfully assigned KPI to child division: ${divA1.name}`);

  // 11d. Assign KPI to Bob (user in divA1) -> MUST SUCCEED!
  await regionalPlanService.assignRegionalPlanNode(
    kpiNode.regional_plan_node_id,
    region.region_id,
    { regional_structure_id: divA1.regional_structure_id, assigned_user_id: userA1.user_id },
    userA.user_id
  );
  console.log(`✓ Successfully assigned KPI to user in child division: ${userA1.full_name}`);

  // 12. Check Draft Readiness again -> MUST BE READY NOW!
  readiness = await regionalPlanService.getRegionalDraftFinalizationReadiness(
    plan.regional_plan_version_id,
    region.region_id
  );
  console.log(`✓ Draft readiness check (assigned): ready=${readiness.ready}`);
  if (!readiness.ready) {
    throw new Error(`Readiness should be ready! Got errors: ${readiness.errors.join("; ")}`);
  }

  // 13. Finalize Master Plan Draft -> Generates Annual Plans, opens Annual Target Setting
  let finalizedMaster = await regionalPlanService.finalizeRegionalPlanDraft(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Master plan finalized. Status: ${finalizedMaster.status}`);
  console.log(`✓ Master annual_targets_finalized_at is initially null: ${finalizedMaster.annual_targets_finalized_at === null}`);
  if (finalizedMaster.annual_targets_finalized_at !== null) {
    throw new Error("annual_targets_finalized_at should be null right after draft finalization to allow annual target setting!");
  }

  let annualVersions = await regionalPlanService.listRegionalAnnualVersions(plan.regional_plan_version_id, region.region_id);
  console.log(`✓ Annual versions created: count=${annualVersions.length}`);
  if (annualVersions.length !== 3) {
    throw new Error(`Expected 3 annual versions for 3-year plan, got ${annualVersions.length}`);
  }

  // 13.1 IDEMPOTENCY CHECK 1: Re-running finalizeRegionalPlanDraft MUST NOT create duplicates!
  await regionalPlanService.finalizeRegionalPlanDraft(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  annualVersions = await regionalPlanService.listRegionalAnnualVersions(plan.regional_plan_version_id, region.region_id);
  console.log(`✓ Idempotent finalize check: count=${annualVersions.length} (zero duplicate annual versions)`);
  if (annualVersions.length !== 3) {
    throw new Error(`Duplicate annual versions detected on re-finalize! Expected 3, got ${annualVersions.length}`);
  }

  // 13.2 REOPEN DRAFT & CHANGE DURATION CHECK: Reopen -> expand duration from 3 to 5 -> finalize
  await regionalPlanService.reopenRegionalPlanDraftForEdit(plan.regional_plan_version_id, region.region_id, userA.user_id);
  await RegionalPlanVersion.update(
    { planning_duration_years: 5, end_year: 2030 },
    { where: { regional_plan_version_id: plan.regional_plan_version_id } }
  );
  await regionalPlanService.finalizeRegionalPlanDraft(plan.regional_plan_version_id, region.region_id, userA.user_id);
  annualVersions = await regionalPlanService.listRegionalAnnualVersions(plan.regional_plan_version_id, region.region_id);
  console.log(`✓ Expanded duration check (3 -> 5 years): count=${annualVersions.length}`);
  if (annualVersions.length !== 5) {
    throw new Error(`Expected 5 annual versions after expanding duration, got ${annualVersions.length}`);
  }

  // 13.3 REOPEN DRAFT & REDUCE DURATION CHECK: Reopen -> reduce duration from 5 to 3 -> finalize
  await regionalPlanService.reopenRegionalPlanDraftForEdit(plan.regional_plan_version_id, region.region_id, userA.user_id);
  await RegionalPlanVersion.update(
    { planning_duration_years: 3, end_year: 2028 },
    { where: { regional_plan_version_id: plan.regional_plan_version_id } }
  );
  await regionalPlanService.finalizeRegionalPlanDraft(plan.regional_plan_version_id, region.region_id, userA.user_id);
  annualVersions = await regionalPlanService.listRegionalAnnualVersions(plan.regional_plan_version_id, region.region_id);
  console.log(`✓ Reduced duration reconciliation check (5 -> 3 years): count=${annualVersions.length}`);
  if (annualVersions.length !== 3) {
    throw new Error(`Expected 3 annual versions after reducing duration, got ${annualVersions.length}`);
  }

  // 13.4 Test that initializing execution periods BEFORE annual targets finalization is BLOCKED!
  let blockedInitWithoutAnnuals = false;
  try {
    await regionalPlanService.initializeRegionalExecutionPeriods(
      plan.regional_plan_version_id,
      region.region_id,
      "quarterly",
      [],
      userA.user_id
    );
  } catch (err) {
    blockedInitWithoutAnnuals = true;
    console.log(`✓ Initialization blocked without finalized annual targets as expected: "${err.message}"`);
  }
  if (!blockedInitWithoutAnnuals) {
    throw new Error("initializeRegionalExecutionPeriods should have blocked when annual targets are not finalized!");
  }

  // 13.5 ANNUAL TARGET ALLOCATION & VALIDATION
  // Find annual KPI nodes
  const [annYear1, annYear2, annYear3] = annualVersions;
  const kpiYear1 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: annYear1.regional_plan_version_id, source_regional_plan_node_id: kpiNode.regional_plan_node_id },
  });
  const kpiYear2 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: annYear2.regional_plan_version_id, source_regional_plan_node_id: kpiNode.regional_plan_node_id },
  });
  const kpiYear3 = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: annYear3.regional_plan_version_id, source_regional_plan_node_id: kpiNode.regional_plan_node_id },
  });

  // Draft target for KPI is 50. Test exceeding target rejection:
  let rejectedExceedingAnnual = false;
  try {
    await regionalPlanService.updateRegionalAnnualTarget(kpiYear1.regional_plan_node_id, region.region_id, 60, userA.user_id);
  } catch (err) {
    rejectedExceedingAnnual = true;
    console.log(`✓ Exceeding annual target rejected as expected: "${err.message}"`);
  }
  if (!rejectedExceedingAnnual) {
    throw new Error("Setting annual target exceeding draft target should have failed!");
  }

  // Test negative annual target rejection:
  let rejectedNegativeAnnual = false;
  try {
    await regionalPlanService.updateRegionalAnnualTarget(kpiYear1.regional_plan_node_id, region.region_id, -10, userA.user_id);
  } catch (err) {
    rejectedNegativeAnnual = true;
    console.log(`✓ Negative annual target rejected as expected: "${err.message}"`);
  }
  if (!rejectedNegativeAnnual) {
    throw new Error("Setting negative annual target should have failed!");
  }

  // Set valid annual targets: Year 1 = 20, Year 2 = 15, Year 3 = 15 (sum = 50)
  await regionalPlanService.updateRegionalAnnualTarget(kpiYear1.regional_plan_node_id, region.region_id, 20, userA.user_id);
  await regionalPlanService.updateRegionalAnnualTarget(kpiYear2.regional_plan_node_id, region.region_id, 15, userA.user_id);
  await regionalPlanService.updateRegionalAnnualTarget(kpiYear3.regional_plan_node_id, region.region_id, 15, userA.user_id);
  console.log("✓ Annual targets set across 3 years: 20 + 15 + 15 = 50");

  // Check allocations summary calculation
  const allocsYear1 = await regionalPlanService.getRegionalAnnualTargetAllocations(annYear1.regional_plan_version_id, region.region_id);
  const kpiAlloc1 = allocsYear1.find((a) => a.regional_plan_node_id === kpiYear1.regional_plan_node_id);
  console.log("✓ Annual allocations summary for Year 1:", {
    draft_target: kpiAlloc1.draft_target,
    current_year_value: kpiAlloc1.current_year_value,
    allocated_other_years: kpiAlloc1.allocated_other_years,
    allocated_total: kpiAlloc1.allocated_total,
    remaining_for_this_year: kpiAlloc1.remaining_for_this_year,
  });
  if (kpiAlloc1.current_year_value !== 20 || kpiAlloc1.allocated_other_years !== 30 || kpiAlloc1.allocated_total !== 50) {
    throw new Error("Annual target allocations math incorrect!");
  }

  // 14. Finalize Annual Execution Targets
  const finalizedAnnuals = await regionalPlanService.finalizeRegionalAnnualExecution(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Annual targets finalized successfully. annual_targets_finalized_at: ${finalizedAnnuals.annual_targets_finalized_at}`);

  // 15. Initialize Execution Periods (quarterly -> 4 quarters * 3 years = 12 periods)
  let periods = await regionalPlanService.initializeRegionalExecutionPeriods(
    plan.regional_plan_version_id,
    region.region_id,
    "quarterly",
    [],
    userA.user_id
  );
  console.log(`✓ Execution periods initialized successfully: count=${periods.length}`);
  if (periods.length !== 12) {
    throw new Error(`Expected 12 quarterly periods for 3 years, got ${periods.length}`);
  }

  // 15.1 IDEMPOTENCY CHECK 2: Re-running initializeRegionalExecutionPeriods MUST NOT duplicate periods!
  periods = await regionalPlanService.initializeRegionalExecutionPeriods(
    plan.regional_plan_version_id,
    region.region_id,
    "quarterly",
    [],
    userA.user_id
  );
  console.log(`✓ Idempotent execution periods check: count=${periods.length} (zero duplicate periods)`);
  if (periods.length !== 12) {
    throw new Error(`Duplicate periods detected on re-initialize! Expected 12, got ${periods.length}`);
  }

  // 15.2 PERIOD TARGET ALLOCATION & VALIDATION
  // Allocate period targets for Year 1 (quarters 1..4 sum to annual target 20 -> 5 each)
  const year1Periods = periods.filter((p) => p.parent_plan_version_id === annYear1.regional_plan_version_id);
  const q1Node = await RegionalPlanNode.findOne({
    where: { regional_plan_version_id: year1Periods[0].regional_plan_version_id, source_regional_plan_node_id: kpiYear1.regional_plan_node_id },
  });

  // Test exceeding period target rejection:
  let rejectedExceedingPeriod = false;
  try {
    await regionalPlanService.updateRegionalPeriodTarget(q1Node.regional_plan_node_id, region.region_id, 25, userA.user_id);
  } catch (err) {
    rejectedExceedingPeriod = true;
    console.log(`✓ Exceeding period target rejected as expected: "${err.message}"`);
  }
  if (!rejectedExceedingPeriod) {
    throw new Error("Setting period target exceeding annual target should have failed!");
  }

  // Set quarterly targets for all periods
  for (const annual of annualVersions) {
    const annPeriods = periods.filter((p) => p.parent_plan_version_id === annual.regional_plan_version_id);
    const annKpi = await RegionalPlanNode.findOne({
      where: { regional_plan_version_id: annual.regional_plan_version_id, source_regional_plan_node_id: kpiNode.regional_plan_node_id },
    });
    const perQuarter = (Number(annKpi.annual_target) || 0) / annPeriods.length;
    for (const p of annPeriods) {
      const pNode = await RegionalPlanNode.findOne({
        where: { regional_plan_version_id: p.regional_plan_version_id, source_regional_plan_node_id: annKpi.regional_plan_node_id },
      });
      await regionalPlanService.updateRegionalPeriodTarget(pNode.regional_plan_node_id, region.region_id, perQuarter, userA.user_id);
    }
  }
  console.log("✓ Period targets allocated across all quarterly execution periods");

  // Check period allocation summary
  const periodAllocs = await regionalPlanService.getRegionalPeriodTargetAllocations(year1Periods[0].regional_plan_version_id, region.region_id);
  const q1Alloc = periodAllocs.find((a) => a.regional_plan_node_id === q1Node.regional_plan_node_id);
  console.log("✓ Period allocations summary for Q1:", {
    annual_target: q1Alloc.annual_target,
    current_period_value: q1Alloc.current_period_value,
    allocated_other_periods: q1Alloc.allocated_other_periods,
    allocated_total: q1Alloc.allocated_total,
  });
  if (q1Alloc.current_period_value !== 5 || q1Alloc.allocated_total !== 20) {
    throw new Error("Period target allocations math incorrect!");
  }

  // 16. Finalize Period Targets
  const finalizedPeriods = await regionalPlanService.finalizeRegionalPeriodTargets(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Period targets finalized. period_targets_finalized_at: ${finalizedPeriods.period_targets_finalized_at}`);

  // 17. Start Process -> Launches operational execution
  const activePlan = await regionalPlanService.startRegionalPlanProcess(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Regional execution process started: status=${activePlan.status}, execution_status=${activePlan.execution_status}`);

  // 18. Complete First Execution Period
  const firstPeriod = year1Periods[0];
  const completedPeriod = await regionalPlanService.completeRegionalExecutionPeriod(
    firstPeriod.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Execution period completed: ${completedPeriod.period_label || completedPeriod.draft_name}, status=${completedPeriod.status}`);

  // 19. Verify display of assigned department & user in hierarchy view across all 3 views
  const hierarchy = await regionalPlanService.getRegionalPlanHierarchy(
    plan.regional_plan_version_id,
    region.region_id,
    userA
  );

  const kpiNodeHierarchy = hierarchy.nodes.find((n) => n.regional_plan_node_id === kpiNode.regional_plan_node_id);
  const assignments = kpiNodeHierarchy.internalAssignments || [];
  console.log(`✓ KPI assignments in hierarchy: count=${assignments.length}`);
  console.log(`   Department: ${assignments[0]?.department?.name}`);
  console.log(`   AssignedUser: ${assignments[0]?.assignedUser?.full_name}`);

  const labels = getPlanNodeAssignmentLabels(kpiNodeHierarchy);
  console.log(`✓ getPlanNodeAssignmentLabels output:`, labels);
  const hasUserLabel = labels.some((l) => l.type === "user" && l.name === userA1.full_name);
  const hasDeptLabel = labels.some((l) => l.type === "department" && l.name === divA1.name);
  if (!hasUserLabel || !hasDeptLabel) {
    throw new Error("Frontend planAssignmentUtils failed to resolve assigned department or user!");
  }
  console.log("✓ Assigned department and user correctly resolved for all 3 views!");

  console.log("\nALL VERIFICATION CHECKS (PARTS 1, 2, AND 3) PASSED PERFECTLY!");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
