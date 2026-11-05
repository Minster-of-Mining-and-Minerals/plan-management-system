"use strict";

const {
  PLAN_RULE_ID,
  PLAN_RULE_SNAPSHOT_ID,
  PLAN_RULE_TEMPLATE_NAME,
  PLAN_RULE_SNAPSHOT_STEPS,
  PLANNING_CONFIG_ID,
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  ANNUAL_TARGET_YEAR_RATIOS,
  ANNUAL_VERSIONS,
  EXECUTION_PERIODS_BY_ANNUAL,
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
  seedOwnedPlanRuleSnapshot,
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
  executionPeriods,
  now,
  planRuleId,
  sectorId,
}) {
  const annualNodePayload = annualNodes.map(({ created_at, updated_at, ...rest }) => rest);
  const periodTargetMaps = buildQuarterlyPeriodTargetMaps(annualNodePayload);

  await queryInterface.bulkInsert(
    "plan_versions",
    executionPeriods.map((period) => ({
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

  for (let quarterIndex = 0; quarterIndex < executionPeriods.length; quarterIndex++) {
    const period = executionPeriods[quarterIndex];
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

    const resolvedGlobalRuleId = ruleRows[0].plan_rule_id;

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

    const annualTargetsFinalizedAt = new Date("2026-02-15T10:00:00.000Z");

    await queryInterface.bulkInsert("plan_versions", [
      {
        plan_version_id: PLAN_IDS.MASTER,
        version_kind: "master",
        parent_plan_version_id: null,
        planning_year: null,
        sequence_index: null,
        is_locked: false,
        finalized_at: null,
        annual_targets_finalized_at: annualTargetsFinalizedAt,
        period_subdivision_mode: "quarterly",
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
        status: "draft",
        government_structure_id: parentSectorId,
        based_on_version_id: null,
        plan_rule_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    await seedOwnedPlanRuleSnapshot(queryInterface, {
      masterVersionId: PLAN_IDS.MASTER,
      snapshotRuleId: PLAN_RULE_SNAPSHOT_ID,
      sourceRuleId: resolvedGlobalRuleId,
      ruleName: PLAN_RULE_TEMPLATE_NAME,
      steps: PLAN_RULE_SNAPSHOT_STEPS,
      now,
    });

    await queryInterface.sequelize.query(
      `UPDATE plan_versions
       SET plan_rule_id = :ruleId, updated_at = :now
       WHERE plan_version_id = :masterId`,
      {
        replacements: {
          ruleId: PLAN_RULE_SNAPSHOT_ID,
          masterId: PLAN_IDS.MASTER,
          now,
        },
      }
    );

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
        plan_rule_id: PLAN_RULE_SNAPSHOT_ID,
        period_subdivision_mode: "quarterly",
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

      const executionPeriods = EXECUTION_PERIODS_BY_ANNUAL[annual.plan_version_id];
      if (executionPeriods?.length) {
        await seedExecutionPeriodsForAnnual({
          queryInterface,
          annual,
          annualNodes,
          annualAssignmentPayload,
          executionPeriods,
          now,
          planRuleId: PLAN_RULE_SNAPSHOT_ID,
          sectorId: parentSectorId,
        });
      }
    }

    // Set finalized timestamps and review completion on live planning versions
    const finalizedAt = new Date("2029-01-01T08:00:00.000Z");
    const publishedAt = new Date("2029-01-01T08:30:00.000Z");
    const reviewCompletedAt = new Date("2029-01-01T09:00:00.000Z");

    await queryInterface.sequelize.query(
      `UPDATE plan_versions
       SET status = 'finalized',
           finalized_at = :finalizedAt,
           annual_targets_finalized_at = :finalizedAt,
           period_targets_finalized_at = :finalizedAt,
           published_for_review_at = :publishedAt,
           review_status = 'review_completed',
           review_completed_at = :reviewCompletedAt
       WHERE plan_version_id = :masterId`,
      {
        replacements: {
          masterId: PLAN_IDS.MASTER,
          finalizedAt,
          publishedAt,
          reviewCompletedAt,
        },
      }
    );

    await queryInterface.sequelize.query(
      `UPDATE plan_versions
       SET period_targets_finalized_at = :finalizedAt,
           annual_targets_finalized_at = :finalizedAt,
           status = 'finalized'
       WHERE parent_plan_version_id = :masterId AND version_kind = 'annual'`,
      {
        replacements: {
          masterId: PLAN_IDS.MASTER,
          finalizedAt,
        },
      }
    );

    await queryInterface.sequelize.query(
      `UPDATE plan_versions
       SET period_targets_finalized_at = :finalizedAt,
           status = 'finalized'
       WHERE parent_plan_version_id IN (
         SELECT plan_version_id FROM plan_versions WHERE parent_plan_version_id = :masterId AND version_kind = 'annual'
       ) AND version_kind = 'execution_period'`,
      {
        replacements: {
          masterId: PLAN_IDS.MASTER,
          finalizedAt,
        },
      }
    );

    // Start plan process to generate execution snapshot & baselines
    try {
      const { startPlanProcess } = require("../services/planVersionLifecycleService");
      const startResult = await startPlanProcess(PLAN_IDS.MASTER);
      if (startResult && startResult.success) {
        // Resolve snapshot Q1 & Q2 versions
        const snapshotQ1Rows = await queryInterface.sequelize.query(
          `SELECT plan_version_id FROM plan_versions
           WHERE execution_snapshot_of_version_id = :livePeriodId
           LIMIT 1`,
          {
            replacements: { livePeriodId: PLAN_IDS.PERIOD_2029_Q1 },
            type: queryInterface.sequelize.QueryTypes.SELECT,
          }
        );
        const snapshotQ1Id = snapshotQ1Rows[0]?.plan_version_id;

        // Populate Q1 validated achievements on both live and snapshot KPI nodes
        const q1VersionIds = [PLAN_IDS.PERIOD_2029_Q1, snapshotQ1Id].filter(Boolean);
        for (const vId of q1VersionIds) {
          await queryInterface.sequelize.query(
            `UPDATE plan_nodes
             SET period_actual = ROUND(CAST(period_target * 0.85 AS numeric), 2),
                 period_actual_status = 'validated',
                 period_actual_submitted_at = :submittedAt,
                 period_actual_validated_at = :validatedAt
             WHERE plan_version_id = :vId AND type = 'kpi' AND period_target IS NOT NULL`,
            {
              replacements: {
                vId,
                submittedAt: new Date("2029-03-30T10:00:00.000Z"),
                validatedAt: new Date("2029-03-31T10:00:00.000Z"),
              },
            }
          );

          await queryInterface.sequelize.query(
            `UPDATE plan_versions
             SET execution_status = 'completed',
                 status = 'completed',
                 is_locked = true
             WHERE plan_version_id = :vId`,
            { replacements: { vId } }
          );
        }

        // Ensure Year 1 Q2 is OPEN for demonstration by administrator
        const snapshotQ2Rows = await queryInterface.sequelize.query(
          `SELECT plan_version_id FROM plan_versions
           WHERE execution_snapshot_of_version_id = :livePeriodId
           LIMIT 1`,
          {
            replacements: { livePeriodId: PLAN_IDS.PERIOD_2029_Q2 },
            type: queryInterface.sequelize.QueryTypes.SELECT,
          }
        );
        const snapshotQ2Id = snapshotQ2Rows[0]?.plan_version_id;
        const q2VersionIds = [PLAN_IDS.PERIOD_2029_Q2, snapshotQ2Id].filter(Boolean);

        for (const vId of q2VersionIds) {
          await queryInterface.sequelize.query(
            `UPDATE plan_versions
             SET execution_status = 'open',
                 status = 'active',
                 is_locked = false
             WHERE plan_version_id = :vId`,
            { replacements: { vId } }
          );

          await queryInterface.sequelize.query(
            `UPDATE plan_nodes
             SET period_actual = NULL,
                 period_actual_status = NULL,
                 period_actual_submitted_at = NULL,
                 period_actual_validated_at = NULL
             WHERE plan_version_id = :vId AND type = 'kpi'`,
            { replacements: { vId } }
          );
        }

        console.log("  Successfully started execution process and seeded Year 1 Q1 validated achievements (~85% progress).");
        console.log("  Year 1 Q2 is OPEN with empty achievements for KPI demo submissions.");
      } else {
        console.warn("  Could not start plan process automatically:", startResult?.errors);
      }
    } catch (startErr) {
      console.warn("  Process start hook error:", startErr.message);
    }

    const strategicCount = masterNodePayload.filter((n) => n.type === "strategic").length;
    const goalCount = masterNodePayload.filter((n) => n.type === "goal").length;
    const kpiCount = masterNodePayload.filter((n) => n.type === "kpi").length;
    const taskCount = masterNodePayload.filter((n) => n.type === "task").length;

    console.log(`Seeded weight rollup QA plan "${PLAN_DRAFT_NAME}"`);
    console.log(`  Master plan: ${PLAN_IDS.MASTER} (draft, owned rule snapshot)`);
    console.log(`  Global template: ${PLAN_RULE_TEMPLATE_NAME} (${resolvedGlobalRuleId}) — unchanged`);
    console.log(`  Draft rule snapshot: ${PLAN_RULE_SNAPSHOT_ID}`);
    console.log(`  Planning config: quarterly breakdown (${PLANNING_CONFIG_ID})`);
    console.log(`  Nodes: ${strategicCount} strategic, ${goalCount} goals, ${kpiCount} KPIs, ${taskCount} tasks`);
    console.log(`  Rule pattern: SF no target | goal contribution | KPI target | task inherits`);
    console.log(`  Contribution weights: uneven per strategic (goals sum to 100%)`);
    console.log(
      `  Annual targets: skewed ${ANNUAL_TARGET_YEAR_RATIOS.map((r) => `${r * 100}%`).join(" / ")} across 2029–2031`
    );
    console.log(`  Execution periods: Q1–Q4 with period targets for 2029, 2030, and 2031`);
  },

  async down(queryInterface) {
    await removeExistingPlan(queryInterface, PLAN_IDS, PLANNING_CONFIG_ID);
  },
};
