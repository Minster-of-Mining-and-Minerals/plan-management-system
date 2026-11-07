"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  sequelize,
  Region,
  RegionalStructure,
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanNodeActionLog,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalInternalAssignment,
  User,
  Role,
  Permission,
  RolePermission,
  UserRoles,
} = require("../models");

const regionalPlanService = require("../services/regionalPlanService");
const {
  submitRegionalAchievementWorkflow,
  approveRegionalAchievementWorkflow,
  rejectRegionalAchievementWorkflow,
  validateRegionalAchievementWorkflow,
} = require("../services/regionalPlanAchievementWorkflowService");

async function runTests() {
  console.log("===============================================================================");
  console.log("   REGIONAL PERIOD COMPLETION VALIDATION & REOPENING - TEST SUITE");
  console.log("===============================================================================\n");

  const testRunId = uuidv4().slice(0, 8);
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
    }
  }

  // Cleanup references
  let testRegion, testRule, testUser, masterVersion, annualVersion, period1Version, period2Version, officerRole;
  let sfNode, goalNode, kpi1Node, kpi2Node;

  try {
    // -------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------
    console.log("Setting up test fixtures...");

    testRegion = await Region.create({
      region_id: uuidv4(),
      name: `Test Region ${testRunId}`,
      code: `TR_${testRunId}`,
      is_active: true,
    });

    const getPerm = async (resource, action) => {
      let p = await Permission.findOne({ where: { resource, action } });
      if (!p) {
        p = await Permission.create({
          permission_id: uuidv4(),
          name: `${resource}:${action}`,
          resource,
          action,
          permission_tier: "standard",
          is_active: true,
        });
      }
      return p;
    };

    const permExecute = await getPerm("regional_plans", "execute_achievement");
    const permApprove = await getPerm("regional_plans", "approve_achievement");
    const permValidate = await getPerm("regional_plans", "validate_achievement");
    const permBypass = await getPerm("regional_plans", "bypass_achievement_assignment");
    const permFinalize = await getPerm("regional_plans", "finalize");

    officerRole = await Role.create({
      role_id: uuidv4(),
      name: `Test Officer Role ${testRunId}`,
      scope: "regional",
      is_active: true,
    });
    await RolePermission.create({ role_permission_id: uuidv4(), role_id: officerRole.role_id, permission_id: permExecute.permission_id });
    await RolePermission.create({ role_permission_id: uuidv4(), role_id: officerRole.role_id, permission_id: permBypass.permission_id });
    await RolePermission.create({ role_permission_id: uuidv4(), role_id: officerRole.role_id, permission_id: permApprove.permission_id });
    await RolePermission.create({ role_permission_id: uuidv4(), role_id: officerRole.role_id, permission_id: permValidate.permission_id });
    await RolePermission.create({ role_permission_id: uuidv4(), role_id: officerRole.role_id, permission_id: permFinalize.permission_id });

    const u = await User.create({
      user_id: uuidv4(),
      full_name: "Test Officer",
      first_name: "Test",
      last_name: "Officer",
      email: `test_officer_${testRunId}@example.com`,
      password: "hash",
      is_active: true,
      region_id: testRegion.region_id,
    });
    await UserRoles.create({
      user_role_id: uuidv4(),
      user_id: u.user_id,
      role_id: officerRole.role_id,
    });
    testUser = await User.findByPk(u.user_id, {
      include: [{ association: "roles", include: [{ association: "rolePermissions", include: ["permission"] }] }],
    });

    testRule = await RegionalPlanRule.create({
      regional_plan_rule_id: uuidv4(),
      region_id: testRegion.region_id,
      name: `Test Rule ${testRunId}`,
      total_levels: 3,
      performance_scoring_policy: "STANDARD",
      is_active: true,
    });
    await RegionalPlanRuleStep.bulkCreate([
      { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 1, name: "SF", label: "Strategic Focus", allow_kpi: false, requires_weight: false },
      { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 2, name: "Goal", label: "Goal", allow_kpi: false, requires_weight: false },
      { rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 3, name: "KPI", label: "Key Performance Indicator", allow_kpi: true, requires_weight: true },
    ]);

    masterVersion = await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: testRegion.region_id,
      regional_plan_rule_id: testRule.regional_plan_rule_id,
      draft_name: `Master Plan ${testRunId}`,
      version_kind: "master",
      version_number: 1,
      status: "active",
      planning_year: 2026,
      start_year: 2026,
      end_year: 2030,
      start_month: 1,
      end_month: 12,
      planning_duration_years: 5,
      is_locked: false,
    });

    annualVersion = await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: testRegion.region_id,
      parent_plan_version_id: masterVersion.regional_plan_version_id,
      regional_plan_rule_id: testRule.regional_plan_rule_id,
      draft_name: `Year 1 Plan ${testRunId}`,
      version_kind: "annual",
      version_number: 1,
      status: "active",
      planning_year: 2026,
      sequence_index: 1,
      start_year: 2026,
      end_year: 2026,
      start_month: 1,
      end_month: 12,
      planning_duration_years: 1,
      is_locked: false,
    });

    period1Version = await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: testRegion.region_id,
      parent_plan_version_id: annualVersion.regional_plan_version_id,
      regional_plan_rule_id: testRule.regional_plan_rule_id,
      draft_name: `Q1 Execution ${testRunId}`,
      period_label: "Quarter 1",
      version_kind: "execution_period",
      version_number: 1,
      status: "active",
      execution_status: "open",
      planning_year: 2026,
      sequence_index: 1,
      start_year: 2026,
      end_year: 2026,
      start_month: 1,
      end_month: 3,
      planning_duration_years: 1,
      is_locked: false,
    });

    period2Version = await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: testRegion.region_id,
      parent_plan_version_id: annualVersion.regional_plan_version_id,
      regional_plan_rule_id: testRule.regional_plan_rule_id,
      draft_name: `Q2 Execution ${testRunId}`,
      period_label: "Quarter 2",
      version_kind: "execution_period",
      version_number: 1,
      status: "active",
      execution_status: "locked",
      planning_year: 2026,
      sequence_index: 2,
      start_year: 2026,
      end_year: 2026,
      start_month: 4,
      end_month: 6,
      planning_duration_years: 1,
      is_locked: true,
    });

    // Create Hierarchy in Period 1: SF -> Goal -> KPI 1 & KPI 2
    sfNode = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: period1Version.regional_plan_version_id,
      title: "Strategic Focus A",
      level: 1,
      order: 1,
      is_active: true,
    });

    goalNode = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: period1Version.regional_plan_version_id,
      parent_id: sfNode.regional_plan_node_id,
      title: "Goal A1",
      level: 2,
      order: 1,
      is_active: true,
    });

    kpi1Node = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: period1Version.regional_plan_version_id,
      parent_id: goalNode.regional_plan_node_id,
      title: "KPI 1 - Revenue Collection",
      level: 3,
      order: 1,
      period_target: 100,
      period_actual: null,
      period_actual_status: "empty",
      is_validation_required: false,
      is_active: true,
    });

    kpi2Node = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: period1Version.regional_plan_version_id,
      parent_id: goalNode.regional_plan_node_id,
      title: "KPI 2 - Project Delivery",
      level: 3,
      order: 2,
      period_target: 50,
      period_actual: null,
      period_actual_status: "empty",
      is_validation_required: false,
      is_active: true,
    });

    console.log("Fixtures created successfully.\n");

    // -------------------------------------------------------------
    // Test 1: Completion Readiness with Unexecuted Targets
    // -------------------------------------------------------------
    console.log("--- Test 1: Completion Readiness with Missing/Unexecuted Targets ---");
    const r1 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r1.ready === false, "Readiness is false when targets are unexecuted");
    assert(r1.required_count === 2, `Required count is 2 (got ${r1.required_count})`);
    assert(r1.missing_count === 2, `Missing count is 2 (got ${r1.missing_count})`);
    assert(
      r1.missing_titles.includes("KPI 1 - Revenue Collection") &&
        r1.missing_titles.includes("KPI 2 - Project Delivery"),
      "Missing titles list both unexecuted KPIs"
    );

    let completeBlocked = false;
    try {
      await regionalPlanService.completeRegionalExecutionPeriod(
        period1Version.regional_plan_version_id,
        testRegion.region_id,
        testUser.user_id
      );
    } catch (err) {
      completeBlocked = true;
      assert(err.status === 400, "Blocked with status 400");
      assert(
        err.message.includes("Record achievement for all required leaf targets before completing this period"),
        `Error message explicitly mentions missing targets: "${err.message}"`
      );
    }
    assert(completeBlocked, "completeRegionalExecutionPeriod was blocked");

    // -------------------------------------------------------------
    // Test 2: Completion Readiness with Pending Approval
    // -------------------------------------------------------------
    console.log("\n--- Test 2: Completion Readiness with Pending Approval ---");
    await kpi1Node.update({ period_actual: 90, period_actual_status: "submitted" });
    await kpi2Node.update({ period_actual: 45, period_actual_status: "submitted" });

    const r2 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r2.ready === false, "Readiness is false when pending approval");
    assert(r2.missing_count === 0, "Missing count is 0");
    assert(r2.pending_approval_count === 2, `Pending approval count is 2 (got ${r2.pending_approval_count})`);

    let approvalBlocked = false;
    try {
      await regionalPlanService.completeRegionalExecutionPeriod(
        period1Version.regional_plan_version_id,
        testRegion.region_id,
        testUser.user_id
      );
    } catch (err) {
      approvalBlocked = true;
      assert(
        err.message.includes("Approve all pending achievements before completing this period"),
        `Error message explicitly mentions pending approval: "${err.message}"`
      );
    }
    assert(approvalBlocked, "completeRegionalExecutionPeriod was blocked for pending approval");

    // -------------------------------------------------------------
    // Test 3: Completion Readiness with Pending Validation
    // -------------------------------------------------------------
    console.log("\n--- Test 3: Completion Readiness with Pending Validation ---");
    await kpi1Node.update({ period_actual_status: "approved", is_validation_required: true });
    await kpi2Node.update({ period_actual_status: "approved", is_validation_required: true });

    const r3 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r3.ready === false, "Readiness is false when pending validation");
    assert(r3.pending_validation_count === 2, `Pending validation count is 2 (got ${r3.pending_validation_count})`);

    let validationBlocked = false;
    try {
      await regionalPlanService.completeRegionalExecutionPeriod(
        period1Version.regional_plan_version_id,
        testRegion.region_id,
        testUser.user_id
      );
    } catch (err) {
      validationBlocked = true;
      assert(
        err.message.includes("Validate all execution-approved achievements before completing this period"),
        `Error message explicitly mentions pending validation: "${err.message}"`
      );
    }
    assert(validationBlocked, "completeRegionalExecutionPeriod was blocked for pending validation");

    // -------------------------------------------------------------
    // Test 4: Completion Readiness with Rejected Milestone
    // -------------------------------------------------------------
    console.log("\n--- Test 4: Completion Readiness with Rejected Milestone ---");
    await kpi1Node.update({ period_actual_status: "validated" });
    await kpi2Node.update({ period_actual_status: "rejected", period_actual_rejection_comment: "Actual is incorrect" });

    const r4 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r4.ready === false, "Readiness is false when rejected nodes exist");
    assert(r4.rejected_count === 1, `Rejected count is 1 (got ${r4.rejected_count})`);
    assert(r4.rejected_titles.includes("KPI 2 - Project Delivery"), "Rejected titles contains KPI 2");

    let rejectionBlocked = false;
    try {
      await regionalPlanService.completeRegionalExecutionPeriod(
        period1Version.regional_plan_version_id,
        testRegion.region_id,
        testUser.user_id
      );
    } catch (err) {
      rejectionBlocked = true;
      assert(
        err.message.includes("Resubmit rejected achievements before completing this period"),
        `Error message explicitly mentions rejected achievements: "${err.message}"`
      );
    }
    assert(rejectionBlocked, "completeRegionalExecutionPeriod was blocked for rejected achievements");

    // -------------------------------------------------------------
    // Test 5: Successful Period Completion and Next Period Activation
    // -------------------------------------------------------------
    console.log("\n--- Test 5: Successful Period Completion and Next Period Activation ---");
    await kpi2Node.update({ period_actual: 50, period_actual_status: "validated" });

    const r5 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r5.ready === true, "Readiness is true when all nodes are validated");
    assert(r5.approved_count === 2, "Approved count is 2");
    assert(r5.missing_count === 0, "Missing count is 0");
    assert(r5.pending_approval_count === 0, "Pending approval is 0");
    assert(r5.pending_validation_count === 0, "Pending validation is 0");
    assert(r5.rejected_count === 0, "Rejected count is 0");

    const completedPeriod = await regionalPlanService.completeRegionalExecutionPeriod(
      period1Version.regional_plan_version_id,
      testRegion.region_id,
      testUser.user_id
    );
    assert(completedPeriod.status === "completed", "Period 1 status is completed");
    assert(completedPeriod.execution_status === "completed", "Period 1 execution_status is completed");

    // Check next period (Period 2) was unlocked and activated
    const nextPeriod = await RegionalPlanVersion.findByPk(period2Version.regional_plan_version_id);
    assert(nextPeriod.status === "active", "Period 2 status is active");
    assert(nextPeriod.execution_status === "open", "Period 2 execution_status is open");
    assert(nextPeriod.is_locked === false, "Period 2 is_locked is false");

    // -------------------------------------------------------------
    // Test 6: Period Reopening Holding Previous Data
    // -------------------------------------------------------------
    console.log("\n--- Test 6: Period Reopening Holding Previous Data ---");
    const reopenedPeriod = await regionalPlanService.reopenRegionalExecutionPeriod(
      period1Version.regional_plan_version_id,
      testRegion.region_id,
      testUser
    );
    assert(reopenedPeriod.status === "active", "Reopened Period 1 status is active");
    assert(reopenedPeriod.execution_status === "open", "Reopened Period 1 execution_status is open");
    assert(reopenedPeriod.is_locked === false, "Reopened Period 1 is_locked is false");

    // CRITICAL: Check that previous data is COMPLETELY INTACT
    const checkKpi1 = await RegionalPlanNode.findByPk(kpi1Node.regional_plan_node_id);
    const checkKpi2 = await RegionalPlanNode.findByPk(kpi2Node.regional_plan_node_id);
    assert(Number(checkKpi1.period_actual) === 90, `KPI 1 held its previous actual: 90 (got ${checkKpi1.period_actual})`);
    assert(checkKpi1.period_actual_status === "validated", `KPI 1 held its status: validated`);
    assert(Number(checkKpi2.period_actual) === 50, `KPI 2 held its previous actual: 50 (got ${checkKpi2.period_actual})`);
    assert(checkKpi2.period_actual_status === "validated", `KPI 2 held its status: validated`);

    // -------------------------------------------------------------
    // Test 7: Updating / Resubmitting Performance on Reopened Period
    // -------------------------------------------------------------
    console.log("\n--- Test 7: Updating / Resubmitting Performance on Reopened Period ---");
    // Update KPI 1 actual value while period is reopened
    const updatedNode = await regionalPlanService.updateRegionalPeriodActual(
      kpi1Node.regional_plan_node_id,
      testRegion.region_id,
      { period_actual: 98, narration: "Updated actual performance after audit" },
      testUser
    );
    assert(Number(updatedNode.period_actual) === 98, `KPI 1 actual updated to 98 (got ${updatedNode.period_actual})`);
    assert(updatedNode.narration === "Updated actual performance after audit", "Narration recorded correctly");
    assert(updatedNode.period_actual_status === "draft", "Status transitioned to draft for fresh review");

    // Re-verify that period cannot complete while KPI 1 is in draft
    const r7 = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(r7.ready === false, "Readiness is false again because updated node is in draft");
    assert(r7.missing_count === 1, "Missing count is 1 (draft counts as pending entry)");

    // Re-submit updated performance
    const resubmitted = await regionalPlanService.submitRegionalAchievement(
      kpi1Node.regional_plan_node_id,
      testRegion.region_id,
      { period_actual: 98, narration: "Resubmitted with audit signoff" },
      testUser
    );
    assert(resubmitted.period_actual_status === "submitted" || resubmitted.period_actual_status === "approved" || resubmitted.period_actual_status === "validated", `Resubmitted successfully into workflow (status: ${resubmitted.period_actual_status})`);

    // Approve & Validate
    await RegionalPlanNode.update(
      { period_actual_status: "validated" },
      { where: { regional_plan_node_id: kpi1Node.regional_plan_node_id } }
    );
    const rFinal = await regionalPlanService.getRegionalExecutionPeriodCompletionReadiness(
      period1Version.regional_plan_version_id,
      testRegion.region_id
    );
    assert(rFinal.ready === true, "Readiness is true after re-validation");

    // Re-complete
    const reCompleted = await regionalPlanService.completeRegionalExecutionPeriod(
      period1Version.regional_plan_version_id,
      testRegion.region_id,
      testUser.user_id
    );
    assert(reCompleted.execution_status === "completed", "Re-completed successfully");

    console.log("\n===============================================================================");
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("===============================================================================\n");

  } catch (err) {
    console.error("Test execution error:", err);
    failedCount++;
  } finally {
    console.log("Cleaning up test fixtures...");
    try {
      if (period1Version) {
        await RegionalPlanNodeActionLog.destroy({ where: {} });
        await RegionalPlanNode.destroy({ where: { regional_plan_version_id: [period1Version.regional_plan_version_id, period2Version.regional_plan_version_id] } });
      }
      if (testRegion) {
        await RegionalPlanVersion.destroy({ where: { region_id: testRegion.region_id } });
        if (testRule) {
          await RegionalPlanRuleStep.destroy({ where: { regional_plan_rule_id: testRule.regional_plan_rule_id } });
          await RegionalPlanRule.destroy({ where: { regional_plan_rule_id: testRule.regional_plan_rule_id } });
        }
        if (testUser) {
          await UserRoles.destroy({ where: { user_id: testUser.user_id } });
          await User.destroy({ where: { user_id: testUser.user_id } });
        }
        if (officerRole) {
          await RolePermission.destroy({ where: { role_id: officerRole.role_id } });
          await Role.destroy({ where: { role_id: officerRole.role_id } });
        }
        await Region.destroy({ where: { region_id: testRegion.region_id } });
      }
    } catch (cleanupErr) {
      console.warn("Cleanup error:", cleanupErr.message);
    }
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

runTests();
