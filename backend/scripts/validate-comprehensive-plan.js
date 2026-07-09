"use strict";

const assert = require("assert");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { sequelize } = require("../models");
const {
  PLAN_IDS,
  VALIDATION_GROUP_ID,
  PLAN_DRAFT_NAME,
  PLANNING_VALIDATION_DEPT_NAME,
  PARENT_SECTOR_ID,
  PARENT_SECTOR_NAME,
  INSTITUTES,
} = require("../seeders/data/comprehensiveOrganogramPlan.config");

async function countNodes(versionId, type = null) {
  const typeClause = type ? "AND type = :type" : "";
  const rows = await sequelize.query(
    `SELECT COUNT(*)::int AS count
     FROM plan_nodes
     WHERE plan_version_id = :versionId ${typeClause}`,
    {
      replacements: { versionId, type },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0].count;
}

async function countUnassignedNodes(versionId) {
  const rows = await sequelize.query(
    `SELECT COUNT(*)::int AS count
     FROM plan_nodes pn
     WHERE pn.plan_version_id = :versionId
       AND pn.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM external_assignments ea
         WHERE ea.plan_node_id = pn.plan_node_id AND ea.is_active = true
       )
       AND NOT EXISTS (
         SELECT 1 FROM internal_assignments ia
         WHERE ia.plan_node_id = pn.plan_node_id AND ia.is_active = true
       )`,
    {
      replacements: { versionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0].count;
}

async function countWeightedNodesMissingAnnualTarget(versionId) {
  const rows = await sequelize.query(
    `SELECT COUNT(*)::int AS count
     FROM plan_nodes pn
     INNER JOIN plan_nodes master ON master.plan_node_id = pn.source_plan_node_id
     WHERE pn.plan_version_id = :versionId
       AND master.weight > 0
       AND (pn.annual_target IS NULL OR pn.annual_target <= 0)`,
    {
      replacements: { versionId },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0].count;
}

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

      assert.ok(
        annualRows.length > 0,
        `Missing annual node for "${masterNode.title}" in ${annual.planning_year}`
      );

      const annualTarget = Number(annualRows[0].annual_target);
      assert.ok(
        annualTarget > 0,
        `Annual target not set for "${masterNode.title}" in ${annual.planning_year}`
      );
      allocatedSum += annualTarget;
    }

    const draftWeight = Number(masterNode.weight);
    assert.ok(
      Math.abs(allocatedSum - draftWeight) <= 0.001,
      `Annual targets for "${masterNode.title}" sum to ${allocatedSum}, expected ${draftWeight}`
    );
  }
}

async function verifyValidationPermission(parentSectorId) {
  const deptRows = await sequelize.query(
    `SELECT internal_structure_id
     FROM internal_structures
     WHERE government_structure_id = :sectorId AND name = :name
     LIMIT 1`,
    {
      replacements: { sectorId: parentSectorId, name: PLANNING_VALIDATION_DEPT_NAME },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  assert.ok(deptRows.length > 0, `Planning department "${PLANNING_VALIDATION_DEPT_NAME}" not found`);

  const deptId = deptRows[0].internal_structure_id;

  const linkRows = await sequelize.query(
    `SELECT pg.permission_group_id, pg.name, pg.group_kind
     FROM internal_structure_permission_groups ispg
     INNER JOIN permission_groups pg ON pg.permission_group_id = ispg.permission_group_id
     WHERE ispg.internal_structure_id = :deptId
       AND pg.permission_group_id = :groupId
       AND pg.is_active = true`,
    {
      replacements: { deptId, groupId: VALIDATION_GROUP_ID },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  assert.ok(linkRows.length > 0, "Planning department is not linked to Plan Validation Office group");
  assert.strictEqual(linkRows[0].group_kind, "special");

  const permRows = await sequelize.query(
    `SELECT p.resource, p.action
     FROM permission_group_permissions pgp
     INNER JOIN permissions p ON p.permission_id = pgp.permission_id
     WHERE pgp.permission_group_id = :groupId
       AND p.resource = 'plan'
       AND p.action = 'validate_approval'
       AND p.is_active = true`,
    {
      replacements: { groupId: VALIDATION_GROUP_ID },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  assert.ok(permRows.length > 0, "Plan Validation Office group lacks plan:validate_approval");
}

async function main() {
  try {
    const sectorRows = await sequelize.query(
      `SELECT government_structure_id FROM government_structures
       WHERE government_structure_id = :id
       LIMIT 1`,
      {
        replacements: { id: PARENT_SECTOR_ID },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(sectorRows.length > 0, `${PARENT_SECTOR_NAME} sector (${PARENT_SECTOR_ID}) not found`);

    const masterRows = await sequelize.query(
      `SELECT plan_version_id, status, draft_name, government_structure_id
       FROM plan_versions
       WHERE plan_version_id = :id`,
      {
        replacements: { id: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.ok(masterRows.length > 0, "Comprehensive master plan not seeded");
    assert.strictEqual(masterRows[0].status, "finalized");
    assert.strictEqual(masterRows[0].government_structure_id, PARENT_SECTOR_ID);
    assert.ok(
      masterRows[0].draft_name.includes("አማራጭ") || masterRows[0].draft_name === PLAN_DRAFT_NAME,
      "Unexpected master plan draft name"
    );

    const strategicCount = await countNodes(PLAN_IDS.MASTER, "strategic");
    const goalCount = await countNodes(PLAN_IDS.MASTER, "goal");
    const kpiCount = await countNodes(PLAN_IDS.MASTER, "kpi");

    assert.ok(strategicCount >= 5, `Expected at least 5 strategics, got ${strategicCount}`);
    assert.ok(goalCount > 0, "Expected goals on master plan");
    assert.ok(kpiCount > 0, "Expected KPIs on master plan");

    const unassigned = await countUnassignedNodes(PLAN_IDS.MASTER);
    assert.strictEqual(unassigned, 0, `${unassigned} master nodes lack assignments`);

    const annualVersions = await sequelize.query(
      `SELECT plan_version_id, planning_year, status
       FROM plan_versions
       WHERE parent_plan_version_id = :masterId
       ORDER BY sequence_index ASC`,
      {
        replacements: { masterId: PLAN_IDS.MASTER },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    assert.strictEqual(annualVersions.length, 3, "Expected 3 annual plan versions");

    for (const annual of annualVersions) {
      const annualUnassigned = await countUnassignedNodes(annual.plan_version_id);
      assert.strictEqual(
        annualUnassigned,
        0,
        `Annual ${annual.planning_year} has ${annualUnassigned} unassigned nodes`
      );

      const missingTargets = await countWeightedNodesMissingAnnualTarget(annual.plan_version_id);
      assert.strictEqual(
        missingTargets,
        0,
        `Annual ${annual.planning_year} has ${missingTargets} weighted nodes without annual targets`
      );
    }

    await verifyAnnualTargetAllocation(PLAN_IDS.MASTER);

    const { getAnnualExecutionReadiness } = require("../services/planVersionLifecycleService");
    const readiness = await getAnnualExecutionReadiness(PLAN_IDS.MASTER);
    assert.ok(readiness.ready, `Annual execution not ready: ${readiness.errors.join("; ")}`);

    await verifyValidationPermission(PARENT_SECTOR_ID);

    for (const institute of INSTITUTES) {
      const extRows = await sequelize.query(
        `SELECT COUNT(*)::int AS count
         FROM external_assignments ea
         INNER JOIN plan_nodes pn ON pn.plan_node_id = ea.plan_node_id
         WHERE pn.plan_version_id = :masterId
           AND pn.type = 'strategic'
           AND ea.government_structure_id = :sectorId
           AND ea.is_active = true`,
        {
          replacements: { masterId: PLAN_IDS.MASTER, sectorId: institute.sectorId },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      assert.ok(
        extRows[0].count >= 1,
        `No external strategic assignment found for institute ${institute.name}`
      );
    }

    console.log("Comprehensive organogram plan validation passed.");
    console.log(`  Master: ${PLAN_IDS.MASTER} (${strategicCount} strategics, ${goalCount} goals, ${kpiCount} KPIs)`);
    console.log(`  Annual versions: ${annualVersions.map((v) => v.planning_year).join(", ")} (ready for annual execution finalization)`);
    console.log(`  Validation dept: ${PLANNING_VALIDATION_DEPT_NAME}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("Comprehensive plan validation failed:", error.message);
  process.exit(1);
});
