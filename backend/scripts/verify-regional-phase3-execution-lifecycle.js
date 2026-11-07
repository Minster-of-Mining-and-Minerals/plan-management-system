"use strict";

const { v4: uuidv4 } = require("uuid");
const assert = require("assert");

const {
  sequelize,
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalPlanningConfiguration,
  RegionalInternalAssignment,
  RegionalStructure,
  Region,
  User,
  Role,
  Permission,
} = require("../models");

const regionalPlanService = require("../services/regionalPlanService");

let testRegion = null;
let testRule = null;
let testConfig = null;
let adminUser = null;
let restrictedUser = null;
let testDept = null;
let masterVersion = null;

async function setupFixtures() {
  console.log("Setting up test fixtures for Phase 3...");

  testRegion = await Region.create({
    region_id: uuidv4(),
    name: `Phase 3 Region ${Date.now()}`,
    code: `P3-${Date.now().toString().slice(-4)}`,
    status: "active",
  });

  testDept = await RegionalStructure.create({
    regional_structure_id: uuidv4(),
    region_id: testRegion.region_id,
    name: "Revenue Operations Directorate",
    code: "ROD",
    level: 1,
    is_active: true,
  });

  adminUser = await User.create({
    user_id: uuidv4(),
    email: `phase3.admin.${Date.now()}@example.com`,
    password: "Password123!",
    password_hash: "hash",
    full_name: "Phase 3 Admin",
    status: "active",
    region_id: testRegion.region_id,
  });

  restrictedUser = await User.create({
    user_id: uuidv4(),
    email: `phase3.officer.${Date.now()}@example.com`,
    password: "Password123!",
    password_hash: "hash",
    full_name: "Phase 3 Restricted Officer",
    status: "active",
    region_id: testRegion.region_id,
  });

  // Create roles
  const adminRole = await Role.create({
    role_id: uuidv4(),
    name: `phase3_admin_${Date.now()}`,
    description: "Phase 3 Admin Role",
    status: "active",
  });

  const officerRole = await Role.create({
    role_id: uuidv4(),
    name: `phase3_officer_${Date.now()}`,
    description: "Phase 3 Restricted Officer Role",
    status: "active",
  });

  const permActions = [
    { resource: "regional_plans", action: "manage" },
    { resource: "regional_plans", action: "update" },
    { resource: "regional_plans", action: "finalize" },
    { resource: "regional_plans", action: "execute_achievement" },
    { resource: "regional_plans", action: "approve_achievement" },
    { resource: "regional_plans", action: "validate_achievement" },
    { resource: "regional_plans", action: "reopen_period" },
    { resource: "regions", action: "manage" },
  ];

  const adminPermObjs = [];
  for (const pa of permActions) {
    let [perm] = await Permission.findOrCreate({
      where: { resource: pa.resource, action: pa.action },
      defaults: { permission_id: uuidv4(), resource: pa.resource, action: pa.action },
    });
    adminPermObjs.push(perm);
  }
  await adminRole.setPermissions(adminPermObjs);
  await adminUser.setRoles([adminRole]);

  // Restricted officer only has read and execute (NO reopen, NO finalize)
  const officerPermActions = [
    { resource: "regional_plans", action: "read" },
    { resource: "regional_plans", action: "execute_achievement" },
  ];
  const officerPermObjs = [];
  for (const pa of officerPermActions) {
    let [perm] = await Permission.findOrCreate({
      where: { resource: pa.resource, action: pa.action },
      defaults: { permission_id: uuidv4(), resource: pa.resource, action: pa.action },
    });
    officerPermObjs.push(perm);
  }
  await officerRole.setPermissions(officerPermObjs);
  await restrictedUser.setRoles([officerRole]);

  testRule = await RegionalPlanRule.create({
    regional_plan_rule_id: uuidv4(),
    region_id: testRegion.region_id,
    name: "Standard 3-Tier Regional Rule",
    total_levels: 3,
    max_depth: 3,
    performance_scoring_policy: "STANDARD",
    is_active: true,
  });

  await RegionalPlanRuleStep.bulkCreate([
    { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 1, name: "SF", label: "Strategic Focus", allow_kpi: false, requires_weight: false },
    { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 2, name: "Goal", label: "Goal", allow_kpi: false, requires_weight: false },
    { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 3, name: "KPI", label: "Key Performance Indicator", allow_kpi: true, requires_weight: true },
  ]);

  testConfig = await RegionalPlanningConfiguration.create({
    regional_planning_config_id: uuidv4(),
    region_id: testRegion.region_id,
    breakdown_mode: "quarterly",
    is_active: true,
  });

  masterVersion = await RegionalPlanVersion.create({
    regional_plan_version_id: uuidv4(),
    region_id: testRegion.region_id,
    regional_plan_rule_id: testRule.regional_plan_rule_id,
    regional_planning_config_id: testConfig.regional_planning_config_id,
    draft_name: "5-Year Regional Master Strategy",
    version_kind: "master",
    version_number: 1,
    status: "draft",
    start_year: 2026,
    end_year: 2027, // 2 planning years
    planning_duration_years: 2,
    period_subdivision_mode: "quarterly",
    is_locked: false,
  });

  console.log("Fixtures initialized successfully.");
}

async function runTests() {
  try {
    await setupFixtures();

    // 1. Build initial draft hierarchy
    const sfNode = await regionalPlanService.createRegionalPlanNode(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      { title: "SF 1 - Economic Expansion", level: 1, type: "sf" },
      adminUser.user_id
    );

    const goalNode = await regionalPlanService.createRegionalPlanNode(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      { parent_id: sfNode.regional_plan_node_id, title: "Goal 1 - Revenue Modernization", level: 2, type: "goal" },
      adminUser.user_id
    );

    const kpi1Node = await regionalPlanService.createRegionalPlanNode(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      {
        parent_id: goalNode.regional_plan_node_id,
        title: "KPI 1 - Domestic Revenue",
        weight: 100,
        weight_mode: "number",
        target_unit: "Million USD",
        level: 3,
        type: "kpi",
      },
      adminUser.user_id
    );

    console.log("\n--- Test 1: Finalize Master Draft & Initialize Execution Periods ---");
    await regionalPlanService.finalizeRegionalPlanDraft(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      adminUser.user_id
    );

    const annuals = await regionalPlanService.listRegionalAnnualVersions(
      masterVersion.regional_plan_version_id,
      testRegion.region_id
    );
    assert.strictEqual(annuals.length, 2, "2 annual years generated");

    // Distribute annual targets: 50 on Year 1, 50 on Year 2 (sum = 100)
    const year1 = annuals[0];
    const year2 = annuals[1];

    const y1Nodes = await RegionalPlanNode.findAll({ where: { regional_plan_version_id: year1.regional_plan_version_id } });
    const y1Kpi1 = y1Nodes.find((n) => n.source_regional_plan_node_id === kpi1Node.regional_plan_node_id);
    await regionalPlanService.updateRegionalAnnualTarget(y1Kpi1.regional_plan_node_id, testRegion.region_id, 50, adminUser.user_id);

    const y2Nodes = await RegionalPlanNode.findAll({ where: { regional_plan_version_id: year2.regional_plan_version_id } });
    const y2Kpi1 = y2Nodes.find((n) => n.source_regional_plan_node_id === kpi1Node.regional_plan_node_id);
    await regionalPlanService.updateRegionalAnnualTarget(y2Kpi1.regional_plan_node_id, testRegion.region_id, 50, adminUser.user_id);

    await regionalPlanService.finalizeRegionalAnnualExecution(masterVersion.regional_plan_version_id, testRegion.region_id, adminUser.user_id);
    await regionalPlanService.initializeRegionalExecutionPeriods(masterVersion.regional_plan_version_id, testRegion.region_id, "quarterly", adminUser.user_id);
    await regionalPlanService.distributeRegionalPeriodTargetsEqually(year1.regional_plan_version_id, testRegion.region_id, adminUser.user_id);
    await regionalPlanService.distributeRegionalPeriodTargetsEqually(year2.regional_plan_version_id, testRegion.region_id, adminUser.user_id);
    await regionalPlanService.finalizeRegionalPeriodTargets(year1.regional_plan_version_id, testRegion.region_id, adminUser.user_id);
    await regionalPlanService.finalizeRegionalPeriodTargets(year2.regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    console.log("  [PASS] Initial draft, annuals, and execution periods finalized");

    console.log("\n--- Test 2: Draft Configuration Propagation to Execution Periods ---");
    // Add KPI 2 to master draft
    const kpi2Node = await regionalPlanService.createRegionalPlanNode(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      {
        parent_id: goalNode.regional_plan_node_id,
        title: "KPI 2 - Commercial Tax Compliance",
        weight: 50,
        contribution_weight: 40,
        weight_mode: "number",
        target_unit: "Percentage",
        level: 3,
        type: "kpi",
        force: true,
      },
      adminUser.user_id
    );

    // Propagate changes
    await regionalPlanService.propagateRegionalMasterDraftChanges(masterVersion.regional_plan_version_id);

    const y1Periods = await RegionalPlanVersion.findAll({
      where: { parent_plan_version_id: year1.regional_plan_version_id, version_kind: "execution_period" },
      order: [["sequence_index", "ASC"]],
    });
    const q1Period = y1Periods[0];
    const q1Nodes = await RegionalPlanNode.findAll({ where: { regional_plan_version_id: q1Period.regional_plan_version_id } });

    const q1Kpi2 = q1Nodes.find((n) => n.title === "KPI 2 - Commercial Tax Compliance");
    assert(q1Kpi2, "KPI 2 was cleanly propagated into Q1 execution period");
    assert.strictEqual(Number(q1Kpi2.contribution_weight), 40, "Contribution weight propagated correctly");
    console.log("  [PASS] Master draft additions and contribution weights propagate into execution periods");

    console.log("\n--- Test 3: Start Execution Process ---");
    await regionalPlanService.startRegionalPlanProcess(masterVersion.regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    const reloadedQ1 = await RegionalPlanVersion.findByPk(q1Period.regional_plan_version_id);
    assert.strictEqual(reloadedQ1.execution_status, "open", "Q1 execution status is open");
    assert.strictEqual(reloadedQ1.is_locked, false, "Q1 is not locked");

    const reloadedQ2 = await RegionalPlanVersion.findByPk(y1Periods[1].regional_plan_version_id);
    assert.strictEqual(reloadedQ2.execution_status, "locked", "Q2 execution status is initially locked");

    console.log("  [PASS] Process started: Year 1 Q1 is open, Q2 is locked");

    console.log("\n--- Test 4: Target Entry Allowed on Open Period, Blocked on Locked Period ---");
    const q1Kpi1 = q1Nodes.find((n) => n.source_regional_plan_node_id === y1Kpi1.regional_plan_node_id);
    const updatedQ1Target = await regionalPlanService.updateRegionalPeriodTarget(
      q1Kpi1.regional_plan_node_id,
      testRegion.region_id,
      15,
      adminUser.user_id
    );
    assert.strictEqual(Number(updatedQ1Target.period_target), 15, "Target updated on open period");

    // Attempting to update target on locked Q2 node must fail with clear 'period is not open' message
    const q2Nodes = await RegionalPlanNode.findAll({ where: { regional_plan_version_id: y1Periods[1].regional_plan_version_id } });
    const q2Kpi1 = q2Nodes.find((n) => n.source_regional_plan_node_id === y1Kpi1.regional_plan_node_id);
    let lockedTargetBlocked = false;
    try {
      await regionalPlanService.updateRegionalPeriodTarget(
        q2Kpi1.regional_plan_node_id,
        testRegion.region_id,
        15,
        adminUser.user_id
      );
    } catch (err) {
      lockedTargetBlocked = true;
      assert(err.message.includes("period is not open"), `Error mentions period is not open: ${err.message}`);
    }
    assert(lockedTargetBlocked, "Target entry on locked period was rejected with proper status check");
    console.log("  [PASS] Target entry succeeds on open period and is rejected with authoritative status error on locked period");

    console.log("\n--- Test 5: Period 1 Completion & Clean Transition to Period 2 ---");
    // Fulfill Q1 actuals for KPI 1 and KPI 2 so Q1 can complete
    await RegionalPlanNode.update(
      { period_actual: 15, period_actual_status: "validated" },
      { where: { regional_plan_node_id: q1Kpi1.regional_plan_node_id } }
    );
    await RegionalPlanNode.update(
      { period_actual: 10, period_actual_status: "validated" },
      { where: { regional_plan_node_id: q1Kpi2.regional_plan_node_id } }
    );

    await regionalPlanService.completeRegionalExecutionPeriod(q1Period.regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    const postCompleteQ1 = await RegionalPlanVersion.findByPk(q1Period.regional_plan_version_id);
    assert.strictEqual(postCompleteQ1.execution_status, "completed", "Q1 execution status is completed");

    const postCompleteQ2 = await RegionalPlanVersion.findByPk(y1Periods[1].regional_plan_version_id);
    assert.strictEqual(postCompleteQ2.execution_status, "open", "Q2 execution status transitioned to open");
    assert.strictEqual(postCompleteQ2.is_locked, false, "Q2 is unlocked");

    // Now updating target on Q2 MUST SUCCEED because Q2 is now open!
    const q2TargetUpdated = await regionalPlanService.updateRegionalPeriodTarget(
      q2Kpi1.regional_plan_node_id,
      testRegion.region_id,
      15,
      adminUser.user_id
    );
    assert.strictEqual(Number(q2TargetUpdated.period_target), 15, "Target entry on newly opened Period 2 succeeded without status mismatch!");
    console.log("  [PASS] Period 1 completed, Period 2 opened, target entry on Period 2 succeeded seamlessly!");

    console.log("\n--- Test 6: Advance Execution Gate Across Annual Boundaries ---");
    // Complete Q2, Q3, and Q4 of Year 1
    const q3Period = y1Periods[2];
    const q4Period = y1Periods[3];

    // Mark Q2 nodes validated and complete Q2
    await RegionalPlanNode.update({ period_actual: 15, period_actual_status: "validated" }, { where: { regional_plan_version_id: y1Periods[1].regional_plan_version_id } });
    await regionalPlanService.completeRegionalExecutionPeriod(y1Periods[1].regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    // Mark Q3 nodes validated and complete Q3
    await RegionalPlanNode.update({ period_actual: 10, period_actual_status: "validated" }, { where: { regional_plan_version_id: q3Period.regional_plan_version_id } });
    await regionalPlanService.completeRegionalExecutionPeriod(q3Period.regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    // Mark Q4 nodes validated and complete Q4 (last period of Year 1)
    await RegionalPlanNode.update({ period_actual: 10, period_actual_status: "validated" }, { where: { regional_plan_version_id: q4Period.regional_plan_version_id } });
    await regionalPlanService.completeRegionalExecutionPeriod(q4Period.regional_plan_version_id, testRegion.region_id, adminUser.user_id);

    // Year 1 should now be completed, and Year 2 Period 1 should be unlocked and open!
    const postY1 = await RegionalPlanVersion.findByPk(year1.regional_plan_version_id);
    assert.strictEqual(postY1.execution_status, "completed", "Year 1 completed automatically when its last quarter completed");

    const postY2 = await RegionalPlanVersion.findByPk(year2.regional_plan_version_id);
    assert.strictEqual(postY2.execution_status, "open", "Year 2 opened automatically");

    const y2Periods = await RegionalPlanVersion.findAll({
      where: { parent_plan_version_id: year2.regional_plan_version_id, version_kind: "execution_period" },
      order: [["sequence_index", "ASC"]],
    });
    const y2Q1 = y2Periods[0];
    assert.strictEqual(y2Q1.execution_status, "open", "Year 2 Q1 is open for execution");
    assert.strictEqual(y2Q1.is_locked, false, "Year 2 Q1 is unlocked");
    console.log("  [PASS] Final period completion in Year 1 advanced execution gate to Year 2 and opened Year 2 Q1!");

    console.log("\n--- Test 7: Dedicated Permission Check for Period Reopening ---");
    // Attempt reopening Q1 with restricted user (lacks regional_plans:reopen_period)
    let reopenForbidden = false;
    try {
      await regionalPlanService.reopenRegionalExecutionPeriod(q1Period.regional_plan_version_id, testRegion.region_id, restrictedUser);
    } catch (err) {
      reopenForbidden = true;
      assert.strictEqual(err.status, 403, "Status is 403 Forbidden");
      assert(err.message.includes("permission"), `Error message mentions permission: ${err.message}`);
    }
    assert(reopenForbidden, "User without reopen permission was blocked with 403");

    // Reopen Q1 with admin user (has regional_plans:reopen_period)
    const reopenedQ1 = await regionalPlanService.reopenRegionalExecutionPeriod(q1Period.regional_plan_version_id, testRegion.region_id, adminUser);
    assert.strictEqual(reopenedQ1.execution_status, "open", "Reopened period status is open");
    assert.strictEqual(reopenedQ1.status, "active", "Reopened period status is active");
    assert.strictEqual(reopenedQ1.is_locked, false, "Reopened period is unlocked");

    // Verify previous actuals and narrations were held intact
    const reloadedQ1Kpi1 = await RegionalPlanNode.findByPk(q1Kpi1.regional_plan_node_id);
    assert.strictEqual(Number(reloadedQ1Kpi1.period_actual), 15, "Previous actual preserved intact");
    assert.strictEqual(reloadedQ1Kpi1.period_actual_status, "validated", "Previous status preserved intact");
    console.log("  [PASS] Dedicated permission check enforced: unauthorized blocked with 403, authorized successfully reopened holding all data intact!");

    console.log("\n===============================================================================");
    console.log("   ALL PHASE 3 EXECUTION & PROPAGATION TESTS PASSED SUCCESSFULLY! (7/7)");
    console.log("===============================================================================\n");
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  } finally {
    console.log("Cleaning up fixtures...");
    try {
      if (testRegion) {
        await RegionalInternalAssignment.destroy({ where: {} });
        await RegionalPlanNode.destroy({ where: {} });
        await RegionalPlanVersion.destroy({ where: { region_id: testRegion.region_id } });
        await RegionalPlanningConfiguration.destroy({ where: { region_id: testRegion.region_id } });
        await RegionalPlanRule.destroy({ where: { region_id: testRegion.region_id } });
        await RegionalStructure.destroy({ where: { region_id: testRegion.region_id } });
        if (adminUser) await adminUser.destroy();
        if (restrictedUser) await restrictedUser.destroy();
        await testRegion.destroy();
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }
    await sequelize.close();
  }
}

runTests();
