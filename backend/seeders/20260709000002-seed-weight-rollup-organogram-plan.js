"use strict";

const {
  PLAN_RULE_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  PLAN_TREE,
  PARENT_SECTOR_ID,
  PARENT_SECTOR_NAME,
} = require("./data/weightRollupOrganogramPlan.data");
const { loadUsersByDepartment } = require("./utils/comprehensivePlanSeederUtils");
const {
  buildSkewedAnnualTargetMaps,
  copyNodesToAnnual,
  buildResolvedTree,
  buildMasterNodes,
  buildAssignments,
  removeExistingPlan,
  copyAssignments,
} = require("./utils/weightRollupPlanSeederUtils");

async function resolveSector(queryInterface) {
  const rows = await queryInterface.sequelize.query(
    `SELECT government_structure_id, name
     FROM government_structures
     WHERE government_structure_id = :id
        OR LOWER(TRIM(name)) = LOWER(TRIM(:name))
     ORDER BY CASE WHEN government_structure_id = :id THEN 0 ELSE 1 END
     LIMIT 1`,
    {
      replacements: { id: PARENT_SECTOR_ID, name: PARENT_SECTOR_NAME },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const finalizedAt = new Date("2026-02-01T10:00:00.000Z");

    const parentSector = await resolveSector(queryInterface);
    if (!parentSector) {
      console.warn(
        `"${PARENT_SECTOR_NAME}" not found. Run npm run seed:organogram first, then retry.`
      );
      return;
    }

    const parentSectorId = parentSector.government_structure_id;

    const ruleRows = await queryInterface.sequelize.query(
      `SELECT plan_rule_id, name FROM plan_rules
       WHERE plan_rule_id = :id OR name = :ruleName
       ORDER BY CASE WHEN plan_rule_id = :id THEN 0 ELSE 1 END
       LIMIT 1`,
      {
        replacements: { id: PLAN_RULE_ID, ruleName: "Weight Rollup Based 4-Level Plan" },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (ruleRows.length === 0) {
      console.warn(
        "Weight rollup plan rule not found. Run seed 20260709000001-seed-weight-rollup-plan-rule.js first."
      );
      return;
    }

    const resolvedPlanRuleId = ruleRows[0].plan_rule_id;

    const actions = await queryInterface.sequelize.query(
      `SELECT assignment_action_id, code FROM plan_assignment_actions
       WHERE code IN ('EXECUTION', 'APPROVAL')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const actionMap = Object.fromEntries(actions.map((a) => [a.code, a.assignment_action_id]));

    if (!actionMap.APPROVAL || !actionMap.EXECUTION) {
      console.warn("APPROVAL or EXECUTION assignment actions not found.");
      return;
    }

    const usersByDept = await loadUsersByDepartment(queryInterface, parentSectorId);
    const resolvedTree = await buildResolvedTree(
      queryInterface,
      parentSectorId,
      PLAN_TREE,
      usersByDept
    );

    await removeExistingPlan(queryInterface, PLAN_IDS);

    await queryInterface.bulkInsert("plan_versions", [
      {
        plan_version_id: PLAN_IDS.MASTER,
        version_kind: "master",
        parent_plan_version_id: null,
        planning_year: null,
        sequence_index: null,
        is_locked: false,
        finalized_at: finalizedAt,
        draft_name: PLAN_DRAFT_NAME,
        planning_start_date: "2029-01-01",
        planning_end_date: "2031-12-31",
        start_month: 1,
        end_month: 12,
        start_year: 2029,
        end_year: 2031,
        planning_duration_years: 3,
        year: 2029,
        version_number: 0,
        status: "finalized",
        government_structure_id: parentSectorId,
        based_on_version_id: null,
        plan_rule_id: resolvedPlanRuleId,
        created_at: now,
        updated_at: now,
      },
    ]);

    const masterNodes = buildMasterNodes(PLAN_IDS.MASTER, resolvedTree).map((n) => ({
      ...n,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("plan_nodes", masterNodes);

    const { external, internal } = buildAssignments(resolvedTree, parentSectorId, actionMap);

    await queryInterface.bulkInsert(
      "external_assignments",
      external.map((a) => ({ ...a, created_at: now, updated_at: now }))
    );
    await queryInterface.bulkInsert(
      "internal_assignments",
      internal.map((a) => ({ ...a, created_at: now, updated_at: now }))
    );

    const masterAssignmentPayload = { external, internal };
    const masterNodePayload = masterNodes.map(({ created_at, updated_at, ...rest }) => rest);
    const annualTargetMaps = buildSkewedAnnualTargetMaps(
      masterNodePayload,
      ANNUAL_TARGET_YEAR_RATIOS
    );

    await queryInterface.bulkInsert(
      "plan_versions",
      ANNUAL_VERSIONS.map((annual) => ({
        plan_version_id: annual.plan_version_id,
        version_kind: "annual",
        parent_plan_version_id: PLAN_IDS.MASTER,
        planning_year: annual.planning_year,
        sequence_index: annual.sequence_index,
        is_locked: false,
        finalized_at: null,
        draft_name: annual.draft_name,
        planning_start_date: `${annual.planning_year}-01-01`,
        planning_end_date: `${annual.planning_year}-12-31`,
        start_month: 1,
        end_month: 12,
        start_year: annual.planning_year,
        end_year: annual.planning_year,
        planning_duration_years: 1,
        year: annual.planning_year,
        version_number: annual.sequence_index,
        status: "draft",
        government_structure_id: parentSectorId,
        based_on_version_id: null,
        plan_rule_id: resolvedPlanRuleId,
        created_at: now,
        updated_at: now,
      }))
    );

    for (let yearIndex = 0; yearIndex < ANNUAL_VERSIONS.length; yearIndex++) {
      const annual = ANNUAL_VERSIONS[yearIndex];
      const { annualNodes, nodeIdMap } = copyNodesToAnnual(
        masterNodePayload,
        annual.plan_version_id,
        annualTargetMaps[yearIndex]
      );

      await queryInterface.bulkInsert(
        "plan_nodes",
        annualNodes.map((n) => ({ ...n, created_at: now, updated_at: now }))
      );

      const { newExternal, newInternal } = copyAssignments(masterAssignmentPayload, nodeIdMap);

      if (newExternal.length > 0) {
        await queryInterface.bulkInsert(
          "external_assignments",
          newExternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
        );
      }
      if (newInternal.length > 0) {
        await queryInterface.bulkInsert(
          "internal_assignments",
          newInternal.map((a) => ({ ...a, created_at: now, updated_at: now }))
        );
      }
    }

    const taskCount = masterNodePayload.filter((n) => n.type === "task").length;
    const kpiCount = masterNodePayload.filter((n) => n.type === "kpi").length;

    console.log(`Seeded weight rollup QA plan "${PLAN_DRAFT_NAME}"`);
    console.log(`  Master plan: ${PLAN_IDS.MASTER} (finalized)`);
    console.log(`  Plan rule: ${ruleRows[0].name} (${resolvedPlanRuleId})`);
    console.log(`  Nodes: 1 strategic, 2 goals, ${kpiCount} KPIs, ${taskCount} tasks`);
    console.log(
      `  Annual targets: skewed ${ANNUAL_TARGET_YEAR_RATIOS.map((r) => `${r * 100}%`).join(" / ")} across 2029–2031`
    );
    console.log(`  Task contribution weights: uneven per KPI (rollup test data)`);
  },

  async down(queryInterface) {
    await removeExistingPlan(queryInterface, PLAN_IDS);
  },
};
