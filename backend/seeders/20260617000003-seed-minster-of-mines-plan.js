"use strict";

const { v4: uuidv4 } = require("uuid");
const { SECTORS } = require("./data/minsterOfMinesStructure.data");
const {
  PLAN_IDS,
  PLAN_DRAFT_NAME,
  PARENT_SECTOR_NAME,
  SECTOR_PLAN_BLOCKS,
} = require("./data/minsterOfMinesPlan.data");

const ANNUAL_VERSIONS = [
  {
    plan_version_id: PLAN_IDS.ANNUAL_2026,
    planning_year: 2026,
    sequence_index: 1,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 1 (2026)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2027,
    planning_year: 2027,
    sequence_index: 2,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 2 (2027)`,
  },
  {
    plan_version_id: PLAN_IDS.ANNUAL_2028,
    planning_year: 2028,
    sequence_index: 3,
    draft_name: `${PLAN_DRAFT_NAME} — ዓመት 3 (2028)`,
  },
];

function node(id, planVersionId, parentId, type, title, description, weight, level, order, opts = {}) {
  return {
    plan_node_id: id,
    plan_version_id: planVersionId,
    parent_id: parentId,
    source_plan_node_id: opts.sourcePlanNodeId ?? null,
    type,
    title,
    description,
    weight,
    weight_mode: opts.weightMode ?? null,
    target_unit: opts.targetUnit ?? null,
    level,
    order,
    is_active: true,
    assignment_sharing_mode: opts.sharingMode ?? "exclusive",
    annual_target: opts.annualTarget ?? null,
  };
}

async function findSectorByName(queryInterface, name, parentId = null) {
  const parentClause = parentId === null ? "parent_id IS NULL" : "parent_id = :parentId";
  const replacements = parentId === null ? { name } : { name, parentId };

  const rows = await queryInterface.sequelize.query(
    `SELECT government_structure_id, name
     FROM government_structures
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(:name))
       AND ${parentClause}
     LIMIT 1`,
    {
      replacements,
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

async function findDepartmentId(queryInterface, governmentStructureId, name) {
  const rows = await queryInterface.sequelize.query(
    `SELECT internal_structure_id, level
     FROM internal_structures
     WHERE government_structure_id = :govId AND name = :name
     LIMIT 1`,
    {
      replacements: { govId: governmentStructureId, name },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

async function loadUsersByDepartment(queryInterface, sectorId) {
  const rows = await queryInterface.sequelize.query(
    `SELECT u.user_id, u.email, u.internal_structure_id
     FROM users u
     INNER JOIN internal_structures d ON d.internal_structure_id = u.internal_structure_id
     WHERE d.government_structure_id = :sectorId
       AND u.is_active = true`,
    {
      replacements: { sectorId },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const byDept = new Map();
  for (const row of rows) {
    if (!byDept.has(row.internal_structure_id)) {
      byDept.set(row.internal_structure_id, {});
    }
    const bucket = byDept.get(row.internal_structure_id);
    const localPart = row.email.split("@")[0] ?? "";
    if (localPart.endsWith("-head")) {
      bucket.head = row.user_id;
    } else if (localPart.endsWith("-officer")) {
      bucket.officer = row.user_id;
    }
  }
  return byDept;
}

function sectorKeyForName(sectorName) {
  const match = SECTORS.find((s) => s.name === sectorName);
  return match?.sectorKey ?? null;
}

async function removeExistingPlan(queryInterface) {
  const versionIds = [
    PLAN_IDS.MASTER,
    PLAN_IDS.ANNUAL_2026,
    PLAN_IDS.ANNUAL_2027,
    PLAN_IDS.ANNUAL_2028,
  ];

  const nodes = await queryInterface.sequelize.query(
    `SELECT plan_node_id FROM plan_nodes WHERE plan_version_id IN (:versionIds)`,
    {
      replacements: { versionIds },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const nodeIds = nodes.map((n) => n.plan_node_id);

  if (nodeIds.length > 0) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));

    if (tableNames.includes("plan_node_action_logs")) {
      await queryInterface.bulkDelete("plan_node_action_logs", { plan_node_id: nodeIds });
    }

    await queryInterface.bulkDelete("internal_assignments", { plan_node_id: nodeIds });
    await queryInterface.bulkDelete("external_assignments", { plan_node_id: nodeIds });
    await queryInterface.bulkDelete("plan_nodes", { plan_version_id: versionIds });
  }

  await queryInterface.bulkDelete("plan_versions", { plan_version_id: versionIds });
}

function buildMasterNodes(planVersionId, blocks) {
  const nodes = [];
  let strategicOrder = 1;

  for (const block of blocks) {
    nodes.push(
      node(
        block.strategic.id,
        planVersionId,
        null,
        "strategic",
        block.strategic.title,
        block.strategic.description,
        0,
        1,
        strategicOrder++
      )
    );

    let goalOrder = 1;
    for (const goal of block.goals) {
      nodes.push(
        node(
          goal.id,
          planVersionId,
          block.strategic.id,
          "goal",
          goal.title,
          goal.description,
          50,
          2,
          goalOrder++,
          { weightMode: "percentage" }
        )
      );

      let kpiOrder = 1;
      for (const kpi of goal.kpis) {
        nodes.push(
          node(
            kpi.id,
            planVersionId,
            goal.id,
            "kpi",
            kpi.title,
            kpi.description,
            50,
            3,
            kpiOrder++,
            { weightMode: "percentage" }
          )
        );
      }
    }
  }

  return nodes;
}

function copyNodesToAnnual(masterNodes, annualVersionId) {
  const nodeIdMap = new Map();
  const annualNodes = [];

  for (const source of masterNodes) {
    nodeIdMap.set(source.plan_node_id, uuidv4());
  }

  for (const source of masterNodes) {
    annualNodes.push({
      plan_node_id: nodeIdMap.get(source.plan_node_id),
      plan_version_id: annualVersionId,
      parent_id: source.parent_id ? nodeIdMap.get(source.parent_id) : null,
      source_plan_node_id: source.plan_node_id,
      type: source.type,
      title: source.title,
      description: source.description,
      weight: source.weight,
      weight_mode: source.weight_mode,
      target_unit: source.target_unit,
      level: source.level,
      order: source.order,
      is_active: source.is_active,
      assignment_sharing_mode: source.assignment_sharing_mode,
      annual_target: null,
    });
  }

  return { annualNodes, nodeIdMap };
}

function copyAssignments(masterAssignments, nodeIdMap) {
  const newExternal = [];
  const newInternal = [];

  for (const ext of masterAssignments.external) {
    newExternal.push({
      external_assignment_id: uuidv4(),
      plan_node_id: nodeIdMap.get(ext.plan_node_id),
      government_structure_id: ext.government_structure_id,
      is_visible: ext.is_visible,
      requires_report: ext.requires_report,
      is_active: ext.is_active ?? true,
    });
  }

  for (const int of masterAssignments.internal) {
    newInternal.push({
      internal_assignment_id: uuidv4(),
      plan_node_id: nodeIdMap.get(int.plan_node_id),
      internal_structure_id: int.internal_structure_id,
      user_id: int.user_id,
      action_id: int.action_id,
      is_active: int.is_active ?? true,
      branch_external_assignment_id: null,
      branch_internal_assignment_id: null,
    });
  }

  return { newExternal, newInternal };
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const finalizedAt = new Date("2026-01-15T10:00:00.000Z");

    const parentSector = await findSectorByName(queryInterface, PARENT_SECTOR_NAME, null);
    if (!parentSector) {
      console.warn(
        `"${PARENT_SECTOR_NAME}" not found. Run seed:minster-mom first, then retry.`
      );
      return;
    }

    const parentSectorId = parentSector.government_structure_id;

    const sectorIds = {};
    const sectorUsers = {};

    for (const block of SECTOR_PLAN_BLOCKS) {
      const isParent = block.sectorName === PARENT_SECTOR_NAME;
      const sector = isParent
        ? parentSector
        : await findSectorByName(queryInterface, block.sectorName, parentSectorId);

      if (!sector) {
        console.warn(`Sector "${block.sectorName}" not found. Run seed:minster-mom first.`);
        return;
      }

      sectorIds[block.sectorName] = sector.government_structure_id;
      sectorUsers[block.sectorName] = await loadUsersByDepartment(
        queryInterface,
        sector.government_structure_id
      );

      if (!sectorKeyForName(block.sectorName)) {
        console.warn(`No sectorKey configured for "${block.sectorName}".`);
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

    const resolvedBlocks = [];
    for (const block of SECTOR_PLAN_BLOCKS) {
      const sectorId = sectorIds[block.sectorName];
      const usersByDept = sectorUsers[block.sectorName];

      const rootDept = await findDepartmentId(queryInterface, sectorId, block.rootDeptName);
      if (!rootDept) {
        console.warn(`Root department "${block.rootDeptName}" missing in ${block.sectorName}.`);
        return;
      }

      const goals = [];
      for (const goal of block.goals) {
        const subDept = await findDepartmentId(queryInterface, sectorId, goal.subDeptName);
        if (!subDept) {
          console.warn(`Sub-department "${goal.subDeptName}" missing in ${block.sectorName}.`);
          return;
        }

        const kpis = [];
        for (const kpi of goal.kpis) {
          const leafDept = await findDepartmentId(queryInterface, sectorId, kpi.leafName);
          if (!leafDept) {
            console.warn(`Leaf department "${kpi.leafName}" missing in ${block.sectorName}.`);
            return;
          }

          const leafUsers = usersByDept.get(leafDept.internal_structure_id) ?? {};
          if (!leafUsers.officer) {
            console.warn(
              `Officer user missing for "${kpi.leafName}" in ${block.sectorName}. Run seed:minster-mom.`
            );
            return;
          }

          kpis.push({
            ...kpi,
            leafDeptId: leafDept.internal_structure_id,
            officerUserId: leafUsers.officer,
          });
        }

        const subUsers = usersByDept.get(subDept.internal_structure_id) ?? {};
        if (!subUsers.head) {
          console.warn(
            `Head user missing for "${goal.subDeptName}" in ${block.sectorName}. Run seed:minster-mom.`
          );
          return;
        }

        goals.push({
          ...goal,
          subDeptId: subDept.internal_structure_id,
          headUserId: subUsers.head,
          kpis,
        });
      }

      const rootUsers = usersByDept.get(rootDept.internal_structure_id) ?? {};
      if (!rootUsers.head) {
        console.warn(
          `Head user missing for "${block.rootDeptName}" in ${block.sectorName}. Run seed:minster-mom.`
        );
        return;
      }

      resolvedBlocks.push({
        ...block,
        sectorId,
        rootDeptId: rootDept.internal_structure_id,
        rootHeadUserId: rootUsers.head,
        goals,
      });
    }

    await removeExistingPlan(queryInterface);

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

    const masterNodes = buildMasterNodes(PLAN_IDS.MASTER, SECTOR_PLAN_BLOCKS).map((n) => ({
      ...n,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert("plan_nodes", masterNodes);

    const externalAssignments = [];
    const internalAssignments = [];

    for (const block of resolvedBlocks) {
      externalAssignments.push({
        external_assignment_id: uuidv4(),
        plan_node_id: block.strategic.id,
        government_structure_id: block.sectorId,
        is_visible: true,
        requires_report: true,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      internalAssignments.push({
        internal_assignment_id: uuidv4(),
        plan_node_id: block.strategic.id,
        internal_structure_id: block.rootDeptId,
        user_id: block.rootHeadUserId,
        action_id: actionMap.APPROVAL,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      for (const goal of block.goals) {
        internalAssignments.push({
          internal_assignment_id: uuidv4(),
          plan_node_id: goal.id,
          internal_structure_id: goal.subDeptId,
          user_id: goal.headUserId,
          action_id: actionMap.APPROVAL,
          is_active: true,
          created_at: now,
          updated_at: now,
        });

        for (const kpi of goal.kpis) {
          internalAssignments.push({
            internal_assignment_id: uuidv4(),
            plan_node_id: kpi.id,
            internal_structure_id: kpi.leafDeptId,
            user_id: kpi.officerUserId,
            action_id: actionMap.EXECUTION,
            is_active: true,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    await queryInterface.bulkInsert("external_assignments", externalAssignments);
    await queryInterface.bulkInsert("internal_assignments", internalAssignments);

    const masterAssignmentPayload = {
      external: externalAssignments.map(({ created_at, updated_at, ...rest }) => rest),
      internal: internalAssignments.map(({ created_at, updated_at, ...rest }) => rest),
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

    console.log(`Seeded 3-year plan "${PLAN_DRAFT_NAME}" (${PLAN_IDS.MASTER})`);
    console.log(`  Strategic focuses: ${SECTOR_PLAN_BLOCKS.length}`);
    console.log(`  Goals: ${SECTOR_PLAN_BLOCKS.length * 2}`);
    console.log(`  KPIs: ${SECTOR_PLAN_BLOCKS.length * 4}`);
    console.log(`  Annual drafts: 2026, 2027, 2028`);
  },

  async down(queryInterface) {
    await removeExistingPlan(queryInterface);
  },
};
