"use strict";

const { v4: uuidv4, v5: uuidv5 } = require("uuid");
const { ensurePermission } = require("../../utils/permissionSeedUtils");

const PLAN_NODE_NAMESPACE = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function planNodeId(kind, sectorId, deptId) {
  return uuidv5(`comprehensive-plan-node:${kind}:${sectorId}:${deptId}`, PLAN_NODE_NAMESPACE);
}

function distributeWeights(count) {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const weights = Array(count).fill(base);
  weights[count - 1] = 100 - base * (count - 1);
  return weights;
}

function node(
  id,
  planVersionId,
  parentId,
  type,
  title,
  description,
  weight,
  level,
  order,
  opts = {}
) {
  return {
    plan_node_id: id,
    plan_version_id: planVersionId,
    parent_id: parentId,
    source_plan_node_id: opts.sourcePlanNodeId ?? null,
    type,
    title,
    description,
    weight,
    weight_mode: opts.weightMode ?? (weight > 0 ? "percentage" : null),
    target_unit: opts.targetUnit ?? null,
    level,
    order,
    is_active: true,
    assignment_sharing_mode: opts.sharingMode ?? "exclusive",
    annual_target: opts.annualTarget ?? null,
  };
}

function classifyUserRole(email) {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  if (local.endsWith(".head") || local.endsWith("-head")) return "head";
  if (local.endsWith(".officer") || local.endsWith("-officer")) return "officer";
  return null;
}

async function loadDepartmentsForSector(queryInterface, sectorId) {
  return queryInterface.sequelize.query(
    `SELECT internal_structure_id, government_structure_id, parent_id, name, level
     FROM internal_structures
     WHERE government_structure_id = :sectorId AND is_active = true
     ORDER BY level ASC, name ASC`,
    {
      replacements: { sectorId },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
}

function buildChildrenMap(departments) {
  const byId = new Map(departments.map((d) => [d.internal_structure_id, d]));
  const childrenMap = new Map();

  for (const dept of departments) {
    if (!dept.parent_id) continue;
    if (!childrenMap.has(dept.parent_id)) {
      childrenMap.set(dept.parent_id, []);
    }
    childrenMap.get(dept.parent_id).push(dept);
  }

  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { byId, childrenMap };
}

function collectLeafDepartments(dept, childrenMap) {
  const children = childrenMap.get(dept.internal_structure_id) ?? [];
  if (children.length === 0) return [dept];
  return children.flatMap((child) => collectLeafDepartments(child, childrenMap));
}

function buildGoalKpiGroups(strategicDept, childrenMap) {
  const children = childrenMap.get(strategicDept.internal_structure_id) ?? [];

  if (children.length === 0) {
    return [{ goalDept: strategicDept, kpiDepts: [strategicDept] }];
  }

  const groups = [];
  for (const child of children) {
    const grandchildren = childrenMap.get(child.internal_structure_id) ?? [];
    if (grandchildren.length === 0) {
      groups.push({ goalDept: child, kpiDepts: [child] });
    } else {
      groups.push({
        goalDept: child,
        kpiDepts: collectLeafDepartments(child, childrenMap),
      });
    }
  }
  return groups;
}

function buildMinisterSectorBlocks(sectorId, departments, childrenMap) {
  const root =
    departments.find((d) => !d.parent_id) ??
    departments.find((d) => d.level === Math.min(...departments.map((x) => x.level)));

  if (!root) return [];

  const strategics = childrenMap.get(root.internal_structure_id) ?? [];
  const blocks = [];

  for (const strategicDept of strategics) {
    const goalGroups = buildGoalKpiGroups(strategicDept, childrenMap);
    if (goalGroups.length === 0) continue;

    blocks.push({
      sectorId,
      externalSectorId: sectorId,
      strategicDept,
      strategicNodeId: planNodeId("strategic", sectorId, strategicDept.internal_structure_id),
      strategicTitle: strategicDept.name,
      strategicDescription: `Strategic focus for ${strategicDept.name}.`,
      goalGroups,
    });
  }

  return blocks;
}

function buildInstituteSectorBlock(institute, departments, childrenMap) {
  const root =
    departments.find((d) => !d.parent_id) ??
    departments.find((d) => d.level === Math.min(...departments.map((x) => x.level)));

  if (!root) return null;

  const goalGroups = buildGoalKpiGroups(root, childrenMap);
  if (goalGroups.length === 0) return null;

  return {
    sectorId: institute.sectorId,
    externalSectorId: institute.sectorId,
    strategicDept: root,
    strategicNodeId: planNodeId("strategic", institute.sectorId, root.internal_structure_id),
    strategicTitle: `${institute.name} Institutional Programme`,
    strategicDescription: institute.description,
    goalGroups,
  };
}

async function loadUsersByDepartment(queryInterface, sectorId) {
  const rows = await queryInterface.sequelize.query(
    `SELECT u.user_id, u.email, u.internal_structure_id
     FROM users u
     INNER JOIN internal_structures d ON d.internal_structure_id = u.internal_structure_id
     WHERE d.government_structure_id = :sectorId
       AND u.is_active = true
     ORDER BY u.email ASC`,
    {
      replacements: { sectorId },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  const byDept = new Map();
  for (const row of rows) {
    if (!byDept.has(row.internal_structure_id)) {
      byDept.set(row.internal_structure_id, { users: [] });
    }
    byDept.get(row.internal_structure_id).users.push(row);
  }

  const resolved = new Map();
  for (const [deptId, bucket] of byDept.entries()) {
    const result = {};
    for (const user of bucket.users) {
      const role = classifyUserRole(user.email);
      if (role === "head" && !result.head) result.head = user.user_id;
      if (role === "officer" && !result.officer) result.officer = user.user_id;
    }
    if (!result.head && bucket.users[0]) result.head = bucket.users[0].user_id;
    if (!result.officer && bucket.users[1]) result.officer = bucket.users[1].user_id;
    if (!result.officer && bucket.users[0] && bucket.users.length === 1) {
      result.officer = bucket.users[0].user_id;
    }
    resolved.set(deptId, result);
  }

  return resolved;
}

function resolveBlockUsers(block, usersByDept) {
  const strategicUsers = usersByDept.get(block.strategicDept.internal_structure_id) ?? {};
  if (!strategicUsers.head) {
    throw new Error(
      `Head user missing for strategic department "${block.strategicTitle}" (${block.sectorId}).`
    );
  }

  const goals = [];
  for (const group of block.goalGroups) {
    const goalUsers = usersByDept.get(group.goalDept.internal_structure_id) ?? {};
    if (!goalUsers.head) {
      throw new Error(
        `Head user missing for goal department "${group.goalDept.name}" (${block.sectorId}).`
      );
    }

    const kpis = [];
    for (const kpiDept of group.kpiDepts) {
      const kpiUsers = usersByDept.get(kpiDept.internal_structure_id) ?? {};
      if (!kpiUsers.officer) {
        throw new Error(
          `Officer user missing for KPI department "${kpiDept.name}" (${block.sectorId}).`
        );
      }
      kpis.push({
        dept: kpiDept,
        nodeId: planNodeId("kpi", block.sectorId, kpiDept.internal_structure_id),
        title: kpiDept.name,
        description: `Deliverable indicator for ${kpiDept.name}.`,
        deptId: kpiDept.internal_structure_id,
        officerUserId: kpiUsers.officer,
      });
    }

    goals.push({
      dept: group.goalDept,
      nodeId: planNodeId("goal", block.sectorId, group.goalDept.internal_structure_id),
      title: group.goalDept.name,
      description: `Operational goal for ${group.goalDept.name}.`,
      deptId: group.goalDept.internal_structure_id,
      headUserId: goalUsers.head,
      kpis,
    });
  }

  return {
    ...block,
    strategicHeadUserId: strategicUsers.head,
    strategicDeptId: block.strategicDept.internal_structure_id,
    goals,
  };
}

function buildMasterNodes(planVersionId, resolvedBlocks) {
  const nodes = [];
  let strategicOrder = 1;

  for (const block of resolvedBlocks) {
    nodes.push(
      node(
        block.strategicNodeId,
        planVersionId,
        null,
        "strategic",
        block.strategicTitle,
        block.strategicDescription,
        0,
        1,
        strategicOrder++
      )
    );

    const goalWeights = distributeWeights(block.goals.length);
    let goalOrder = 1;

    for (let goalIndex = 0; goalIndex < block.goals.length; goalIndex++) {
      const goal = block.goals[goalIndex];
      nodes.push(
        node(
          goal.nodeId,
          planVersionId,
          block.strategicNodeId,
          "goal",
          goal.title,
          goal.description,
          goalWeights[goalIndex],
          2,
          goalOrder++
        )
      );

      const kpiWeights = distributeWeights(goal.kpis.length);
      let kpiOrder = 1;

      for (let kpiIndex = 0; kpiIndex < goal.kpis.length; kpiIndex++) {
        const kpi = goal.kpis[kpiIndex];
        nodes.push(
          node(
            kpi.nodeId,
            planVersionId,
            goal.nodeId,
            "kpi",
            kpi.title,
            kpi.description,
            kpiWeights[kpiIndex],
            3,
            kpiOrder++
          )
        );
      }
    }
  }

  return nodes;
}

function buildAssignments(resolvedBlocks, actionMap) {
  const external = [];
  const internal = [];

  for (const block of resolvedBlocks) {
    external.push({
      external_assignment_id: uuidv4(),
      plan_node_id: block.strategicNodeId,
      government_structure_id: block.externalSectorId,
      is_visible: true,
      requires_report: true,
      is_active: true,
    });

    internal.push({
      internal_assignment_id: uuidv4(),
      plan_node_id: block.strategicNodeId,
      internal_structure_id: block.strategicDeptId,
      user_id: block.strategicHeadUserId,
      action_id: actionMap.APPROVAL,
      is_active: true,
    });

    for (const goal of block.goals) {
      internal.push({
        internal_assignment_id: uuidv4(),
        plan_node_id: goal.nodeId,
        internal_structure_id: goal.deptId,
        user_id: goal.headUserId,
        action_id: actionMap.APPROVAL,
        is_active: true,
      });

      for (const kpi of goal.kpis) {
        internal.push({
          internal_assignment_id: uuidv4(),
          plan_node_id: kpi.nodeId,
          internal_structure_id: kpi.deptId,
          user_id: kpi.officerUserId,
          action_id: actionMap.EXECUTION,
          is_active: true,
        });
      }
    }
  }

  return { external, internal };
}

function copyNodesToAnnual(masterNodes, annualVersionId, annualTargetBySourceId = {}) {
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
      annual_target:
        annualTargetBySourceId[source.plan_node_id] ??
        (source.type === "kpi" ? 100 : null),
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

async function removeExistingPlan(queryInterface, planIds) {
  const versionIds = [
    planIds.MASTER,
    planIds.ANNUAL_2026,
    planIds.ANNUAL_2027,
    planIds.ANNUAL_2028,
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

async function findDepartmentByName(queryInterface, sectorId, name) {
  const rows = await queryInterface.sequelize.query(
    `SELECT internal_structure_id, name
     FROM internal_structures
     WHERE government_structure_id = :sectorId AND name = :name
     LIMIT 1`,
    {
      replacements: { sectorId, name },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0] ?? null;
}

async function ensurePlanValidationPermissionGroup(
  queryInterface,
  {
    groupId,
    groupName,
    planningDeptName,
    parentSectorId,
  },
  now
) {
  const permissionId = await ensurePermission(
    queryInterface,
    { resource: "plan", action: "validate_approval", permission_tier: "standard" },
    now
  );

  const existingGroup = await queryInterface.sequelize.query(
    `SELECT permission_group_id FROM permission_groups
     WHERE permission_group_id = :id OR name = :name
     LIMIT 1`,
    {
      replacements: { id: groupId, name: groupName },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  let resolvedGroupId = existingGroup[0]?.permission_group_id ?? groupId;

  if (existingGroup.length === 0) {
    await queryInterface.bulkInsert("permission_groups", [
      {
        permission_group_id: resolvedGroupId,
        name: groupName,
        description:
          "Department-linked group granting plan achievement validation approval for the planning office.",
        group_kind: "special",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  } else {
    await queryInterface.sequelize.query(
      `UPDATE permission_groups
       SET group_kind = 'special',
           description = :description,
           is_active = true,
           updated_at = :now
       WHERE permission_group_id = :id`,
      {
        replacements: {
          id: resolvedGroupId,
          now,
          description:
            "Department-linked group granting plan achievement validation approval for the planning office.",
        },
      }
    );
  }

  const existingLink = await queryInterface.sequelize.query(
    `SELECT permission_group_id FROM permission_group_permissions
     WHERE permission_group_id = :groupId AND permission_id = :permissionId
     LIMIT 1`,
    {
      replacements: { groupId: resolvedGroupId, permissionId },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  if (existingLink.length === 0) {
    await queryInterface.bulkInsert("permission_group_permissions", [
      {
        permission_group_id: resolvedGroupId,
        permission_id: permissionId,
        created_at: now,
      },
    ]);
  }

  const planningDept = await findDepartmentByName(
    queryInterface,
    parentSectorId,
    planningDeptName
  );

  if (!planningDept) {
    throw new Error(
      `Planning validation department "${planningDeptName}" not found in sector ${parentSectorId}.`
    );
  }

  const existingDeptLink = await queryInterface.sequelize.query(
    `SELECT id
     FROM internal_structure_permission_groups
     WHERE internal_structure_id = :deptId AND permission_group_id = :groupId
     LIMIT 1`,
    {
      replacements: {
        deptId: planningDept.internal_structure_id,
        groupId: resolvedGroupId,
      },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  if (existingDeptLink.length === 0) {
    await queryInterface.bulkInsert("internal_structure_permission_groups", [
      {
        id: uuidv4(),
        internal_structure_id: planningDept.internal_structure_id,
        permission_group_id: resolvedGroupId,
      },
    ]);
  }

  return {
    groupId: resolvedGroupId,
    planningDeptId: planningDept.internal_structure_id,
    permissionId,
  };
}

module.exports = {
  planNodeId,
  distributeWeights,
  node,
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
  findDepartmentByName,
  ensurePlanValidationPermissionGroup,
};
