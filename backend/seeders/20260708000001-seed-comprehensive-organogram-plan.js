"use strict";

const {
  PLAN_IDS,
  VALIDATION_GROUP_ID,
  PLAN_DRAFT_NAME,
  PLANNING_VALIDATION_DEPT_NAME,
  ANNUAL_VERSIONS,
  PARENT_SECTOR_ID,
  PARENT_SECTOR_NAME,
  INSTITUTES,
} = require("./data/comprehensiveOrganogramPlan.config");
const {
  loadDepartmentsForSector,
  buildChildrenMap,
  buildMinisterSectorBlocks,
  buildInstituteSectorBlock,
  loadUsersByDepartment,
  resolveBlockUsers,
  buildMasterNodes,
  buildAssignments,
  copyNodesToAnnual,
  copyAssignments,
  removeExistingPlan,
  ensurePlanValidationPermissionGroup,
} = require("./utils/comprehensivePlanSeederUtils");

async function resolveSector(queryInterface, expectedId, sectorName) {
  const rows = await queryInterface.sequelize.query(
    `SELECT government_structure_id, name
     FROM government_structures
     WHERE government_structure_id = :id
        OR LOWER(TRIM(name)) = LOWER(TRIM(:name))
     ORDER BY CASE WHEN government_structure_id = :id THEN 0 ELSE 1 END
     LIMIT 1`,
    {
      replacements: { id: expectedId, name: sectorName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const finalizedAt = new Date("2026-01-15T10:00:00.000Z");

    const parentSector = await resolveSector(
      queryInterface,
      PARENT_SECTOR_ID,
      PARENT_SECTOR_NAME
    );
    if (!parentSector) {
      console.warn(
        `"${PARENT_SECTOR_NAME}" not found. Run npm run seed:organogram first, then retry.`
      );
      return;
    }

    const parentSectorId = parentSector.government_structure_id;

    for (const institute of INSTITUTES) {
      const sector = await resolveSector(queryInterface, institute.sectorId, institute.name);
      if (!sector) {
        console.warn(`Institute "${institute.name}" not found. Run npm run seed:organogram first.`);
        return;
      }
    }

    const ruleRows = await queryInterface.sequelize.query(
      `SELECT plan_rule_id FROM plan_rules WHERE plan_rule_id = :id LIMIT 1`,
      {
        replacements: { id: PLAN_IDS.DEFAULT_PLAN_RULE },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (ruleRows.length === 0) {
      console.warn("Default plan rule not found. Run default plan rule seeder first.");
      return;
    }

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

    const momDepartments = await loadDepartmentsForSector(queryInterface, parentSectorId);
    if (momDepartments.length === 0) {
      console.warn("No departments found for Alternative Minister of Mines.");
      return;
    }

    const momTree = buildChildrenMap(momDepartments);
    const momUsers = await loadUsersByDepartment(queryInterface, parentSectorId);

    const rawBlocks = buildMinisterSectorBlocks(
      parentSectorId,
      momDepartments,
      momTree.childrenMap
    );

    for (const institute of INSTITUTES) {
      const instituteDepartments = await loadDepartmentsForSector(
        queryInterface,
        institute.sectorId
      );
      if (instituteDepartments.length === 0) {
        console.warn(`No departments found for institute "${institute.name}".`);
        return;
      }

      const instituteTree = buildChildrenMap(instituteDepartments);
      const instituteBlock = buildInstituteSectorBlock(
        institute,
        instituteDepartments,
        instituteTree.childrenMap
      );

      if (!instituteBlock) {
        console.warn(`Could not build plan block for institute "${institute.name}".`);
        return;
      }

      rawBlocks.push(instituteBlock);
    }

    const resolvedBlocks = [];
    for (const block of rawBlocks) {
      const usersByDept =
        block.sectorId === parentSectorId
          ? momUsers
          : await loadUsersByDepartment(queryInterface, block.sectorId);
      resolvedBlocks.push(resolveBlockUsers(block, usersByDept));
    }

    await removeExistingPlan(queryInterface, PLAN_IDS);

    const validationSetup = await ensurePlanValidationPermissionGroup(
      queryInterface,
      {
        groupId: VALIDATION_GROUP_ID,
        groupName: "Plan Validation Office",
        planningDeptName: PLANNING_VALIDATION_DEPT_NAME,
        parentSectorId,
      },
      now
    );

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
        planning_start_date: "2026-01-01",
        planning_end_date: "2028-12-31",
        start_month: 1,
        end_month: 12,
        start_year: 2026,
        end_year: 2028,
        planning_duration_years: 3,
        year: 2026,
        version_number: 0,
        status: "finalized",
        government_structure_id: parentSectorId,
        based_on_version_id: null,
        plan_rule_id: PLAN_IDS.DEFAULT_PLAN_RULE,
        created_at: now,
        updated_at: now,
      },
    ]);

    const masterNodes = buildMasterNodes(PLAN_IDS.MASTER, resolvedBlocks).map((n) => ({
      ...n,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("plan_nodes", masterNodes);

    const { external: externalAssignments, internal: internalAssignments } = buildAssignments(
      resolvedBlocks,
      actionMap
    );

    await queryInterface.bulkInsert(
      "external_assignments",
      externalAssignments.map((a) => ({ ...a, created_at: now, updated_at: now }))
    );
    await queryInterface.bulkInsert(
      "internal_assignments",
      internalAssignments.map((a) => ({ ...a, created_at: now, updated_at: now }))
    );

    const masterAssignmentPayload = {
      external: externalAssignments,
      internal: internalAssignments,
    };
    const masterNodePayload = masterNodes.map(({ created_at, updated_at, ...rest }) => rest);

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
        plan_rule_id: PLAN_IDS.DEFAULT_PLAN_RULE,
        created_at: now,
        updated_at: now,
      }))
    );

    for (const annual of ANNUAL_VERSIONS) {
      const { annualNodes, nodeIdMap } = copyNodesToAnnual(
        masterNodePayload,
        annual.plan_version_id
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

    const strategicCount = masterNodePayload.filter((n) => n.type === "strategic").length;
    const goalCount = masterNodePayload.filter((n) => n.type === "goal").length;
    const kpiCount = masterNodePayload.filter((n) => n.type === "kpi").length;

    console.log(`Seeded comprehensive organogram plan "${PLAN_DRAFT_NAME}"`);
    console.log(`  Master plan: ${PLAN_IDS.MASTER} (finalized)`);
    console.log(`  Strategic focuses: ${strategicCount}`);
    console.log(`  Goals: ${goalCount}`);
    console.log(`  KPIs: ${kpiCount}`);
    console.log(`  Annual drafts: 2026, 2027, 2028 (KPI annual targets on all years)`);
    console.log(
      `  Plan validation office: ${PLANNING_VALIDATION_DEPT_NAME} → group ${validationSetup.groupId}`
    );
  },

  async down(queryInterface) {
    await removeExistingPlan(queryInterface, PLAN_IDS);
  },
};
