"use strict";

const { v4: uuidv4 } = require("uuid");
const { ALL_EXECUTION_PERIOD_VERSION_IDS } = require("../data/weightRollupOrganogramPlan.data");
const {
  loadUsersByDepartment,
  findDepartmentByName,
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
    period_target: opts.periodTarget ?? null,
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

function distributeQuarterlyPeriodTargets(annualTarget) {
  const value = Number(annualTarget) || 0;
  if (value <= 0) return [0, 0, 0, 0];

  const quarter = Math.round((value / 4) * 1000) / 1000;
  const targets = [quarter, quarter, quarter, quarter];
  const sum = targets.reduce((total, item) => total + item, 0);
  const diff = Math.round((value - sum) * 1000) / 1000;
  if (Math.abs(diff) > 0.0001) {
    targets[3] = Math.round((targets[3] + diff) * 1000) / 1000;
  }
  return targets;
}

function buildQuarterlyPeriodTargetMaps(annualNodes) {
  const maps = [{}, {}, {}, {}];

  for (const annualNode of annualNodes) {
    const annualTarget = Number(annualNode.annual_target) || 0;
    if (annualTarget <= 0) continue;

    const quarterlyTargets = distributeQuarterlyPeriodTargets(annualTarget);
    for (let quarterIndex = 0; quarterIndex < 4; quarterIndex++) {
      maps[quarterIndex][annualNode.plan_node_id] = quarterlyTargets[quarterIndex];
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

function copyNodesToPeriod(annualNodes, periodVersionId, periodTargetByAnnualNodeId = {}) {
  const nodeIdMap = new Map();
  const periodNodes = [];

  for (const source of annualNodes) {
    nodeIdMap.set(source.plan_node_id, uuidv4());
  }

  for (const source of annualNodes) {
    periodNodes.push({
      plan_node_id: nodeIdMap.get(source.plan_node_id),
      plan_version_id: periodVersionId,
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
      annual_target: source.annual_target,
      period_target: periodTargetByAnnualNodeId[source.plan_node_id] ?? null,
    });
  }

  return { periodNodes, nodeIdMap };
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

async function resolveGoalBranch(queryInterface, sectorId, goalSpec, usersByDept) {
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

  return {
    ...goalSpec,
    deptId: goalDept.internal_structure_id,
    headUserId: goalUsers.head,
    kpis,
  };
}

async function buildResolvedTree(queryInterface, sectorId, planTree, usersByDept) {
  const strategicAreas = [];

  for (const area of planTree.strategicAreas) {
    const strategicDept = await resolveDepartment(
      queryInterface,
      sectorId,
      area.strategic.departmentName
    );
    const strategicUsers = resolveUsers(
      usersByDept,
      strategicDept.internal_structure_id,
      area.strategic.departmentName
    );

    const goals = [];
    for (const goalSpec of area.goals) {
      goals.push(await resolveGoalBranch(queryInterface, sectorId, goalSpec, usersByDept));
    }

    strategicAreas.push({
      strategic: {
        ...area.strategic,
        deptId: strategicDept.internal_structure_id,
        headUserId: strategicUsers.head,
      },
      goals,
    });
  }

  return { strategicAreas };
}

function buildMasterNodes(planVersionId, resolvedTree) {
  const nodes = [];
  let strategicOrder = 1;

  for (const area of resolvedTree.strategicAreas) {
    const { strategic, goals } = area;

    nodes.push(
      node(
        strategic.id,
        planVersionId,
        null,
        "strategic",
        strategic.title,
        `Strategic focus: ${strategic.title}`,
        strategic.weight,
        1,
        strategicOrder++
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
          goalOrder++,
          {
            weightMode: goal.weightMode,
            targetUnit: goal.targetUnit,
            contributionWeight: goal.contributionWeight,
          }
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
            kpiOrder++,
            {
              weightMode: kpi.weightMode,
              targetUnit: kpi.targetUnit,
            }
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
              {
                weightMode: task.weightMode,
                targetUnit: task.targetUnit,
                contributionWeight: task.contributionWeight,
              }
            )
          );
        }
      }
    }
  }

  return nodes;
}

function buildAssignments(resolvedTree, sectorId, actionMap) {
  const external = [];
  const internal = [];

  for (const area of resolvedTree.strategicAreas) {
    const { strategic, goals } = area;

    external.push({
      external_assignment_id: uuidv4(),
      plan_node_id: strategic.id,
      government_structure_id: sectorId,
      is_visible: true,
      requires_report: true,
      is_active: true,
    });

    internal.push({
      internal_assignment_id: uuidv4(),
      plan_node_id: strategic.id,
      user_id: strategic.headUserId,
      action_id: actionMap.APPROVAL,
      is_active: true,
    });

    for (const goal of goals) {
      internal.push({
        internal_assignment_id: uuidv4(),
        plan_node_id: goal.id,
        user_id: goal.headUserId,
        action_id: actionMap.APPROVAL,
        is_active: true,
      });

      for (const kpi of goal.kpis) {
        internal.push({
          internal_assignment_id: uuidv4(),
          plan_node_id: kpi.id,
          user_id: kpi.headUserId,
          action_id: actionMap.APPROVAL,
          is_active: true,
        });

        for (const task of kpi.tasks) {
          internal.push({
            internal_assignment_id: uuidv4(),
            plan_node_id: task.id,
            user_id: task.officerUserId,
            action_id: actionMap.EXECUTION,
            is_active: true,
          });
        }
      }
    }
  }

  return { external, internal };
}

async function seedOwnedPlanRuleSnapshot(
  queryInterface,
  {
    masterVersionId,
    snapshotRuleId,
    sourceRuleId,
    ruleName,
    steps,
    now,
  }
) {
  await queryInterface.bulkInsert("plan_rules", [
    {
      plan_rule_id: snapshotRuleId,
      name: ruleName,
      government_structure_id: null,
      is_active: true,
      owned_by_plan_version_id: masterVersionId,
      source_plan_rule_id: sourceRuleId,
      created_at: now,
      updated_at: now,
    },
  ]);

  await queryInterface.bulkInsert(
    "plan_rule_steps",
    steps.map((step) => ({
      ...step,
      plan_rule_id: snapshotRuleId,
      created_at: now,
      updated_at: now,
    }))
  );
}

async function removeExistingPlan(queryInterface, planIds, planningConfigId = null) {
  const versionIds = [
    planIds.MASTER,
    planIds.ANNUAL_2026,
    planIds.ANNUAL_2027,
    planIds.ANNUAL_2028,
    ...ALL_EXECUTION_PERIOD_VERSION_IDS,
  ].filter(Boolean);

  const ownedRules = await queryInterface.sequelize.query(
    `SELECT plan_rule_id FROM plan_rules WHERE owned_by_plan_version_id = :masterId`,
    {
      replacements: { masterId: planIds.MASTER },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );

  for (const ownedRule of ownedRules) {
    await queryInterface.bulkDelete("plan_rule_steps", {
      plan_rule_id: ownedRule.plan_rule_id,
    });
    await queryInterface.bulkDelete("plan_rules", {
      plan_rule_id: ownedRule.plan_rule_id,
    });
  }

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

  if (planningConfigId) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));
    if (tableNames.includes("planning_configurations")) {
      await queryInterface.bulkDelete("planning_configurations", {
        planning_configuration_id: planningConfigId,
      });
    }
  }
}

module.exports = {
  node,
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
};
