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
  User,
  sequelize,
} = require("../models");

const regionalPlanService = require("../services/regionalPlanService");
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
  // Parent Directorate A -> Child Division A.1
  // Independent Directorate B (different branch)
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

  // 4. Create Regional Plan Rule with Assignment Requirement beginning at Level 2 (Goal)
  const rule = await regionalPlanService.createRegionalPlanRule(region.region_id, {
    name: `Custom 3-Level Assignment Rule ${testId}`,
    is_active: true,
    steps: [
      { step_order: 1, label: "Strategic Priority", requires_weight: false, requires_contribution_weight: false, requires_assignment: false, color_hex: "#8B5CF6" },
      { step_order: 2, label: "Goal", requires_weight: false, requires_contribution_weight: false, requires_assignment: true, color_hex: "#3B82F6" },
      { step_order: 3, label: "KPI", requires_weight: true, requires_contribution_weight: true, color_hex: "#10B981" },
    ],
  });

  const sortedRuleSteps = (rule.steps || []).sort((a, b) => a.level - b.level);
  console.log("✓ Regional plan rule created with steps:");
  for (const s of sortedRuleSteps) {
    console.log(`   Level ${s.level} (${s.name}): requires_assignment=${s.requires_assignment}, requirement=${s.assignment_requirement}`);
  }

  // Check depth inheritance:
  // Level 1: requires_assignment = false
  // Level 2: requires_assignment = true
  // Level 3: requires_assignment = true (inherited!)
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

  // 8. Check draft finalization readiness - should FAIL because Goal is unassigned!
  let readiness = await regionalPlanService.getRegionalDraftFinalizationReadiness(
    plan.regional_plan_version_id,
    region.region_id
  );
  console.log(`✓ Draft readiness check (unassigned): ready=${readiness.ready}`);
  console.log(`   Errors: ${readiness.errors.join("; ")}`);
  if (readiness.ready) {
    throw new Error("Readiness should NOT be ready when required assignment is missing!");
  }
  const hasAssignmentError = readiness.errors.some((e) => e.includes("requires organizational assignment"));
  if (!hasAssignmentError) {
    throw new Error("Expected assignment readiness error missing!");
  }
  console.log("✓ Draft readiness correctly blocked when assignment is missing!");

  // 9. Assign Level 2 (Goal) to Mining Exploration Directorate (dirA)
  await regionalPlanService.assignRegionalPlanNode(
    goalNode.regional_plan_node_id,
    region.region_id,
    { regional_structure_id: dirA.regional_structure_id },
    userA.user_id
  );
  console.log(`✓ Assigned Goal to department: ${dirA.name}`);

  // 10. Create Level 3 (KPI) under Goal with weight & contribution
  const kpiNode = await regionalPlanService.createRegionalPlanNode(
    plan.regional_plan_version_id,
    region.region_id,
    {
      title: "Geochemical Mapping Sites",
      type: "kpi",
      parent_id: goalNode.regional_plan_node_id,
      level: 3,
      weight: 100,
      weight_mode: "percentage",
      contribution_weight: 100,
    },
    userA.user_id
  );
  console.log(`✓ Level 3 (KPI) created: ${kpiNode.title}`);

  // 11. Test Hierarchical Assignment Scoping Constraint on KPI:
  // Scenario: "if goal is required and assigned to dept the kpi only can be assigned to that dept child dept or that dept users"

  // 11a. Attempt assigning KPI to Directorate B (CROSS-BRANCH) -> MUST BE REJECTED (400)
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

  // 11b. Attempt assigning KPI to Charlie (user in Directorate B) -> MUST BE REJECTED (400)
  let rejectedCrossUser = false;
  try {
    await regionalPlanService.assignRegionalPlanNode(
      kpiNode.regional_plan_node_id,
      region.region_id,
      { assigned_user_id: userB.user_id },
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

  // 13. Finalize Master Plan Draft
  const finalizedMaster = await regionalPlanService.finalizeRegionalPlanDraft(
    plan.regional_plan_version_id,
    region.region_id,
    userA.user_id
  );
  console.log(`✓ Master plan finalized. Status: ${finalizedMaster.status}`);

  // 14. Initialize Execution Periods (verifying annual execution initialization button readiness)
  const periods = await regionalPlanService.initializeRegionalExecutionPeriods(
    plan.regional_plan_version_id,
    region.region_id,
    "quarterly",
    [],
    userA.user_id
  );
  console.log(`✓ Execution periods initialized successfully: count=${periods.length}`);
  if (periods.length === 0) {
    throw new Error("Execution periods were not generated!");
  }

  // 15. Verify display of assigned department & user in hierarchy view
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

  // Test the frontend utility `getPlanNodeAssignmentLabels`
  const labels = getPlanNodeAssignmentLabels(kpiNodeHierarchy);
  console.log(`✓ getPlanNodeAssignmentLabels output:`, labels);
  const hasUserLabel = labels.some((l) => l.type === "user" && l.name === userA1.full_name);
  const hasDeptLabel = labels.some((l) => l.type === "department" && l.name === divA1.name);
  if (!hasUserLabel || !hasDeptLabel) {
    throw new Error("Frontend planAssignmentUtils failed to resolve assigned department or user!");
  }
  console.log("✓ Assigned department and user correctly resolved for all 3 views!");

  console.log("\nALL VERIFICATION CHECKS PASSED PERFECTLY!");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
