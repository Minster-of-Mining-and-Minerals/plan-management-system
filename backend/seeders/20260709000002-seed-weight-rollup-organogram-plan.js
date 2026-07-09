"use strict";

const {
  PLAN_RULE_ID,
  PLANNING_CONFIG_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  EXECUTION_PERIODS_2029,
  PLAN_TREE,
  PARENT_SECTOR_ID,
  PARENT_SECTOR_NAME,
} = require("./data/weightRollupOrganogramPlan.data");
const { loadUsersByDepartment } = require("./utils/comprehensivePlanSeederUtils");
const {
  buildSkewedAnnualTargetMaps,
  buildQuarterlyPeriodTargetMaps,
  copyNodesToAnnual,
  copyNodesToPeriod,
  buildResolvedTree,
  buildMasterNodes,
  buildAssignments,
  removeExistingPlan,
  copyAssignments,
} = require("./utils/weightRollupPlanSeederUtils");

const DEFAULT_TARGET_UNITS = [
  { id: "person", label: "Person", symbol: "persons" },
  { id: "km", label: "Kilometer", symbol: "km" },
  { id: "birr", label: "Birr", symbol: "ETB" },
  { id: "ton", label: "Ton", symbol: "t" },
  { id: "unit", label: "Unit", symbol: "units" },
];

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

async function seedPlanningConfiguration(queryInterface, masterVersionId, now) {
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
  if (!tableNames.includes("planning_configurations")) {
    return;
  }

  await queryInterface.bulkInsert("planning_configurations", [
    {
      planning_configuration_id: PLANNING_CONFIG_ID,
      government_structure_id: null,
      owned_by_plan_version_id: masterVersionId,
      source_planning_configuration_id: null,
      min_duration_years: 1,
      max_duration_years: 10,
      draft_entity_label_singular: "Plan Draft",
      draft_entity_label_plural: "Plan Drafts",
      create_action_label: "Create Plan Draft",
      planning_period_label: "Planning Period",
      duration_label: "Duration",
      start_year_label: "Start Date",
      end_year_label: "End Date",
      target_units: JSON.stringify(DEFAULT_TARGET_UNITS),
      breakdown_mode: "quarterly",
      custom_periods: JSON.stringify([]),
      created_at: now,
      updated_at: now,
    },
  ]);
}

async function seedExecutionPeriodsForAnnual({
  queryInterface,
  annual,
  annualNodes,
  annualAssignmentPayload,
  now,
  planRuleId,
  sectorId,
}) {
  const annualNodePayload = annualNodes.map(({ created_at, updated_at, ...rest }) => rest);
  const periodTargetMaps = buildQuarterlyPeriodTargetMaps(annualNodePayload);

  await queryInterface.bulkInsert(
    "plan_versions",
    EXECUTION_PERIODS_2029.map((period) => ({
      plan_version_id: period.plan_version_id,
      version_kind: "execution_period",
      parent_plan_version_id: annual.plan_version_id,
      period_label: period.period_label,
      planning_year: annual.planning_year,
      sequence_index: period.sequence_index,
      is_locked: period.is_locked,
      finalized_at: null,
      draft_name: `${annual.draft_name} — ${period.period_label}`,
      planning_start_date: `${annual.planning_year}-01-01`,
      planning_end_date: `${annual.planning_year}-12-31`,
      start_month: 1,
      end_month: 12,
      start_year: annual.planning_year,
      end_year: annual.planning_year,
      planning_duration_years: 1,
      year: annual.planning_year,
      version_number: 100 + period.sequence_index,
      status: period.status,
      government_structure_id: sectorId,
      based_on_version_id: null,
      plan_rule_id: planRuleId,
      created_at: now,
      updated_at: now,
    }))
  );

  for (let quarterIndex = 0; quarterIndex < EXECUTION_PERIODS_2029.length; quarterIndex++) {
    const period = EXECUTION_PERIODS_2029[quarterIndex];
    const { periodNodes, nodeIdMap } = copyNodesToPeriod(
      annualNodePayload,
      period.plan_version_id,
      periodTargetMaps[quarterIndex]
    );

    await queryInterface.bulkInsert(
      "plan_nodes",
      periodNodes.map((n) => ({ ...n, created_at: now, updated_at: now }))
    );

    const { newExternal, newInternal } = copyAssignments(annualAssignmentPayload, nodeIdMap);

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

    await removeExistingPlan(queryInterface, PLAN_IDS, PLANNING_CONFIG_ID);

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

    await seedPlanningConfiguration(queryInterface, PLAN_IDS.MASTER, now);

    await queryInterface.sequelize.query(
      `UPDATE plan_versions
       SET planning_configuration_id = :configId, updated_at = :now
       WHERE plan_version_id = :masterId`,
      {
        replacements: {
          configId: PLANNING_CONFIG_ID,
          masterId: PLAN_IDS.MASTER,
          now,
        },
      }
    );

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

    let firstAnnualAssignmentPayload = null;
    let firstAnnualNodes = null;

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
      const annualAssignmentPayload = { external: newExternal, internal: newInternal };

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

      if (yearIndex === 0) {
        firstAnnualAssignmentPayload = annualAssignmentPayload;
        firstAnnualNodes = annualNodes;
      }
    }

    if (firstAnnualAssignmentPayload && firstAnnualNodes) {
      await seedExecutionPeriodsForAnnual({
        queryInterface,
        annual: ANNUAL_VERSIONS[0],
        annualNodes: firstAnnualNodes,
        annualAssignmentPayload: firstAnnualAssignmentPayload,
        now,
        planRuleId: resolvedPlanRuleId,
        sectorId: parentSectorId,
      });
    }

    const strategicCount = masterNodePayload.filter((n) => n.type === "strategic").length;
    const goalCount = masterNodePayload.filter((n) => n.type === "goal").length;
    const kpiCount = masterNodePayload.filter((n) => n.type === "kpi").length;
    const taskCount = masterNodePayload.filter((n) => n.type === "task").length;

    console.log(`Seeded weight rollup QA plan "${PLAN_DRAFT_NAME}"`);
    console.log(`  Master plan: ${PLAN_IDS.MASTER} (finalized)`);
    console.log(`  Plan rule: ${ruleRows[0].name} (${resolvedPlanRuleId})`);
    console.log(`  Planning config: quarterly breakdown (${PLANNING_CONFIG_ID})`);
    console.log(
      `  Nodes: ${strategicCount} strategic, ${goalCount} goals, ${kpiCount} KPIs, ${taskCount} tasks`
    );
    console.log(
      `  Weight modes: percentage, number (person/ton/birr), frequency across hierarchy`
    );
    console.log(
      `  Contribution weights: goals (100% per strategic) + tasks (100% per KPI)`
    );
    console.log(
      `  Annual targets: skewed ${ANNUAL_TARGET_YEAR_RATIOS.map((r) => `${r * 100}%`).join(" / ")} across 2029–2031`
    );
    console.log(`  Execution periods: Q1–Q4 seeded for 2029 annual draft`);
  },

  async down(queryInterface) {
    await removeExistingPlan(queryInterface, PLAN_IDS, PLANNING_CONFIG_ID);
  },
};
