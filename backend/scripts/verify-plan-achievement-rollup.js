"use strict";

const assert = require("assert");
const {
  masterNodeRequiresApproval,
  nodeContributesToRollup,
  isAchievementReadyForPeriodCompletion,
} = require("../utils/planAchievementRollupUtils");
const { computeRollupMap } = require("../services/planExecutionRollupService");
const { ACHIEVEMENT_STATUS } = require("../utils/planAchievementWorkflowUtils");

function metrics(map, id) {
  return map.get(id);
}

function buildGateContext(nodeGateFlags) {
  const masterNodeIdByPeriodNodeId = new Map();
  const requiresApprovalByMasterNodeId = new Map();

  for (const [nodeId, requiresApproval] of Object.entries(nodeGateFlags)) {
    masterNodeIdByPeriodNodeId.set(nodeId, nodeId);
    requiresApprovalByMasterNodeId.set(nodeId, requiresApproval);
  }

  return { masterNodeIdByPeriodNodeId, requiresApprovalByMasterNodeId };
}

function runGateUtilsTests() {
  const masterNodes = [
    { plan_node_id: "goal", parent_id: null, is_active: true },
    { plan_node_id: "kpi-a", parent_id: "goal", is_active: true },
    { plan_node_id: "kpi-b", parent_id: "goal", is_active: true },
  ];
  const gateNodeIds = new Set(["goal"]);

  assert.strictEqual(
    masterNodeRequiresApproval("kpi-a", masterNodes, gateNodeIds),
    true
  );
  assert.strictEqual(
    masterNodeRequiresApproval("kpi-b", masterNodes, gateNodeIds),
    true
  );
  assert.strictEqual(
    masterNodeRequiresApproval("kpi-a", masterNodes, new Set()),
    false
  );

  const gatedContext = buildGateContext({ "kpi-a": true });
  const openContext = buildGateContext({ "kpi-a": false });

  const submittedLeaf = {
    plan_node_id: "kpi-a",
    period_target: 100,
    period_actual: 80,
    period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
  };
  const approvedLeaf = {
    ...submittedLeaf,
    period_actual_status: ACHIEVEMENT_STATUS.APPROVED,
  };

  assert.strictEqual(nodeContributesToRollup(submittedLeaf, gatedContext), false);
  assert.strictEqual(nodeContributesToRollup(approvedLeaf, gatedContext), true);
  assert.strictEqual(nodeContributesToRollup(submittedLeaf, openContext), true);
  assert.strictEqual(isAchievementReadyForPeriodCompletion(submittedLeaf, gatedContext), false);
  assert.strictEqual(isAchievementReadyForPeriodCompletion(approvedLeaf, gatedContext), true);
}

function runRollupTests() {
  const nodes = [
    { plan_node_id: "goal", parent_id: null, level: 2, order: 0, is_active: true },
    {
      plan_node_id: "kpi-a",
      parent_id: "goal",
      level: 3,
      order: 0,
      period_target: 100,
      period_actual: 100,
      period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
      is_active: true,
    },
    {
      plan_node_id: "kpi-b",
      parent_id: "goal",
      level: 3,
      order: 1,
      period_target: 100,
      period_actual: 50,
      period_actual_status: ACHIEVEMENT_STATUS.APPROVED,
      is_active: true,
    },
  ];

  const gatedContext = buildGateContext({ "kpi-a": true, "kpi-b": true });
  const gatedMap = computeRollupMap(nodes, gatedContext);
  assert.strictEqual(metrics(gatedMap, "goal").execution_progress_percent, 25);

  const approvedNodes = nodes.map((node) =>
    node.plan_node_id === "kpi-a"
      ? { ...node, period_actual_status: ACHIEVEMENT_STATUS.APPROVED }
      : node
  );
  const approvedMap = computeRollupMap(approvedNodes, gatedContext);
  assert.strictEqual(metrics(approvedMap, "goal").execution_progress_percent, 75);

  const openNodes = [
    nodes[0],
    { ...nodes[1], period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED },
    {
      plan_node_id: "kpi-b",
      parent_id: "goal",
      level: 3,
      order: 1,
      period_target: 100,
      period_actual: 50,
      period_actual_status: ACHIEVEMENT_STATUS.SUBMITTED,
      is_active: true,
    },
  ];
  const openContext = buildGateContext({ "kpi-a": false, "kpi-b": false });
  const openMap = computeRollupMap(openNodes, openContext);
  assert.strictEqual(metrics(openMap, "goal").execution_progress_percent, 75);
}

function run() {
  runGateUtilsTests();
  runRollupTests();
  console.log("Plan achievement Step 4 rollup checks passed.");
}

run();
