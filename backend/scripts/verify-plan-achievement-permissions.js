"use strict";

const assert = require("assert");
const {
  EXECUTE_ACHIEVEMENT_KEY,
  APPROVE_ACHIEVEMENT_KEY,
  userCanExecuteAchievement,
  userCanApproveAchievement,
} = require("../utils/planAchievementPermissionUtils");
const {
  resolveExecutorLeafMasterNodeIds,
  resolveApproverScopeMasterNodeIds,
  userCanExecuteOnMasterNode,
  userCanApproveLeafMasterNode,
  isMasterPlanLeaf,
  buildChildrenByParent,
} = require("../services/planAchievementScopeUtils");
const {
  userQualifiesForAchievementAssignmentBypass,
} = require("../utils/planAchievementBypassUtils");
const { shouldAllowAchievementAssignmentBypass } = require("../services/systemSettingsService");

const masterNodes = [
  { plan_node_id: "sf", parent_id: null, is_active: true },
  { plan_node_id: "goal", parent_id: "sf", is_active: true },
  { plan_node_id: "kpi-a", parent_id: "goal", is_active: true },
  { plan_node_id: "kpi-b", parent_id: "goal", is_active: true },
];

const externalAssignments = [
  {
    external_assignment_id: "ext-1",
    plan_node_id: "sf",
    government_structure_id: "sector-a",
    is_active: true,
  },
];

const internalAssignments = [
  {
    internal_assignment_id: "int-exec",
    plan_node_id: "kpi-a",
    internal_structure_id: "dept-ops",
    user_id: null,
    branch_external_assignment_id: null,
    branch_internal_assignment_id: null,
    is_active: true,
  },
  {
    internal_assignment_id: "int-approver",
    plan_node_id: "goal",
    internal_structure_id: null,
    user_id: "approver-1",
    branch_external_assignment_id: null,
    branch_internal_assignment_id: null,
    is_active: true,
  },
];

function buildUser(overrides = {}) {
  return {
    user_id: "user-1",
    government_structure_id: "sector-a",
    internal_structure_id: "dept-ops",
    permissions: [],
    ...overrides,
  };
}

function buildScopeInput(user) {
  return {
    user,
    masterNodes,
    internalAssignments,
    externalAssignments,
  };
}

function runPermissionTests() {
  const executor = buildUser({
    permissions: [EXECUTE_ACHIEVEMENT_KEY],
  });
  const approver = buildUser({
    user_id: "approver-1",
    internal_structure_id: null,
    permissions: [APPROVE_ACHIEVEMENT_KEY],
  });

  assert.strictEqual(userCanExecuteAchievement(executor), true);
  assert.strictEqual(userCanApproveAchievement(executor), false);
  assert.strictEqual(userCanApproveAchievement(approver), true);
  assert.strictEqual(userCanExecuteAchievement(approver), false);
}

function runScopeTests() {
  const childrenByParent = buildChildrenByParent(masterNodes);
  const kpiA = masterNodes.find((node) => node.plan_node_id === "kpi-a");
  const goal = masterNodes.find((node) => node.plan_node_id === "goal");

  assert.strictEqual(isMasterPlanLeaf(kpiA, childrenByParent), true);
  assert.strictEqual(isMasterPlanLeaf(goal, childrenByParent), false);

  const executor = buildUser({
    permissions: [EXECUTE_ACHIEVEMENT_KEY],
  });
  const approver = buildUser({
    user_id: "approver-1",
    internal_structure_id: null,
    permissions: [APPROVE_ACHIEVEMENT_KEY],
  });

  const scopeInput = buildScopeInput(executor);
  const executorLeaves = resolveExecutorLeafMasterNodeIds(scopeInput);

  assert.ok(executorLeaves.has("kpi-a"));
  assert.ok(!executorLeaves.has("goal"));
  assert.ok(!executorLeaves.has("kpi-b"));
  assert.strictEqual(userCanExecuteOnMasterNode(scopeInput, "kpi-a"), true);
  assert.strictEqual(userCanExecuteOnMasterNode(scopeInput, "kpi-b"), false);

  const approverScope = resolveApproverScopeMasterNodeIds(buildScopeInput(approver));
  assert.ok(approverScope.has("goal"));
  assert.ok(approverScope.has("kpi-a"));
  assert.ok(approverScope.has("kpi-b"));
  assert.strictEqual(
    userCanApproveLeafMasterNode(buildScopeInput(approver), "kpi-a"),
    true
  );
  assert.strictEqual(
    userCanApproveLeafMasterNode(buildScopeInput(approver), "kpi-b"),
    true
  );

  const wrongSector = buildUser({
    government_structure_id: "sector-b",
    permissions: [EXECUTE_ACHIEVEMENT_KEY],
  });
  const wrongSectorLeaves = resolveExecutorLeafMasterNodeIds(
    buildScopeInput(wrongSector)
  );
  assert.strictEqual(wrongSectorLeaves.size, 0);
}

function runBypassTests() {
  const original = shouldAllowAchievementAssignmentBypass();
  const { applyCache } = require("../services/systemSettingsService");
  applyCache({
    system_setting_id: "test",
    expose_required_permissions: false,
    allow_achievement_assignment_bypass: true,
  });

  const executor = buildUser({
    roles: ["Super Admin"],
    permissions: [EXECUTE_ACHIEVEMENT_KEY],
  });

  assert.strictEqual(userQualifiesForAchievementAssignmentBypass(executor), true);

  const qaTester = buildUser({
    permissions: [
      EXECUTE_ACHIEVEMENT_KEY,
      "plan:bypass_achievement_assignment",
    ],
  });
  assert.strictEqual(userQualifiesForAchievementAssignmentBypass(qaTester), true);

  const regular = buildUser({
    permissions: [EXECUTE_ACHIEVEMENT_KEY],
  });
  assert.strictEqual(userQualifiesForAchievementAssignmentBypass(regular), false);

  const { collectAllMasterLeafIds } = require("../services/planAchievementScopeUtils");
  const allLeaves = collectAllMasterLeafIds(masterNodes);
  assert.ok(allLeaves.has("kpi-a"));
  assert.ok(allLeaves.has("kpi-b"));

  applyCache({
    system_setting_id: "test",
    expose_required_permissions: false,
    allow_achievement_assignment_bypass: original,
  });
}

function run() {
  runPermissionTests();
  runScopeTests();
  runBypassTests();
  console.log("Plan achievement Step 1 checks passed.");
}

run();
