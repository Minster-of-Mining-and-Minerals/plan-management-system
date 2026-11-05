"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const {
  sequelize,
  Region,
  RegionalStructure,
  RegionalPlanningConfiguration,
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalInternalAssignment,
  Notification,
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
  rejectValidationRegionalAchievementWorkflow,
  resolveRegionalAchievementWorkflowScope,
} = require("../services/regionalPlanAchievementWorkflowService");

async function runE2ETests() {
  console.log("===============================================================================");
  console.log("   REGIONAL ACHIEVEMENT REPORTING E2E VERIFICATION SUITE");
  console.log("   Exact Federal Private Workflow Parity: Draft -> Annual -> Period ->");
  console.log("   Review Notifications -> Start Process -> Reporting -> Approval -> Validation");
  console.log("===============================================================================\n");

  const testId = uuidv4().slice(0, 8);
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  let testRegion, miningDept, geologyDept;
  let officerUser, supervisorUser, validatorUser, adminUser;
  let officerRole, supervisorRole, validatorRole, adminRole;
  let testRule, masterVersion, annualVersion, q1Version;
  let goalNode, kpiNode, taskNode;

  try {
    console.log("1. Setting up Test Environment...");

    // Create Region
    testRegion = await Region.create({
      region_id: uuidv4(),
      name: `Reporting Test Region ${testId}`,
      code: `RTR_${testId}`,
      is_active: true,
    });

    await RegionalPlanningConfiguration.create({
      regional_planning_config_id: uuidv4(),
      region_id: testRegion.region_id,
      breakdown_mode: "quarterly",
      target_units: [{ name: "Tonnes", symbol: "T" }],
    });

    // Create Regional Structures
    miningDept = await RegionalStructure.create({
      regional_structure_id: uuidv4(),
      region_id: testRegion.region_id,
      name: `Mining Operations ${testId}`,
      level: 1,
      order: 1,
      is_active: true,
    });

    geologyDept = await RegionalStructure.create({
      regional_structure_id: uuidv4(),
      region_id: testRegion.region_id,
      name: `Geological Survey ${testId}`,
      level: 1,
      order: 2,
      is_active: true,
    });

    // Ensure Permissions exist
    const permsToEnsure = [
      { resource: "REGIONAL_PLANS", action: "READ" },
      { resource: "REGIONAL_PLANS", action: "UPDATE" },
      { resource: "REGIONAL_PLANS", action: "FINALIZE" },
      { resource: "REGIONAL_PLANS", action: "START_PROCESS" },
      { resource: "REGIONAL_PLANS", action: "PUBLISH_REVIEW" },
      { resource: "REGIONAL_PLANS", action: "COMPLETE_REVIEW" },
      { resource: "REGIONAL_PLANS", action: "EXECUTE_ACHIEVEMENT" },
      { resource: "REGIONAL_PLANS", action: "APPROVE_ACHIEVEMENT" },
      { resource: "REGIONAL_PLANS", action: "VALIDATE_ACHIEVEMENT" },
      { resource: "REGIONAL_PLANS", action: "MANAGE" },
      { resource: "REGIONS", action: "MANAGE" },
    ];

    const permMap = {};
    for (const p of permsToEnsure) {
      let perm = await Permission.findOne({
        where: {
          [Op.and]: [
            sequelize.where(sequelize.fn("lower", sequelize.col("resource")), p.resource.toLowerCase()),
            sequelize.where(sequelize.fn("lower", sequelize.col("action")), p.action.toLowerCase()),
          ],
        },
      });
      if (!perm) {
        perm = await Permission.create({
          permission_id: uuidv4(),
          resource: p.resource,
          action: p.action,
          name: `${p.resource} ${p.action}`,
        });
      }
      permMap[`${p.resource}:${p.action}`] = perm;
    }

    // Helper to create role with permissions
    async function createRoleWithPerms(name, permKeys) {
      const role = await Role.create({
        role_id: uuidv4(),
        name: `${name}_${testId}`,
        description: `Test role ${name}`,
        is_active: true,
      });
      for (const key of permKeys) {
        if (permMap[key]) {
          await RolePermission.create({
            role_id: role.role_id,
            permission_id: permMap[key].permission_id,
          });
        }
      }
      return role;
    }

    // Roles
    officerRole = await createRoleWithPerms("ReporterOfficer", [
      "REGIONAL_PLANS:READ",
      "REGIONAL_PLANS:EXECUTE_ACHIEVEMENT",
    ]);

    supervisorRole = await createRoleWithPerms("DeptSupervisor", [
      "REGIONAL_PLANS:READ",
      "REGIONAL_PLANS:APPROVE_ACHIEVEMENT",
    ]);

    validatorRole = await createRoleWithPerms("IndependentValidator", [
      "REGIONAL_PLANS:READ",
      "REGIONAL_PLANS:VALIDATE_ACHIEVEMENT",
    ]);

    adminRole = await createRoleWithPerms("RegionalAdmin", [
      "REGIONAL_PLANS:READ",
      "REGIONAL_PLANS:UPDATE",
      "REGIONAL_PLANS:FINALIZE",
      "REGIONAL_PLANS:START_PROCESS",
      "REGIONAL_PLANS:PUBLISH_REVIEW",
      "REGIONAL_PLANS:COMPLETE_REVIEW",
      "REGIONAL_PLANS:EXECUTE_ACHIEVEMENT",
      "REGIONAL_PLANS:APPROVE_ACHIEVEMENT",
      "REGIONAL_PLANS:VALIDATE_ACHIEVEMENT",
      "REGIONAL_PLANS:MANAGE",
      "REGIONS:MANAGE",
    ]);

    // Users
    async function createUser(email, name, role, deptId) {
      const user = await User.create({
        user_id: uuidv4(),
        email: `${email}_${testId}@example.com`,
        full_name: `${name} Tester`,
        password: "dummy_hashed_password",
        is_active: true,
        region_id: testRegion.region_id,
        regional_structure_id: deptId,
      });
      await UserRoles.create({ user_id: user.user_id, role_id: role.role_id });
      return user;
    }

    officerUser = await createUser("officer", "Operational Officer", officerRole, miningDept.regional_structure_id);
    supervisorUser = await createUser("supervisor", "Mining Supervisor", supervisorRole, miningDept.regional_structure_id);
    validatorUser = await createUser("validator", "Planning Validator", validatorRole, geologyDept.regional_structure_id);
    adminUser = await createUser("admin", "Regional Admin", adminRole, null);

    console.log("  [PASS] Test environment and users created successfully");

    // 2. Create Plan Rule & Master 3-Year Plan
    console.log("\n2. Creating Plan Rule and Master Plan Draft...");
    testRule = await RegionalPlanRule.create({
      regional_plan_rule_id: uuidv4(),
      region_id: testRegion.region_id,
      name: `Reporting Test Rule ${testId}`,
      max_levels: 3,
      performance_scoring_policy: "CAP_AT_100",
      is_active: true,
    });

    await RegionalPlanRuleStep.bulkCreate([
      { regional_plan_rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 1, name: "Goal", is_weight_mandatory: false },
      { regional_plan_rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 2, name: "KPI", is_weight_mandatory: true },
      { regional_plan_rule_step_id: uuidv4(), regional_plan_rule_id: testRule.regional_plan_rule_id, level: 3, name: "Task", is_weight_mandatory: true },
    ]);

    masterVersion = await RegionalPlanVersion.create({
      regional_plan_version_id: uuidv4(),
      region_id: testRegion.region_id,
      draft_name: `Strategic Plan 2027-2029 ${testId}`,
      version_kind: "master",
      version_number: 1,
      planning_duration_years: 3,
      start_year: 2027,
      end_year: 2029,
      status: "draft",
      regional_plan_rule_id: testRule.regional_plan_rule_id,
      is_active: true,
    });

    // Create 3-level hierarchy
    goalNode = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: masterVersion.regional_plan_version_id,
      level: 1,
      title: "Goal 1: Mineral Expansion",
      weight: 100,
      order: 1,
      is_active: true,
    });

    kpiNode = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: masterVersion.regional_plan_version_id,
      parent_id: goalNode.regional_plan_node_id,
      level: 2,
      title: "KPI 1.1: Gold Output Tonnes",
      weight: 100,
      target_unit: "Tonnes",
      order: 1,
      is_active: true,
    });

    taskNode = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: masterVersion.regional_plan_version_id,
      parent_id: kpiNode.regional_plan_node_id,
      level: 3,
      title: "Task 1.1.1: Artisanal Mining Site Processing",
      weight: 300, // 3-year target: 300 tonnes
      target_unit: "Tonnes",
      order: 1,
      is_active: true,
      regional_structure_id: miningDept.regional_structure_id,
      assigned_user_id: officerUser.user_id,
      is_validation_required: true,
    });

    // Assign officer to taskNode
    await RegionalInternalAssignment.create({
      regional_internal_assignment_id: uuidv4(),
      regional_plan_node_id: taskNode.regional_plan_node_id,
      regional_structure_id: miningDept.regional_structure_id,
      assigned_user_id: officerUser.user_id,
      is_lead: true,
      is_active: true,
    });

    console.log("  [PASS] Plan hierarchy created: Goal -> KPI -> Task (300 Tonnes, assigned to officerUser)");

    // 3. Draft Finalization
    console.log("\n3. Finalizing Master Plan Draft...");
    await regionalPlanService.finalizeRegionalPlanDraft(masterVersion.regional_plan_version_id, testRegion.region_id);
    const finalizedMaster = await RegionalPlanVersion.findByPk(masterVersion.regional_plan_version_id);
    assert(finalizedMaster.status === "finalized", "Master plan draft is finalized");

    // 4. Annual Execution & Target Allocation
    console.log("\n4. Distributing & Finalizing Annual Execution...");
    await regionalPlanService.distributeRegionalAnnualTargetsEqually(masterVersion.regional_plan_version_id, testRegion.region_id);
    await regionalPlanService.finalizeRegionalAnnualExecution(masterVersion.regional_plan_version_id, testRegion.region_id);
    const annualExecutionMaster = await RegionalPlanVersion.findByPk(masterVersion.regional_plan_version_id);
    assert(Boolean(annualExecutionMaster.annual_targets_finalized_at), "Annual targets finalized timestamp set");

    // Get Year 1 annual plan
    const annualVersions = await regionalPlanService.listRegionalAnnualVersions(masterVersion.regional_plan_version_id, testRegion.region_id);
    assert(annualVersions.length === 3, "Created exactly 3 annual plans for 3-year duration");
    annualVersion = annualVersions[0];
    assert(annualVersion.planning_year === 2027, "Year 1 is 2027");

    // 5. Initialize Execution Periods (Quarterly)
    console.log("\n5. Initializing Execution Periods (Quarterly)...");
    await regionalPlanService.initializeRegionalExecutionPeriods(
      annualVersion.regional_plan_version_id,
      testRegion.region_id,
      { mode: "quarterly" }
    );
    await regionalPlanService.distributeRegionalPeriodTargetsEqually(
      annualVersion.regional_plan_version_id,
      testRegion.region_id
    );
    await regionalPlanService.finalizeRegionalPeriodTargets(
      annualVersion.regional_plan_version_id,
      testRegion.region_id
    );

    const periods = await regionalPlanService.listRegionalExecutionPeriods(
      annualVersion.regional_plan_version_id,
      testRegion.region_id
    );
    assert(periods.length === 4, "Created exactly 4 quarterly execution periods");
    q1Version = periods[0];
    assert(Boolean(annualVersion.period_targets_finalized_at), "Period targets finalized for Year 1");

    // Find the task node in Q1
    const q1Nodes = await RegionalPlanNode.findAll({
      where: { regional_plan_version_id: q1Version.regional_plan_version_id, is_active: true },
    });
    const q1TaskNode = q1Nodes.find((n) => n.title.includes("Task 1.1.1"));
    const q1KpiNode = q1Nodes.find((n) => n.title.includes("KPI 1.1"));
    assert(Boolean(q1TaskNode), "Q1 task node cloned and present");
    assert(Number(q1TaskNode.period_target) === 25, `Q1 period target is 25 Tonnes (got ${q1TaskNode.period_target})`);

    // Assign officer to cloned Q1 task node
    await RegionalInternalAssignment.create({
      regional_internal_assignment_id: uuidv4(),
      regional_plan_node_id: q1TaskNode.regional_plan_node_id,
      regional_structure_id: miningDept.regional_structure_id,
      assigned_user_id: officerUser.user_id,
      is_lead: true,
      is_active: true,
    });

    // 6. Publish for Review & Verify System Notifications
    console.log("\n6. Publishing Master Plan for Review & Verifying Notifications...");
    await regionalPlanService.publishRegionalPlanForReview(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      adminUser.user_id
    );

    const reviewNotifications = await Notification.findAll({
      where: {
        notification_type: "regional_plan_published_for_review",
        recipient_id: officerUser.user_id,
      },
    });
    assert(reviewNotifications.length > 0, "Notification emitted to assigned officer upon review publication");

    // Complete review
    await regionalPlanService.completeRegionalPlanReview(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      adminUser.user_id
    );
    const reviewedMaster = await RegionalPlanVersion.findByPk(masterVersion.regional_plan_version_id);
    assert(reviewedMaster.review_status === "review_completed", "Master plan review completed");

    // 7. Start Process -> Activates Q1
    console.log("\n7. Starting Process & Activating Q1 Execution...");
    await regionalPlanService.startRegionalPlanProcess(
      masterVersion.regional_plan_version_id,
      testRegion.region_id,
      adminUser.user_id
    );

    const activeQ1 = await RegionalPlanVersion.findByPk(q1Version.regional_plan_version_id);
    assert(activeQ1.execution_status === "open", "Q1 execution_status is 'open'");
    assert(activeQ1.status === "active", "Q1 status is 'active'");

    // 8. Test Scope Resolution
    console.log("\n8. Testing Achievement Workflow Scope Resolution...");
    const officerScope = await resolveRegionalAchievementWorkflowScope(
      q1Version.regional_plan_version_id,
      testRegion.region_id,
      officerUser
    );
    assert(officerScope.success, "Officer scope resolved successfully");
    assert(
      officerScope.data.executor_node_ids.includes(q1TaskNode.regional_plan_node_id),
      "Officer can execute achievement on assigned Q1 task node"
    );
    assert(
      !officerScope.data.approver_node_ids.includes(q1TaskNode.regional_plan_node_id),
      "Officer cannot approve their own achievement"
    );

    const supervisorScope = await resolveRegionalAchievementWorkflowScope(
      q1Version.regional_plan_version_id,
      testRegion.region_id,
      supervisorUser
    );
    assert(
      supervisorScope.data.approver_node_ids.includes(q1TaskNode.regional_plan_node_id),
      "Mining supervisor can approve achievement on Q1 task node"
    );

    const validatorScope = await resolveRegionalAchievementWorkflowScope(
      q1Version.regional_plan_version_id,
      testRegion.region_id,
      validatorUser
    );
    assert(
      validatorScope.data.validator_node_ids.includes(q1TaskNode.regional_plan_node_id),
      "Cross-branch validator can validate achievement on Q1 task node"
    );

    // 9. Achievement Submission (Officer)
    console.log("\n9. Submitting Achievement by Assigned Officer...");
    const submitResult = await submitRegionalAchievementWorkflow(
      q1TaskNode.regional_plan_node_id,
      testRegion.region_id,
      { period_actual: 28, narration: "Exceeded target by 3 tonnes due to efficient ore sorting" },
      officerUser
    );

    assert(submitResult.period_actual_status === "submitted", "Task status transitioned to 'submitted'");
    assert(Number(submitResult.period_actual) === 28, "Actual recorded as 28");

    // Check submission notification to supervisor
    const submitNotifs = await Notification.findAll({
      where: {
        notification_type: "regional_achievement_submitted",
        recipient_id: supervisorUser.user_id,
      },
    });
    assert(submitNotifs.length > 0, "Notification emitted to supervisor on achievement submission");

    // 10. Achievement Approval (Supervisor)
    console.log("\n10. Approving Achievement by Department Supervisor...");
    const approveResult = await approveRegionalAchievementWorkflow(
      q1TaskNode.regional_plan_node_id,
      testRegion.region_id,
      { comment: "Verified with weighing receipts" },
      supervisorUser
    );

    assert(approveResult.period_actual_status === "approved", "Task status transitioned to 'approved'");

    // Check pending validation notification to validator
    const validationNotifs = await Notification.findAll({
      where: {
        notification_type: "regional_achievement_pending_validation",
        recipient_id: validatorUser.user_id,
      },
    });
    assert(validationNotifs.length > 0, "Notification emitted to validator on achievement approval");

    // 11. Achievement Validation (Independent Validator)
    console.log("\n11. Validating Achievement by Independent Validator...");
    const validateResult = await validateRegionalAchievementWorkflow(
      q1TaskNode.regional_plan_node_id,
      testRegion.region_id,
      { comment: "Cross-checked and audited" },
      validatorUser
    );

    assert(validateResult.period_actual_status === "validated", "Task status transitioned to 'validated'");
    assert(validateResult.is_locked === true, "Task node is permanently locked");

    // Check validated notification back to executor
    const validatedNotifs = await Notification.findAll({
      where: {
        notification_type: "regional_achievement_validated",
        recipient_id: officerUser.user_id,
      },
    });
    assert(validatedNotifs.length > 0, "Notification emitted to executor upon validation completion");

    // 12. Test Rejection & Resubmission Lifecycle
    console.log("\n12. Testing Rejection & Resubmission Flow...");
    // Create a second task node in Q1
    const taskNode2 = await RegionalPlanNode.create({
      regional_plan_node_id: uuidv4(),
      regional_plan_version_id: q1Version.regional_plan_version_id,
      parent_id: q1KpiNode.regional_plan_node_id,
      level: 3,
      title: "Task 1.1.2: Secondary Extraction Unit",
      weight: 100,
      period_target: 10,
      target_unit: "Tonnes",
      order: 2,
      is_active: true,
      regional_structure_id: miningDept.regional_structure_id,
      assigned_user_id: officerUser.user_id,
      is_validation_required: true,
    });
    await RegionalInternalAssignment.create({
      regional_internal_assignment_id: uuidv4(),
      regional_plan_node_id: taskNode2.regional_plan_node_id,
      regional_structure_id: miningDept.regional_structure_id,
      assigned_user_id: officerUser.user_id,
      is_lead: true,
      is_active: true,
    });

    // Officer submits
    await submitRegionalAchievementWorkflow(
      taskNode2.regional_plan_node_id,
      testRegion.region_id,
      { period_actual: 5, narration: "Initial extraction run" },
      officerUser
    );

    // Supervisor rejects
    const rejectResult = await rejectRegionalAchievementWorkflow(
      taskNode2.regional_plan_node_id,
      testRegion.region_id,
      "Log sheet missing page 2",
      supervisorUser
    );
    assert(rejectResult.period_actual_status === "rejected", "Status transitioned to 'rejected'");
    assert(rejectResult.period_actual_rejection_comment === "Log sheet missing page 2", "Rejection comment recorded");

    // Officer resubmits
    const resubmitResult = await submitRegionalAchievementWorkflow(
      taskNode2.regional_plan_node_id,
      testRegion.region_id,
      { period_actual: 7, narration: "Updated with complete logs" },
      officerUser
    );
    assert(resubmitResult.period_actual_status === "submitted", "Status transitioned back to 'submitted'");
    assert(Number(resubmitResult.period_actual) === 7, "Updated actual is 7");

    // Supervisor approves
    await approveRegionalAchievementWorkflow(
      taskNode2.regional_plan_node_id,
      testRegion.region_id,
      {},
      supervisorUser
    );

    // Validator validates
    await validateRegionalAchievementWorkflow(
      taskNode2.regional_plan_node_id,
      testRegion.region_id,
      {},
      validatorUser
    );

    // 13. Rollup Verification
    console.log("\n13. Verifying Hierarchical Rollup Progress...");
    const refreshedKpi = await RegionalPlanNode.findByPk(q1KpiNode.regional_plan_node_id);
    console.log(`  KPI rolled-up progress: ${refreshedKpi.execution_progress_percent}%`);
    assert(refreshedKpi.execution_progress_percent != null, "KPI rolled up progress is computed and present");

    console.log("\n===============================================================================");
    console.log(`   ALL ${passedCount} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log("===============================================================================\n");
  } catch (err) {
    console.error("\n❌ VERIFICATION TEST FAILED:", err);
    process.exit(1);
  } finally {
    // Cleanup
    console.log("Cleaning up test records...");
    try {
      if (testRegion) {
        await Notification.destroy({ where: { recipient_id: [officerUser?.user_id, supervisorUser?.user_id, validatorUser?.user_id, adminUser?.user_id].filter(Boolean) } });
        await RegionalInternalAssignment.destroy({ where: {} });
        await RegionalPlanNode.destroy({ where: {} });
        await RegionalPlanVersion.destroy({ where: { region_id: testRegion.region_id } });
        await RegionalPlanRuleStep.destroy({ where: {} });
        await RegionalPlanRule.destroy({ where: { region_id: testRegion.region_id } });
        await UserRoles.destroy({ where: { user_id: [officerUser?.user_id, supervisorUser?.user_id, validatorUser?.user_id, adminUser?.user_id].filter(Boolean) } });
        await User.destroy({ where: { region_id: testRegion.region_id } });
        await RolePermission.destroy({ where: { role_id: [officerRole?.role_id, supervisorRole?.role_id, validatorRole?.role_id, adminRole?.role_id].filter(Boolean) } });
        await Role.destroy({ where: { role_id: [officerRole?.role_id, supervisorRole?.role_id, validatorRole?.role_id, adminRole?.role_id].filter(Boolean) } });
        await RegionalStructure.destroy({ where: { region_id: testRegion.region_id } });
        await Region.destroy({ where: { region_id: testRegion.region_id } });
      }
      console.log("Cleanup complete.");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }
}

runE2ETests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });

