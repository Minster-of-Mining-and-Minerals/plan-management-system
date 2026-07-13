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
} = require("../seeders/data/weightRollupOrganogramPlan.data");
const { getAnnualExecutionReadiness } = require("../services/planVersionLifecycleService");

async function verifyAnnualTargetAllocation(masterVersionId) {
  const masterNodes = await sequelize.query(
    `SELECT plan_node_id, title, weight
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
    const yearlyValues = [];

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
      const annualTarget = Number(annualRows[0].annual_target);
      assert.ok(annualTarget > 0, `Annual target missing for "${masterNode.title}"`);
      yearlyValues.push(annualTarget);
      allocatedSum += annualTarget;
    }

    const draftWeight = Number(masterNode.weight);
    assert.ok(
      Math.abs(allocatedSum - draftWeight) <= 0.001,
      `"${masterNode.title}" annual sum ${allocatedSum} != draft ${draftWeight}`
    );

    if (draftWeight >= 10) {
      const expectedFirst = Math.round(draftWeight * ANNUAL_TARGET_YEAR_RATIOS[0] * 1000) / 1000;
      assert.ok(
        Math.abs(yearlyValues[0] - expectedFirst) <= 0.01,
        `"${masterNode.title}" year-1 target ${yearlyValues[0]} expected ~${expectedFirst} (50% skew)`
      );
    }
  }
}

async function verifyContributionWeights(masterVersionId, nodeType, expectedCount) {
  const nodes = await sequelize.query(
    `SELECT plan_node_id, parent_id, title, contribution_weight
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
      siblings.some((child) => Number(child.contribution_weight) !== 50),
      `Expected uneven ${nodeType} contribution weights under parent ${parentId}`
    );
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

  const numberUnits = await sequelize.query(
    `SELECT DISTINCT target_unit
     FROM plan_nodes
     WHERE plan_version_id = :masterId AND weight_mode = 'number'`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  const unitSet = new Set(numberUnits.map((row) => row.target_unit));
  assert.ok(unitSet.has("ton"), "Expected ton target unit");
  assert.ok(unitSet.has("birr"), "Expected birr target unit");
  assert.ok(unitSet.has("person"), "Expected person target unit");
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

  const versionRows = await sequelize.query(
    `SELECT planning_configuration_id FROM plan_versions WHERE plan_version_id = :id`,
    {
      replacements: { id: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  assert.strictEqual(versionRows[0].planning_configuration_id, PLANNING_CONFIG_ID);
}

async function verifyQuarterlyExecutionPeriods(annualVersionId, planningYear) {
  const periods = await sequelize.query(
    `SELECT plan_version_id, period_label, sequence_index
     FROM plan_versions
     WHERE parent_plan_version_id = :annualId AND version_kind = 'execution_period'
     ORDER BY sequence_index ASC`,
    {
      replacements: { annualId: annualVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  assert.strictEqual(
    periods.length,
    4,
    `Expected 4 quarterly execution periods for ${planningYear}`
  );
  assert.deepStrictEqual(
    periods.map((p) => p.period_label),
    ["Q1", "Q2", "Q3", "Q4"]
  );

  const annualNodes = await sequelize.query(
    `SELECT plan_node_id, title, annual_target
     FROM plan_nodes
     WHERE plan_version_id = :annualId AND annual_target > 0`,
    {
      replacements: { annualId: annualVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  for (const period of periods) {
    const nodesWithTargets = await sequelize.query(
      `SELECT period_target
       FROM plan_nodes
       WHERE plan_version_id = :periodId AND period_target > 0`,
      {
        replacements: { periodId: period.plan_version_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(
      nodesWithTargets.length > 0,
      `Expected period targets on ${planningYear} ${period.period_label}`
    );
  }

  for (const annualNode of annualNodes) {
    let quarterSum = 0;

    for (const period of periods) {
      const periodRows = await sequelize.query(
        `SELECT period_target
         FROM plan_nodes
         WHERE plan_version_id = :periodId AND source_plan_node_id = :annualNodeId
         LIMIT 1`,
        {
          replacements: {
            periodId: period.plan_version_id,
            annualNodeId: annualNode.plan_node_id,
          },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      assert.ok(
        periodRows.length > 0,
        `Missing ${planningYear} period node for "${annualNode.title}"`
      );
      quarterSum += Number(periodRows[0].period_target) || 0;
    }

    const annualTarget = Number(annualNode.annual_target);
    assert.ok(
      Math.abs(quarterSum - annualTarget) <= 0.01,
      `"${annualNode.title}" (${planningYear}) quarter sum ${quarterSum} != annual ${annualTarget}`
    );
  }
}

async function main() {
  try {
    const masterRows = await sequelize.query(
      `SELECT plan_version_id, draft_name, status, plan_rule_id
       FROM plan_versions
       WHERE plan_version_id = :id`,
      {
        replacements: { id: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    assert.ok(masterRows.length > 0, "Weight rollup master plan not seeded");
    assert.strictEqual(masterRows[0].status, "draft");
    assert.ok(masterRows[0].draft_name.includes("Weight Rollup"));

    const ruleRows = await sequelize.query(
      `SELECT plan_rule_id, name, owned_by_plan_version_id, source_plan_rule_id
       FROM plan_rules
       WHERE plan_rule_id = :snapshotId`,
      {
        replacements: { snapshotId: PLAN_RULE_SNAPSHOT_ID },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(ruleRows.length > 0, "Weight rollup draft plan rule snapshot not found");
    assert.strictEqual(ruleRows[0].name, PLAN_RULE_TEMPLATE_NAME);
    assert.strictEqual(ruleRows[0].owned_by_plan_version_id, PLAN_IDS.MASTER);

    const globalRuleRows = await sequelize.query(
      `SELECT plan_rule_id, name FROM plan_rules
       WHERE plan_rule_id = :id OR name = :ruleName
       ORDER BY CASE WHEN plan_rule_id = :id THEN 0 ELSE 1 END
       LIMIT 1`,
      {
        replacements: { id: PLAN_RULE_ID, ruleName: PLAN_RULE_TEMPLATE_NAME },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(globalRuleRows.length > 0, "Weight Rollup Based 4-Level Plan global template not found");
    assert.strictEqual(globalRuleRows[0].name, PLAN_RULE_TEMPLATE_NAME);
    assert.strictEqual(ruleRows[0].source_plan_rule_id, globalRuleRows[0].plan_rule_id);

    const resolvedRuleId = ruleRows[0].plan_rule_id;
    assert.strictEqual(masterRows[0].plan_rule_id, resolvedRuleId);

    const stepRows = await sequelize.query(
      `SELECT node_type, requires_contribution_weight
       FROM plan_rule_steps
       WHERE plan_rule_id = :id
       ORDER BY step_order ASC`,
      {
        replacements: { id: resolvedRuleId },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(stepRows.length, 4);
    assert.strictEqual(stepRows[1].node_type, "goal");
    assert.strictEqual(stepRows[1].requires_contribution_weight, true);
    assert.strictEqual(stepRows[3].node_type, "task");
    assert.strictEqual(stepRows[3].requires_contribution_weight, true);

    const strategic = await sequelize.query(
      `SELECT plan_node_id FROM plan_nodes
       WHERE plan_version_id = :id AND plan_node_id = :nodeId`,
      {
        replacements: { id: PLAN_IDS.MASTER, nodeId: NODE_IDS.STRATEGIC_DEV },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(strategic.length > 0, "Primary strategic node missing");

    const strategicCount = await sequelize.query(
      `SELECT COUNT(*)::int AS count FROM plan_nodes
       WHERE plan_version_id = :id AND type = 'strategic'`,
      {
        replacements: { id: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(strategicCount[0].count, 2, "Expected 2 strategic focus areas");

    await verifyContributionWeights(PLAN_IDS.MASTER, "goal", 5);
    await verifyContributionWeights(PLAN_IDS.MASTER, "task", 20);
    await verifyWeightModes(PLAN_IDS.MASTER);
    await verifyAnnualTargetAllocation(PLAN_IDS.MASTER);
    await verifyPlanningConfiguration(PLAN_IDS.MASTER);
    for (const annual of ANNUAL_VERSIONS) {
      await verifyQuarterlyExecutionPeriods(annual.plan_version_id, annual.planning_year);
    }

    const masterSubdivision = await sequelize.query(
      `SELECT period_subdivision_mode, annual_targets_finalized_at
       FROM plan_versions WHERE plan_version_id = :id`,
      {
        replacements: { id: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(masterSubdivision[0].period_subdivision_mode, "quarterly");
    assert.ok(masterSubdivision[0].annual_targets_finalized_at, "Annual targets should be finalized for demo");

    const periodCount = await sequelize.query(
      `SELECT COUNT(*)::int AS count
       FROM plan_versions
       WHERE version_kind = 'execution_period'
         AND parent_plan_version_id IN (:annualIds)`,
      {
        replacements: {
          annualIds: ANNUAL_VERSIONS.map((annual) => annual.plan_version_id),
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(periodCount[0].count, 12, "Expected 12 quarterly periods across 3 annual years");

    const readiness = await getAnnualExecutionReadiness(PLAN_IDS.MASTER);
    assert.ok(
      !readiness.ready,
      "Draft master with pre-finalized annual targets should not be ready to finalize again"
    );
    assert.ok(
      readiness.errors.some(
        (error) =>
          error.includes("Annual execution targets have already been finalized") ||
          error.includes("Strategic draft must be finalized")
      ),
      `Unexpected readiness errors: ${readiness.errors.join("; ")}`
    );

    console.log("Weight rollup organogram plan validation passed.");
    console.log(`  Master: ${PLAN_IDS.MASTER}`);
    console.log(`  Rule: draft snapshot ${PLAN_RULE_SNAPSHOT_ID} (fork of global template)`);
    console.log(`  Hierarchy: 2 strategic, 5 goals, 10 KPIs, 20 tasks`);
    console.log(`  Weight modes: percentage, number, frequency`);
    console.log(`  Planning config: quarterly breakdown`);
    console.log(`  Annual skew: ${ANNUAL_TARGET_YEAR_RATIOS.join(" / ")}`);
    console.log(`  Execution periods: Q1–Q4 with period targets for 2029, 2030, and 2031`);
    console.log(`  Ready for annual execution finalization`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Weight rollup plan validation failed:", error.message);
  process.exit(1);
});
