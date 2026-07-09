"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  loadUsersByDepartment,
  findDepartmentByName,
  removeExistingPlan,
  copyAssignments,
} = require("./comprehensivePlanSeederUtils");

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
    contribution_weight: opts.contributionWeight ?? null,
    target_unit: opts.targetUnit ?? null,
    level,
    order,
    is_active: true,
    assignment_sharing_mode: opts.sharingMode ?? "exclusive",
    annual_target: opts.annualTarget ?? null,
  };
}

function distributeAnnualTargetsSkewed(draftWeight, ratios) {
  if (draftWeight <= 0 || ratios.length === 0) return [];
  const targets = ratios.map(
    (ratio) => Math.round(draftWeight * ratio * 1000) / 1000
  );
  const sum = targets.reduce((total, value) => total + value, 0);
  const diff = Math.round((draftWeight - sum) * 1000) / 1000;
  if (Math.abs(diff) > 0.0001) {
    targets[targets.length - 1] =
      Math.round((targets[targets.length - 1] + diff) * 1000) / 1000;
  }
  return targets;
}

function buildSkewedAnnualTargetMaps(masterNodes, ratios) {
  const maps = ratios.map(() => ({}));

  for (const masterNode of masterNodes) {
    const draftWeight = Number(masterNode.weight) || 0;
    if (draftWeight <= 0) continue;

    const yearlyTargets = distributeAnnualTargetsSkewed(draftWeight, ratios);
    for (let yearIndex = 0; yearIndex < ratios.length; yearIndex++) {
      maps[yearIndex][masterNode.plan_node_id] = yearlyTargets[yearIndex];
    }
  }

  return maps;
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
      contribution_weight: source.contribution_weight,
      target_unit: source.target_unit,
      level: source.level,
      order: source.order,
      is_active: source.is_active,
      assignment_sharing_mode: source.assignment_sharing_mode,
      annual_target: annualTargetBySourceId[source.plan_node_id] ?? null,
    });
  }

  return { annualNodes, nodeIdMap };
}

async function resolveDepartment(queryInterface, sectorId, name) {
  const dept = await findDepartmentByName(queryInterface, sectorId, name);
  if (!dept) {
    throw new Error(`Department "${name}" not found in sector ${sectorId}. Run seed:organogram first.`);
  }
  return dept;
}

function resolveUsers(usersByDept, deptId, label) {
  const bucket = usersByDept.get(deptId) ?? {};
  if (!bucket.head) {
    throw new Error(`Head user missing for ${label}. Run seed:organogram first.`);
  }
  if (!bucket.officer) {
    throw new Error(`Officer user missing for ${label}. Run seed:organogram first.`);
  }
  return bucket;
}

async function buildResolvedTree(queryInterface, sectorId, planTree, usersByDept) {
  const strategicDept = await resolveDepartment(
    queryInterface,
    sectorId,
    planTree.strategic.departmentName
  );
  const strategicUsers = resolveUsers(
    usersByDept,
    strategicDept.internal_structure_id,
    planTree.strategic.departmentName
  );

  const goals = [];
  for (const goalSpec of planTree.goals) {
    const goalDept = await resolveDepartment(queryInterface, sectorId, goalSpec.departmentName);
    const goalUsers = resolveUsers(usersByDept, goalDept.internal_structure_id, goalSpec.title);

    const kpis = [];
    for (const kpiSpec of goalSpec.kpis) {
      const kpiDept = await resolveDepartment(queryInterface, sectorId, kpiSpec.departmentName);
      const kpiUsers = resolveUsers(usersByDept, kpiDept.internal_structure_id, kpiSpec.title);

      const tasks = [];
      for (const taskSpec of kpiSpec.tasks) {
        const taskDept = await resolveDepartment(queryInterface, sectorId, taskSpec.departmentName);
        const taskUsers = resolveUsers(usersByDept, taskDept.internal_structure_id, taskSpec.title);
        tasks.push({
          ...taskSpec,
          deptId: taskDept.internal_structure_id,
          officerUserId: taskUsers.officer,
        });
      }

      kpis.push({
        ...kpiSpec,
        deptId: kpiDept.internal_structure_id,
        headUserId: kpiUsers.head,
        tasks,
      });
    }

    goals.push({
      ...goalSpec,
      deptId: goalDept.internal_structure_id,
      headUserId: goalUsers.head,
      kpis,
    });
  }

  return {
    strategic: {
      ...planTree.strategic,
      deptId: strategicDept.internal_structure_id,
      headUserId: strategicUsers.head,
    },
    goals,
  };
}

function buildMasterNodes(planVersionId, resolvedTree) {
  const nodes = [];
  const { strategic, goals } = resolvedTree;

  nodes.push(
    node(
      strategic.id,
      planVersionId,
      null,
      "strategic",
      strategic.title,
      "Strategic focus for mineral resources development.",
      strategic.weight,
      1,
      1
    )
  );

  let goalOrder = 1;
  for (const goal of goals) {
    nodes.push(
      node(
        goal.id,
        planVersionId,
        strategic.id,
        "goal",
        goal.title,
        `Goal: ${goal.title}`,
        goal.weight,
        2,
        goalOrder++
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
          `KPI: ${kpi.title}`,
          kpi.weight,
          3,
          kpiOrder++
        )
      );

      let taskOrder = 1;
      for (const task of kpi.tasks) {
        nodes.push(
          node(
            task.id,
            planVersionId,
            kpi.id,
            "task",
            task.title,
            `Task: ${task.title}`,
            task.weight,
            4,
            taskOrder++,
            { contributionWeight: task.contributionWeight }
          )
        );
      }
    }
  }

  return nodes;
}

function buildAssignments(resolvedTree, sectorId, actionMap) {
  const external = [];
  const internal = [];

  external.push({
    external_assignment_id: uuidv4(),
    plan_node_id: resolvedTree.strategic.id,
    government_structure_id: sectorId,
    is_visible: true,
    requires_report: true,
    is_active: true,
  });

  internal.push({
    internal_assignment_id: uuidv4(),
    plan_node_id: resolvedTree.strategic.id,
    internal_structure_id: resolvedTree.strategic.deptId,
    user_id: resolvedTree.strategic.headUserId,
    action_id: actionMap.APPROVAL,
    is_active: true,
  });

  for (const goal of resolvedTree.goals) {
    internal.push({
      internal_assignment_id: uuidv4(),
      plan_node_id: goal.id,
      internal_structure_id: goal.deptId,
      user_id: goal.headUserId,
      action_id: actionMap.APPROVAL,
      is_active: true,
    });

    for (const kpi of goal.kpis) {
      internal.push({
        internal_assignment_id: uuidv4(),
        plan_node_id: kpi.id,
        internal_structure_id: kpi.deptId,
        user_id: kpi.headUserId,
        action_id: actionMap.APPROVAL,
        is_active: true,
      });

      for (const task of kpi.tasks) {
        internal.push({
          internal_assignment_id: uuidv4(),
          plan_node_id: task.id,
          internal_structure_id: task.deptId,
          user_id: task.officerUserId,
          action_id: actionMap.EXECUTION,
          is_active: true,
        });
      }
    }
  }

  return { external, internal };
}

module.exports = {
  node,
  buildSkewedAnnualTargetMaps,
  copyNodesToAnnual,
  buildResolvedTree,
  buildMasterNodes,
  buildAssignments,
  removeExistingPlan,
  copyAssignments,
};
