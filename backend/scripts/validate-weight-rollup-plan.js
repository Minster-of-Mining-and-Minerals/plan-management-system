"use strict";

const assert = require("assert");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { sequelize } = require("../models");
const {
  PLAN_RULE_ID,
  PLAN_RULE_SNAPSHOT_ID,
  PLAN_RULE_TEMPLATE_NAME,
  PLANNING_CONFIG_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  NODE_IDS,
  EXPECTED_NODE_COUNTS,
} = require("../seeders/data/weightRollupOrganogramPlan.data");
const { getAnnualExecutionReadiness } = require("../services/planVersionLifecycleService");

async function verifyAnnualTargetAllocation(masterVersionId) {
  const masterNodes = await sequelize.query(
    `SELECT plan_node_id, title, weight, type
     FROM plan_nodes
     WHERE plan_version_id = :masterId AND weight > 0`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const annualVersions = await sequelize.query(
    `SELECT plan_version_id, planning_year
     FROM plan_versions
     WHERE parent_plan_version_id = :masterId AND version_kind = 'annual'
     ORDER BY sequence_index ASC`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  for (const masterNode of masterNodes) {
    let allocatedSum = 0;

    for (const annual of annualVersions) {
      const annualRows = await sequelize.query(
        `SELECT annual_target
         FROM plan_nodes
         WHERE plan_version_id = :annualId AND source_plan_node_id = :sourceId
         LIMIT 1`,
        {
          replacements: {
            annualId: annual.plan_version_id,
            sourceId: masterNode.plan_node_id,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      assert.ok(annualRows.length > 0, `Missing annual node for "${masterNode.title}"`);
      allocatedSum += Number(annualRows[0].annual_target) || 0;
    }

    const draftWeight = Number(masterNode.weight);
    assert.ok(
      Math.abs(allocatedSum - draftWeight) <= 0.001,
      `"${masterNode.title}" annual sum ${allocatedSum} != draft ${draftWeight}`
    );
  }
}

async function verifyContributionWeights(masterVersionId, nodeType, expectedCount) {
  const nodes = await sequelize.query(
    `SELECT plan_node_id, parent_id, title, contribution_weight, weight
     FROM plan_nodes
     WHERE plan_version_id = :masterId AND type = :nodeType
     ORDER BY "order" ASC`,
    {
      replacements: { masterId: masterVersionId, nodeType },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  assert.strictEqual(nodes.length, expectedCount, `Expected ${expectedCount} ${nodeType} nodes`);

  for (const node of nodes) {
    assert.ok(
      Number(node.contribution_weight) > 0,
      `${nodeType} "${node.title}" missing contribution weight`
    );
    if (nodeType === "goal") {
      assert.strictEqual(Number(node.weight) || 0, 0, `Goal "${node.title}" should have no target`);
    }
  }

  const byParent = new Map();
  for (const node of nodes) {
    if (!byParent.has(node.parent_id)) byParent.set(node.parent_id, []);
    byParent.get(node.parent_id).push(node);
  }

  for (const [parentId, siblings] of byParent.entries()) {
    const sum = siblings.reduce(
      (total, child) => total + (Number(child.contribution_weight) || 0),
      0
    );
    assert.ok(
      Math.abs(sum - 100) <= 0.001,
      `${nodeType} contribution weights under parent ${parentId} sum to ${sum}, expected 100`
    );
    assert.ok(
      siblings.some((child) => Number(child.contribution_weight) !== 33 && Number(child.contribution_weight) !== 34),
      `Expected uneven ${nodeType} contribution weights under parent ${parentId}`
    );
  }
}

async function verifyKpiTargets(masterVersionId) {
  const goals = await sequelize.query(
    `SELECT plan_node_id, title FROM plan_nodes
     WHERE plan_version_id = :masterId AND type = 'goal'`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  for (const goal of goals) {
    const kpis = await sequelize.query(
      `SELECT plan_node_id, title, weight, weight_mode
       FROM plan_nodes
       WHERE plan_version_id = :masterId AND parent_id = :goalId AND type = 'kpi'
       ORDER BY "order" ASC`,
      {
        replacements: { masterId: masterVersionId, goalId: goal.plan_node_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    assert.strictEqual(kpis.length, 3, `Goal "${goal.title}" should have 3 KPIs`);

    const sum = kpis.reduce((total, kpi) => total + (Number(kpi.weight) || 0), 0);
    assert.ok(
      Math.abs(sum - 100) <= 0.001,
      `KPI targets under "${goal.title}" sum to ${sum}, expected 100`
    );

    for (const kpi of kpis) {
      assert.ok(Number(kpi.weight) > 0, `KPI "${kpi.title}" missing target`);
      assert.ok(kpi.weight_mode, `KPI "${kpi.title}" missing weight mode`);

      const tasks = await sequelize.query(
        `SELECT weight FROM plan_nodes
         WHERE plan_version_id = :masterId AND parent_id = :kpiId AND type = 'task'`,
        {
          replacements: { masterId: masterVersionId, kpiId: kpi.plan_node_id },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      assert.strictEqual(tasks.length, 0, `KPI "${kpi.title}" should be leaf node with 0 tasks`);
    }
  }
}

async function verifyWeightModes(masterVersionId) {
  const modes = await sequelize.query(
    `SELECT DISTINCT weight_mode
     FROM plan_nodes
     WHERE plan_version_id = :masterId AND weight_mode IS NOT NULL`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  const modeSet = new Set(modes.map((row) => row.weight_mode));
  assert.ok(modeSet.has("percentage"), "Expected percentage weight mode in hierarchy");
  assert.ok(modeSet.has("number"), "Expected number weight mode in hierarchy");
  assert.ok(modeSet.has("frequency"), "Expected frequency weight mode in hierarchy");
}

async function verifyPlanningConfiguration(masterVersionId) {
  const configRows = await sequelize.query(
    `SELECT planning_configuration_id, breakdown_mode, owned_by_plan_version_id
     FROM planning_configurations
     WHERE planning_configuration_id = :id`,
    {
      replacements: { id: PLANNING_CONFIG_ID },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  assert.ok(configRows.length > 0, "Draft planning configuration missing");
  assert.strictEqual(configRows[0].breakdown_mode, "quarterly");
  assert.strictEqual(configRows[0].owned_by_plan_version_id, masterVersionId);
}

async function verifyQuarterlyExecutionPeriods(annualVersionId, planningYear) {
  const periods = await sequelize.query(
    `SELECT plan_version_id, period_label
     FROM plan_versions
     WHERE parent_plan_version_id = :annualId AND version_kind = 'execution_period'
     ORDER BY sequence_index ASC`,
    {
      replacements: { annualId: annualVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  assert.strictEqual(periods.length, 4, `Expected 4 quarterly periods for ${planningYear}`);

  for (const period of periods) {
    const nodesWithTargets = await sequelize.query(
      `SELECT period_target FROM plan_nodes
       WHERE plan_version_id = :periodId AND period_target > 0`,
      {
        replacements: { periodId: period.plan_version_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(nodesWithTargets.length > 0, `Expected period targets on ${planningYear} ${period.period_label}`);
  }
}

async function main() {
  try {
    const masterRows = await sequelize.query(
      `SELECT plan_version_id, draft_name, status, plan_rule_id
       FROM plan_versions WHERE plan_version_id = :id`,
      {
        replacements: { id: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    assert.ok(masterRows.length > 0, "Weight rollup master plan not seeded");
    assert.strictEqual(masterRows[0].status, "draft");
    assert.strictEqual(masterRows[0].plan_rule_id, PLAN_RULE_SNAPSHOT_ID);

    const stepRows = await sequelize.query(
      `SELECT step_order, node_type, requires_weight, requires_contribution_weight
       FROM plan_rule_steps
       WHERE plan_rule_id = :id
       ORDER BY step_order ASC`,
      {
        replacements: { id: PLAN_RULE_SNAPSHOT_ID },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    assert.strictEqual(stepRows[0].requires_weight, false);
    assert.strictEqual(stepRows[0].requires_contribution_weight, false);
    assert.strictEqual(stepRows[1].requires_weight, false);
    assert.strictEqual(stepRows[1].requires_contribution_weight, true);
    assert.strictEqual(stepRows[2].requires_weight, true);
    assert.strictEqual(stepRows[2].requires_contribution_weight, false);
    assert.strictEqual(stepRows[3].requires_weight, false);
    assert.strictEqual(stepRows[3].requires_contribution_weight, false);

    assert.ok(NODE_IDS.STRATEGIC_1, "Primary strategic node id missing");

    for (const [type, count] of Object.entries(EXPECTED_NODE_COUNTS)) {
      const rows = await sequelize.query(
        `SELECT COUNT(*)::int AS count FROM plan_nodes
         WHERE plan_version_id = :id AND type = :type`,
        {
          replacements: { id: PLAN_IDS.MASTER, type },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      assert.strictEqual(rows[0].count, count, `Expected ${count} ${type} nodes`);
    }

    await verifyContributionWeights(PLAN_IDS.MASTER, "goal", EXPECTED_NODE_COUNTS.goal);
    await verifyKpiTargets(PLAN_IDS.MASTER);
    await verifyWeightModes(PLAN_IDS.MASTER);
    await verifyAnnualTargetAllocation(PLAN_IDS.MASTER);
    await verifyPlanningConfiguration(PLAN_IDS.MASTER);

    for (const annual of ANNUAL_VERSIONS) {
      await verifyQuarterlyExecutionPeriods(annual.plan_version_id, annual.planning_year);
    }

    const periodCount = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM plan_versions
       WHERE version_kind = 'execution_period'
         AND parent_plan_version_id IN (:annualIds)`,
      {
        replacements: { annualIds: ANNUAL_VERSIONS.map((a) => a.plan_version_id) },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(periodCount[0].count, 12);

    console.log("Weight rollup organogram plan validation passed.");
    console.log(`  Master: ${PLAN_IDS.MASTER}`);
    console.log(`  Rule snapshot: ${PLAN_RULE_SNAPSHOT_ID} (${PLAN_RULE_TEMPLATE_NAME})`);
    console.log(
      `  Hierarchy: ${EXPECTED_NODE_COUNTS.strategic} strategic, ${EXPECTED_NODE_COUNTS.goal} goals, ${EXPECTED_NODE_COUNTS.kpi} KPIs, ${EXPECTED_NODE_COUNTS.task} tasks`
    );
    console.log(`  Pattern: goal contribution only; KPI targets; task inherited targets`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Weight rollup plan validation failed:", error.message);
  process.exit(1);
});
