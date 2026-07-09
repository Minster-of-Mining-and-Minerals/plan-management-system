"use strict";

const assert = require("assert");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { sequelize } = require("../models");
const {
  PLAN_RULE_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
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

async function verifyTaskContributionWeights(masterVersionId) {
  const tasks = await sequelize.query(
    `SELECT plan_node_id, parent_id, title, contribution_weight
     FROM plan_nodes
     WHERE plan_version_id = :masterId AND type = 'task'
     ORDER BY "order" ASC`,
    {
      replacements: { masterId: masterVersionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  assert.strictEqual(tasks.length, 8, "Expected 8 task nodes");

  const byParent = new Map();
  for (const task of tasks) {
    if (!byParent.has(task.parent_id)) byParent.set(task.parent_id, []);
    byParent.get(task.parent_id).push(task);
  }

  assert.strictEqual(byParent.size, 4, "Expected 4 KPI parents for tasks");

  for (const [parentId, siblings] of byParent.entries()) {
    const sum = siblings.reduce(
      (total, task) => total + (Number(task.contribution_weight) || 0),
      0
    );
    assert.ok(
      Math.abs(sum - 100) <= 0.001,
      `Task contribution weights under KPI ${parentId} sum to ${sum}, expected 100`
    );
    assert.ok(
      siblings.some((task) => Number(task.contribution_weight) !== 50),
      `Expected uneven contribution weights under KPI ${parentId}`
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
    assert.strictEqual(masterRows[0].status, "finalized");
    assert.ok(masterRows[0].draft_name.includes("Weight Rollup"));

    const ruleRows = await sequelize.query(
      `SELECT plan_rule_id, name FROM plan_rules
       WHERE plan_rule_id = :id OR name = :ruleName
       ORDER BY CASE WHEN plan_rule_id = :id THEN 0 ELSE 1 END
       LIMIT 1`,
      {
        replacements: { id: PLAN_RULE_ID, ruleName: "Weight Rollup Based 4-Level Plan" },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(ruleRows.length > 0, "Weight Rollup Based 4-Level Plan rule not found");
    assert.strictEqual(ruleRows[0].name, "Weight Rollup Based 4-Level Plan");

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
    assert.strictEqual(stepRows[3].node_type, "task");
    assert.strictEqual(stepRows[3].requires_contribution_weight, true);

    const strategic = await sequelize.query(
      `SELECT plan_node_id FROM plan_nodes
       WHERE plan_version_id = :id AND plan_node_id = :nodeId`,
      {
        replacements: { id: PLAN_IDS.MASTER, nodeId: NODE_IDS.STRATEGIC },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(strategic.length > 0, "Strategic node missing");

    await verifyTaskContributionWeights(PLAN_IDS.MASTER);
    await verifyAnnualTargetAllocation(PLAN_IDS.MASTER);

    const readiness = await getAnnualExecutionReadiness(PLAN_IDS.MASTER);
    assert.ok(readiness.ready, `Annual execution not ready: ${readiness.errors.join("; ")}`);

    console.log("Weight rollup organogram plan validation passed.");
    console.log(`  Master: ${PLAN_IDS.MASTER}`);
    console.log(`  Rule: Weight Rollup Based 4-Level Plan`);
    console.log(`  Annual skew: ${ANNUAL_TARGET_YEAR_RATIOS.join(" / ")}`);
    console.log(`  Ready for annual execution finalization`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Weight rollup plan validation failed:", error.message);
  process.exit(1);
});
