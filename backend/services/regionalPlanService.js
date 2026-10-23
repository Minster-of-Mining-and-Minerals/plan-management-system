"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
  RegionalPlanVersion,
  RegionalPlanNode,
  RegionalPlanningConfiguration,
  RegionalPlanRule,
  RegionalPlanRuleStep,
  RegionalInternalAssignment,
  RegionalPlanNodeActionLog,
  RegionalStructure,
  Region,
  User,
  sequelize,
} = require("../models");

const {
  computePerformanceMetrics,
  resolvePerformanceScoringPolicyFromRule,
} = require("../utils/planPerformanceScoringUtils");

const {
  ACHIEVEMENT_STATUS,
  canTransitionAchievementStatus,
  canEditAchievementValue,
} = require("../utils/planAchievementWorkflowUtils");

// -------------------------------------------------------------
// Helper: Default Regional Configuration & Rule Initializer
// -------------------------------------------------------------

async function ensureDefaultRegionalPlanningConfig(regionId, transaction) {
  let config = await RegionalPlanningConfiguration.findOne({
    where: { region_id: regionId },
    transaction,
  });

  if (!config) {
    config = await RegionalPlanningConfiguration.create(
      {
        regional_planning_config_id: uuidv4(),
        region_id: regionId,
        min_duration_years: 1,
        max_duration_years: 10,
        draft_entity_label_singular: "Regional Strategic Plan Draft",
        draft_entity_label_plural: "Regional Strategic Plan Drafts",
        create_action_label: "Create Regional Plan",
        planning_period_label: "Regional Planning Cycle",
        duration_label: "Cycle Duration",
        start_year_label: "Start Year",
        end_year_label: "End Year",
        target_units: ["ETB", "USD", "Tons", "Kilograms", "Units", "Percentage", "Count", "Sites"],
        breakdown_mode: "quarterly",
        custom_periods: [],
      },
      { transaction }
    );
  }
  return config;
}

async function ensureDefaultRegionalPlanRule(regionId, transaction) {
  let rule = await RegionalPlanRule.findOne({
    where: { region_id: regionId, is_active: true },
    include: [{ association: "steps" }],
    order: [["created_at", "ASC"]],
    transaction,
  });

  if (!rule) {
    const ruleId = uuidv4();
    rule = await RegionalPlanRule.create(
      {
        regional_plan_rule_id: ruleId,
        region_id: regionId,
        name: "Standard Regional 4-Level Planning Rule",
        is_active: true,
        performance_scoring_policy: "CAP_100",
      },
      { transaction }
    );

    const defaultSteps = [
      { level: 1, name: "Strategic Priority", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
      { level: 2, name: "Regional Goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
      { level: 3, name: "Key Performance Indicator (KPI)", requires_weight: true, requires_contribution_weight: true, allow_kpi: true },
      { level: 4, name: "Operational Activity / Task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true },
    ];

    for (const step of defaultSteps) {
      await RegionalPlanRuleStep.create(
        {
          regional_plan_rule_step_id: uuidv4(),
          regional_plan_rule_id: ruleId,
          ...step,
        },
        { transaction }
      );
    }

    rule = await RegionalPlanRule.findByPk(ruleId, {
      include: [{ association: "steps" }],
      transaction,
    });
  }

  return rule;
}

// -------------------------------------------------------------
// Helper: Resolve Period Labels
// -------------------------------------------------------------

function resolvePeriodLabelsForMode(mode, customPeriods = []) {
  if (mode === "monthly") {
    return Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
  }
  if (mode === "semi_annual") {
    return ["First Half (H1)", "Second Half (H2)"];
  }
  if (mode === "custom" && Array.isArray(customPeriods) && customPeriods.length > 0) {
    return customPeriods.map((p) => p.label || String(p));
  }
  // Default quarterly
  return ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
}

// -------------------------------------------------------------
// 1. Regional Planning Configuration & Rules Service
// -------------------------------------------------------------

async function getEffectiveRegionalPlanningConfig(regionId) {
  return ensureDefaultRegionalPlanningConfig(regionId);
}

async function updateRegionalPlanningConfig(regionId, payload) {
  const config = await ensureDefaultRegionalPlanningConfig(regionId);
  const allowed = [
    "min_duration_years",
    "max_duration_years",
    "draft_entity_label_singular",
    "draft_entity_label_plural",
    "create_action_label",
    "planning_period_label",
    "duration_label",
    "start_year_label",
    "end_year_label",
    "target_units",
    "breakdown_mode",
    "custom_periods",
  ];

  const updates = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) updates[key] = payload[key];
  }

  await config.update(updates);
  return config;
}

async function listRegionalPlanRules(regionId) {
  await ensureDefaultRegionalPlanRule(regionId);
  return RegionalPlanRule.findAll({
    where: { region_id: regionId },
    include: [{ association: "steps" }],
    order: [["created_at", "ASC"]],
  });
}

async function getRegionalPlanRuleById(ruleId, regionId) {
  return RegionalPlanRule.findOne({
    where: { regional_plan_rule_id: ruleId, region_id: regionId },
    include: [{ association: "steps" }],
  });
}

async function createRegionalPlanRule(regionId, payload) {
  const t = await sequelize.transaction();
  try {
    const ruleId = uuidv4();
    const rule = await RegionalPlanRule.create(
      {
        regional_plan_rule_id: ruleId,
        region_id: regionId,
        name: payload.name || "Custom Regional Plan Rule",
        is_active: payload.is_active !== undefined ? payload.is_active : true,
        performance_scoring_policy: payload.performance_scoring_policy || "CAP_100",
      },
      { transaction: t }
    );

    if (Array.isArray(payload.steps)) {
      for (const step of payload.steps) {
        await RegionalPlanRuleStep.create(
          {
            regional_plan_rule_step_id: uuidv4(),
            regional_plan_rule_id: ruleId,
            level: step.level,
            name: step.name,
            requires_weight: !!step.requires_weight,
            requires_contribution_weight: !!step.requires_contribution_weight,
            allow_kpi: !!step.allow_kpi,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return getRegionalPlanRuleById(ruleId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateRegionalPlanRule(ruleId, regionId, payload) {
  const rule = await RegionalPlanRule.findOne({
    where: { regional_plan_rule_id: ruleId, region_id: regionId },
  });
  if (!rule) throw new Error("Regional plan rule not found");

  const t = await sequelize.transaction();
  try {
    if (payload.name) rule.name = payload.name;
    if (payload.is_active !== undefined) rule.is_active = payload.is_active;
    if (payload.performance_scoring_policy) {
      rule.performance_scoring_policy = payload.performance_scoring_policy;
    }
    await rule.save({ transaction: t });

    if (Array.isArray(payload.steps)) {
      await RegionalPlanRuleStep.destroy({
        where: { regional_plan_rule_id: ruleId },
        transaction: t,
      });
      for (const step of payload.steps) {
        await RegionalPlanRuleStep.create(
          {
            regional_plan_rule_step_id: uuidv4(),
            regional_plan_rule_id: ruleId,
            level: step.level,
            name: step.name,
            requires_weight: !!step.requires_weight,
            requires_contribution_weight: !!step.requires_contribution_weight,
            allow_kpi: !!step.allow_kpi,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return getRegionalPlanRuleById(ruleId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function deleteRegionalPlanRule(ruleId, regionId) {
  const rule = await RegionalPlanRule.findOne({
    where: { regional_plan_rule_id: ruleId, region_id: regionId },
  });
  if (!rule) throw new Error("Regional plan rule not found");
  await rule.destroy();
  return { success: true };
}

// -------------------------------------------------------------
// 2. Master Plan Version Management
// -------------------------------------------------------------

async function createRegionalPlanDraft(regionId, payload, userId) {
  const t = await sequelize.transaction();
  try {
    const config = await ensureDefaultRegionalPlanningConfig(regionId, t);
    const rule = await ensureDefaultRegionalPlanRule(regionId, t);

    const startYear = parseInt(payload.start_year, 10);
    const duration = parseInt(payload.planning_duration_years || 5, 10);
    const endYear = startYear + duration - 1;

    const count = await RegionalPlanVersion.count({
      where: { region_id: regionId, version_kind: "master" },
      transaction: t,
    });

    const newVersion = await RegionalPlanVersion.create(
      {
        regional_plan_version_id: uuidv4(),
        region_id: regionId,
        parent_plan_version_id: null,
        based_on_version_id: null,
        regional_plan_rule_id: payload.regional_plan_rule_id || rule.regional_plan_rule_id,
        regional_planning_config_id: config.regional_planning_config_id,
        draft_name: payload.draft_name || `Regional Strategic Plan (${startYear} - ${endYear})`,
        version_kind: "master",
        status: "draft",
        version_number: count + 1,
        planning_year: startYear,
        sequence_index: 1,
        start_year: startYear,
        end_year: endYear,
        start_month: parseInt(payload.start_month || 1, 10),
        end_month: parseInt(payload.end_month || 12, 10),
        planning_duration_years: duration,
        is_locked: false,
      },
      { transaction: t }
    );

    await t.commit();
    return getRegionalPlanVersionById(newVersion.regional_plan_version_id, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function listRegionalPlanVersions(regionId, filters = {}) {
  const where = { region_id: regionId };
  if (filters.version_kind) where.version_kind = filters.version_kind;
  if (filters.status) where.status = filters.status;
  if (filters.parent_plan_version_id !== undefined) {
    where.parent_plan_version_id = filters.parent_plan_version_id;
  }

  return RegionalPlanVersion.findAll({
    where,
    order: [["created_at", "DESC"]],
    include: [
      { association: "planRule" },
      { association: "annualVersions" },
    ],
  });
}

async function getRegionalPlanVersionById(versionId, regionId) {
  const where = { regional_plan_version_id: versionId };
  if (regionId) where.region_id = regionId;

  const version = await RegionalPlanVersion.findOne({
    where,
    include: [
      { association: "planRule", include: [{ association: "steps" }] },
      { association: "planningConfiguration" },
      {
        association: "annualVersions",
        include: [{ association: "executionPeriodVersions" }],
      },
      { association: "executionPeriodVersions" },
      { association: "parentPlanVersion" },
    ],
  });

  if (!version) {
    const error = new Error("Regional plan version not found");
    error.status = 404;
    throw error;
  }

  return version;
}

async function updateRegionalPlanVersion(versionId, regionId, payload) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (version.status !== "draft" && !payload.force) {
    throw new Error("Cannot update a finalized or locked plan version");
  }

  const allowed = [
    "draft_name",
    "start_year",
    "end_year",
    "start_month",
    "end_month",
    "planning_duration_years",
    "regional_plan_rule_id",
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) version[key] = payload[key];
  }

  await version.save();
  return getRegionalPlanVersionById(versionId, regionId);
}

async function deleteRegionalPlanVersion(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  await version.destroy();
  return { success: true };
}

// -------------------------------------------------------------
// 3. Plan Node Hierarchy & Tree Rollup
// -------------------------------------------------------------

async function cloneRegionalNodes(sourceVersionId, targetVersionId, transaction, options = {}) {
  const sourceNodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: sourceVersionId, is_active: true },
    order: [["level", "ASC"], ["order", "ASC"]],
    transaction,
  });

  const nodeIdMap = new Map();

  for (const src of sourceNodes) {
    const newNodeId = uuidv4();
    nodeIdMap.set(src.regional_plan_node_id, newNodeId);

    await RegionalPlanNode.create(
      {
        regional_plan_node_id: newNodeId,
        regional_plan_version_id: targetVersionId,
        parent_id: null,
        source_regional_plan_node_id: src.source_regional_plan_node_id || src.regional_plan_node_id,
        type: src.type,
        title: src.title,
        description: src.description,
        weight: src.weight,
        weight_mode: src.weight_mode,
        contribution_weight: src.contribution_weight,
        target_unit: src.target_unit,
        target_allocation_mode: src.target_allocation_mode,
        achievement_mode: src.achievement_mode,
        level: src.level,
        order: src.order,
        is_active: src.is_active,
        assignment_sharing_mode: src.assignment_sharing_mode,
        annual_target: options.preserveAnnualTargets ? src.annual_target : null,
        period_target: options.preservePeriodTargets ? src.period_target : null,
      },
      { transaction }
    );
  }

  // Update parent pointers
  for (const src of sourceNodes) {
    if (src.parent_id && nodeIdMap.has(src.parent_id)) {
      const newChildId = nodeIdMap.get(src.regional_plan_node_id);
      const newParentId = nodeIdMap.get(src.parent_id);
      await RegionalPlanNode.update(
        { parent_id: newParentId },
        { where: { regional_plan_node_id: newChildId }, transaction }
      );
    }
  }

  // Copy internal assignments
  const sourceAssignments = await RegionalInternalAssignment.findAll({
    where: {
      regional_plan_node_id: sourceNodes.map((n) => n.regional_plan_node_id),
      is_active: true,
    },
    transaction,
  });

  for (const assign of sourceAssignments) {
    const mappedNodeId = nodeIdMap.get(assign.regional_plan_node_id);
    if (mappedNodeId) {
      await RegionalInternalAssignment.create(
        {
          regional_internal_assignment_id: uuidv4(),
          regional_plan_node_id: mappedNodeId,
          regional_structure_id: assign.regional_structure_id,
          assigned_user_id: assign.assigned_user_id,
          is_active: true,
        },
        { transaction }
      );
    }
  }

  return nodeIdMap;
}

async function duplicateRegionalPlanDraft(sourceVersionId, regionId, payload, userId) {
  const sourceMaster = await getRegionalPlanVersionById(sourceVersionId, regionId);
  if (sourceMaster.version_kind !== "master") {
    throw new Error("Only master drafts can be duplicated");
  }

  const t = await sequelize.transaction();
  try {
    const count = await RegionalPlanVersion.count({
      where: { region_id: regionId, version_kind: "master" },
      transaction: t,
    });

    const newDraftName = payload.draft_name || `Copy of ${sourceMaster.draft_name}`;

    const newVersion = await RegionalPlanVersion.create(
      {
        regional_plan_version_id: uuidv4(),
        region_id: regionId,
        parent_plan_version_id: null,
        based_on_version_id: null,
        regional_plan_rule_id: sourceMaster.regional_plan_rule_id,
        regional_planning_config_id: sourceMaster.regional_planning_config_id,
        draft_name: newDraftName,
        version_kind: "master",
        status: "draft",
        version_number: count + 1,
        planning_year: sourceMaster.planning_year,
        sequence_index: 1,
        start_year: sourceMaster.start_year,
        end_year: sourceMaster.end_year,
        start_month: sourceMaster.start_month,
        end_month: sourceMaster.end_month,
        planning_duration_years: sourceMaster.planning_duration_years,
        is_locked: false,
      },
      { transaction: t }
    );

    await cloneRegionalNodes(sourceMaster.regional_plan_version_id, newVersion.regional_plan_version_id, t, {
      preserveAnnualTargets: true,
      preservePeriodTargets: true,
    });

    await t.commit();
    return getRegionalPlanVersionById(newVersion.regional_plan_version_id, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// -------------------------------------------------------------
// Pure Recursive Calculation Engine for Regional Tree
// -------------------------------------------------------------

function computeRegionalTreeRollup(rawNodes, rule) {
  const policy = resolvePerformanceScoringPolicyFromRule(rule);

  // Map nodes by id and parent
  const nodes = rawNodes.map((n) => (n.toJSON ? n.toJSON() : n));
  const nodeMap = new Map(nodes.map((n) => [n.regional_plan_node_id, n]));
  const childrenMap = new Map();

  for (const n of nodes) {
    if (n.parent_id) {
      if (!childrenMap.has(n.parent_id)) childrenMap.set(n.parent_id, []);
      childrenMap.get(n.parent_id).push(n);
    }
  }

  const metricsMemo = new Map();

  function evaluateNode(node) {
    if (metricsMemo.has(node.regional_plan_node_id)) {
      return metricsMemo.get(node.regional_plan_node_id);
    }

    const children = childrenMap.get(node.regional_plan_node_id) || [];
    let progressPercent = 0;
    let computedActual = null;
    let computedTarget = null;
    let hasData = false;

    if (children.length === 0) {
      // Leaf Node evaluation
      const target = Number(node.period_target ?? node.annual_target ?? node.weight) || 0;
      const actual = node.period_actual !== null && node.period_actual !== undefined
        ? Number(node.period_actual)
        : (node.annual_actual !== null && node.annual_actual !== undefined ? Number(node.annual_actual) : null);

      computedTarget = target;
      computedActual = actual;

      if (target > 0 && actual !== null) {
        hasData = true;
        const scored = computePerformanceMetrics(target, actual, policy);
        progressPercent = scored.performance_percentage ?? 0;
      }
    } else {
      // Parent Node evaluation: recursively evaluate all children
      const childMetrics = children.map((c) => evaluateNode(c));
      const evaluableChildren = [];

      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const m = childMetrics[i];
        if (m.hasData || m.computedTarget > 0) {
          evaluableChildren.push({ child: c, metrics: m });
        }
      }

      if (evaluableChildren.length > 0) {
        hasData = true;
        const totalWeight = evaluableChildren.reduce(
          (sum, item) => sum + (Number(item.child.contribution_weight) || 0),
          0
        );

        if (totalWeight > 0) {
          // Weighted rollup
          const weightedSum = evaluableChildren.reduce(
            (sum, item) =>
              sum + item.metrics.progressPercent * (Number(item.child.contribution_weight) || 0),
            0
          );
          progressPercent = Math.round(weightedSum / totalWeight);
        } else {
          // Equal weight rollup
          const totalProgress = evaluableChildren.reduce(
            (sum, item) => sum + item.metrics.progressPercent,
            0
          );
          progressPercent = Math.round(totalProgress / evaluableChildren.length);
        }
      }
    }

    const result = {
      regional_plan_node_id: node.regional_plan_node_id,
      progressPercent,
      computedActual,
      computedTarget,
      hasData,
      status: progressPercent >= 100 ? "completed" : progressPercent > 0 ? "in_progress" : "not_started",
    };

    metricsMemo.set(node.regional_plan_node_id, result);
    return result;
  }

  // Evaluate all roots
  const roots = nodes.filter((n) => !n.parent_id || !nodeMap.has(n.parent_id));
  roots.forEach(evaluateNode);

  return { nodeMap, childrenMap, metricsMemo };
}

async function getRegionalPlanHierarchy(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);

  const nodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: versionId, is_active: true },
    order: [["level", "ASC"], ["order", "ASC"]],
    include: [
      {
        association: "internalAssignments",
        include: [{ association: "department" }, { association: "assignedUser", attributes: ["user_id", "full_name", "email"] }],
      },
      { association: "periodActualSubmittedBy", attributes: ["user_id", "full_name", "email"] },
      { association: "periodActualApprovedBy", attributes: ["user_id", "full_name", "email"] },
      { association: "periodActualValidatedBy", attributes: ["user_id", "full_name", "email"] },
    ],
  });

  const { metricsMemo } = computeRegionalTreeRollup(nodes, version.planRule);

  // Attach metrics to each node
  const nodesWithMetrics = nodes.map((node) => {
    const json = node.toJSON();
    const metrics = metricsMemo.get(node.regional_plan_node_id) || {
      progressPercent: 0,
      computedActual: null,
      computedTarget: null,
      status: "not_started",
    };
    json.execution_progress_percent = metrics.progressPercent;
    json.evaluation_status = metrics.status;
    return json;
  });

  return {
    version,
    nodes: nodesWithMetrics,
  };
}

async function createRegionalPlanNode(versionId, regionId, payload, userId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (version.status !== "draft" && !payload.force) {
    throw new Error("Cannot add nodes to a finalized or locked version");
  }

  const t = await sequelize.transaction();
  try {
    const parentId = payload.parent_id || null;
    let level = 1;

    if (parentId) {
      const parent = await RegionalPlanNode.findOne({
        where: { regional_plan_node_id: parentId, regional_plan_version_id: versionId },
        transaction: t,
      });
      if (!parent) throw new Error("Parent node not found");
      level = parent.level + 1;
    }

    const orderCount = await RegionalPlanNode.count({
      where: { regional_plan_version_id: versionId, parent_id: parentId },
      transaction: t,
    });

    const nodeId = uuidv4();
    const node = await RegionalPlanNode.create(
      {
        regional_plan_node_id: nodeId,
        regional_plan_version_id: versionId,
        parent_id: parentId,
        source_regional_plan_node_id: null,
        type: payload.type || (level === 1 ? "strategic" : level === 2 ? "goal" : level === 3 ? "kpi" : "task"),
        title: payload.title,
        description: payload.description || null,
        weight: Number(payload.weight) || 0,
        weight_mode: payload.weight_mode || "percentage",
        contribution_weight: payload.contribution_weight !== undefined ? Number(payload.contribution_weight) : null,
        target_unit: payload.target_unit || null,
        target_allocation_mode: payload.target_allocation_mode || "divisible",
        achievement_mode: payload.achievement_mode || "period",
        level,
        order: orderCount,
        is_active: true,
      },
      { transaction: t }
    );

    // Create assignment if provided
    if (payload.regional_structure_id) {
      await RegionalInternalAssignment.create(
        {
          regional_internal_assignment_id: uuidv4(),
          regional_plan_node_id: nodeId,
          regional_structure_id: payload.regional_structure_id,
          assigned_user_id: payload.assigned_user_id || null,
          is_active: true,
        },
        { transaction: t }
      );
    }

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: userId,
        action: "NODE_CREATED",
        new_values: { title: payload.title, weight: payload.weight },
      },
      { transaction: t }
    );

    await t.commit();
    return getRegionalPlanNodeById(nodeId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getRegionalPlanNodeById(nodeId, regionId) {
  const node = await RegionalPlanNode.findByPk(nodeId, {
    include: [
      {
        association: "planVersion",
        include: [{ association: "planRule" }],
      },
      { association: "parent" },
      { association: "children" },
      {
        association: "internalAssignments",
        include: [{ association: "department" }, { association: "assignedUser" }],
      },
      { association: "periodActualSubmittedBy" },
      { association: "periodActualApprovedBy" },
      { association: "periodActualValidatedBy" },
    ],
  });

  if (!node) {
    const error = new Error("Regional plan node not found");
    error.status = 404;
    throw error;
  }

  if (regionId && node.planVersion?.region_id !== regionId) {
    const error = new Error("Access denied: node belongs to a different region");
    error.status = 403;
    throw error;
  }

  return node;
}

async function updateRegionalPlanNode(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  const allowed = [
    "title",
    "description",
    "weight",
    "weight_mode",
    "contribution_weight",
    "target_unit",
    "target_allocation_mode",
    "achievement_mode",
    "annual_target",
    "period_target",
    "narration",
  ];

  const prev = {};
  const next = {};

  for (const key of allowed) {
    if (payload[key] !== undefined) {
      prev[key] = node[key];
      node[key] = payload[key];
      next[key] = payload[key];
    }
  }

  const t = await sequelize.transaction();
  try {
    await node.save({ transaction: t });

    // Update assignment if structure specified
    if (payload.regional_structure_id !== undefined) {
      await RegionalInternalAssignment.destroy({
        where: { regional_plan_node_id: nodeId },
        transaction: t,
      });

      if (payload.regional_structure_id) {
        await RegionalInternalAssignment.create(
          {
            regional_internal_assignment_id: uuidv4(),
            regional_plan_node_id: nodeId,
            regional_structure_id: payload.regional_structure_id,
            assigned_user_id: payload.assigned_user_id || null,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: userId,
        action: "NODE_UPDATED",
        previous_values: prev,
        new_values: next,
      },
      { transaction: t }
    );

    await t.commit();
    return getRegionalPlanNodeById(nodeId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function deleteRegionalPlanNode(nodeId, regionId, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  await node.destroy();
  return { success: true };
}

async function reorderRegionalPlanNodes(versionId, regionId, orderedNodeIds, userId) {
  await getRegionalPlanVersionById(versionId, regionId);

  const t = await sequelize.transaction();
  try {
    for (let index = 0; index < orderedNodeIds.length; index++) {
      const id = orderedNodeIds[index];
      await RegionalPlanNode.update(
        { order: index },
        { where: { regional_plan_node_id: id, regional_plan_version_id: versionId }, transaction: t }
      );
    }
    await t.commit();
    return { success: true };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// -------------------------------------------------------------
// 4. Draft Finalization, Start Process & Reopening
// -------------------------------------------------------------

async function getRegionalDraftFinalizationReadiness(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  const errors = [];

  if (version.version_kind !== "master") {
    errors.push("Only master plan drafts can be finalized.");
  }
  if (version.status !== "draft") {
    errors.push("Plan draft is already finalized or locked.");
  }

  const nodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: versionId, is_active: true },
    include: [{ association: "internalAssignments" }],
  });

  if (nodes.length === 0) {
    errors.push("Plan hierarchy is empty. Add at least one strategic priority or goal.");
  }

  // Check contribution weights under parents
  const childrenByParent = new Map();
  for (const n of nodes) {
    if (n.parent_id) {
      if (!childrenByParent.has(n.parent_id)) childrenByParent.set(n.parent_id, []);
      childrenByParent.get(n.parent_id).push(n);
    }
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const parentNode = nodes.find((n) => n.regional_plan_node_id === parentId);
    const parentTitle = parentNode ? parentNode.title : "Parent";
    const sum = children.reduce((acc, c) => acc + (Number(c.contribution_weight) || 0), 0);
    if (children.some((c) => c.contribution_weight !== null) && Math.abs(sum - 100) > 0.01) {
      errors.push(`Children of "${parentTitle}" have contribution weights summing to ${sum}% (must equal 100%).`);
    }
  }

  const planningYears = [];
  for (let y = version.start_year; y <= version.end_year; y++) {
    planningYears.push(y);
  }

  return {
    ready: errors.length === 0,
    errors,
    planning_years: planningYears,
  };
}

async function finalizeRegionalPlanDraft(versionId, regionId, userId) {
  const readiness = await getRegionalDraftFinalizationReadiness(versionId, regionId);
  if (!readiness.ready) {
    const error = new Error(`Cannot finalize draft: ${readiness.errors.join("; ")}`);
    error.status = 400;
    throw error;
  }

  const version = await getRegionalPlanVersionById(versionId, regionId);
  const t = await sequelize.transaction();
  try {
    const now = new Date();
    await version.update(
      {
        status: "finalized",
        finalized_at: now,
      },
      { transaction: t }
    );

    // Auto-generate Annual Versions for each planning year
    const duration = version.planning_duration_years;
    const annualVersions = [];

    for (let i = 0; i < duration; i++) {
      const year = version.start_year + i;
      const sequence = i + 1;

      const annualVersion = await RegionalPlanVersion.create(
        {
          regional_plan_version_id: uuidv4(),
          region_id: regionId,
          parent_plan_version_id: version.regional_plan_version_id,
          regional_plan_rule_id: version.regional_plan_rule_id,
          regional_planning_config_id: version.regional_planning_config_id,
          draft_name: `${version.draft_name} — Year ${sequence} (${year})`,
          version_kind: "annual",
          status: "draft",
          version_number: sequence,
          planning_year: year,
          sequence_index: sequence,
          start_year: year,
          end_year: year,
          start_month: version.start_month,
          end_month: version.end_month,
          planning_duration_years: 1,
          is_locked: false,
        },
        { transaction: t }
      );

      // Clone nodes from master to annual version
      await cloneRegionalNodes(version.regional_plan_version_id, annualVersion.regional_plan_version_id, t, {
        preserveAnnualTargets: false,
        preservePeriodTargets: false,
      });

      annualVersions.push(annualVersion);
    }

    await t.commit();
    return getRegionalPlanVersionById(versionId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function reopenRegionalPlanDraftForEdit(versionId, regionId, userId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (version.status !== "finalized") {
    throw new Error("Only finalized master drafts can be reopened for edit");
  }

  await version.update({
    status: "draft",
    finalized_at: null,
  });

  return getRegionalPlanVersionById(versionId, regionId);
}

// -------------------------------------------------------------
// 5. Annual Planning
// -------------------------------------------------------------

async function listRegionalAnnualVersions(masterVersionId, regionId) {
  return RegionalPlanVersion.findAll({
    where: {
      parent_plan_version_id: masterVersionId,
      version_kind: "annual",
      region_id: regionId,
    },
    order: [["sequence_index", "ASC"]],
    include: [{ association: "executionPeriodVersions" }],
  });
}

async function getRegionalAnnualTargetAllocations(annualVersionId, regionId) {
  const annualVersion = await getRegionalPlanVersionById(annualVersionId, regionId);
  if (annualVersion.version_kind !== "annual") {
    throw new Error("Version is not an annual plan");
  }

  const masterVersionId = annualVersion.parent_plan_version_id;
  const [masterNodes, annualNodes] = await Promise.all([
    RegionalPlanNode.findAll({ where: { regional_plan_version_id: masterVersionId, is_active: true } }),
    RegionalPlanNode.findAll({ where: { regional_plan_version_id: annualVersionId, is_active: true } }),
  ]);

  const masterMap = new Map(masterNodes.map((n) => [n.regional_plan_node_id, n]));

  return annualNodes.map((node) => {
    const masterNode = masterMap.get(node.source_regional_plan_node_id);
    const draftTarget = masterNode ? Number(masterNode.weight) || 0 : 0;
    const currentTarget = Number(node.annual_target) || 0;

    return {
      regional_plan_node_id: node.regional_plan_node_id,
      source_regional_plan_node_id: node.source_regional_plan_node_id,
      title: node.title,
      level: node.level,
      draft_target: draftTarget,
      annual_target: currentTarget,
      remaining: Math.max(0, draftTarget - currentTarget),
    };
  });
}

async function updateRegionalAnnualTarget(nodeId, regionId, annualTarget, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.annual_target = Number(annualTarget);
  await node.save();
  return node;
}

async function getRegionalAnnualExecutionReadiness(masterVersionId, regionId) {
  const master = await getRegionalPlanVersionById(masterVersionId, regionId);
  const errors = [];

  if (master.status !== "finalized") {
    errors.push("Master plan must be finalized first.");
  }

  const annuals = await listRegionalAnnualVersions(masterVersionId, regionId);
  if (annuals.length === 0) {
    errors.push("No annual plans generated.");
  }

  return {
    ready: errors.length === 0,
    errors,
  };
}

async function finalizeRegionalAnnualExecution(masterVersionId, regionId, userId) {
  const master = await getRegionalPlanVersionById(masterVersionId, regionId);
  const now = new Date();

  await master.update({ annual_targets_finalized_at: now });
  await RegionalPlanVersion.update(
    { annual_targets_finalized_at: now },
    { where: { parent_plan_version_id: masterVersionId, version_kind: "annual" } }
  );

  return getRegionalPlanVersionById(masterVersionId, regionId);
}

async function lockRegionalAnnualPlan(annualVersionId, regionId) {
  const annual = await getRegionalPlanVersionById(annualVersionId, regionId);
  await annual.update({ is_locked: true });
  return annual;
}

async function unlockRegionalAnnualPlan(annualVersionId, regionId) {
  const annual = await getRegionalPlanVersionById(annualVersionId, regionId);
  await annual.update({ is_locked: false });
  return annual;
}

async function completeRegionalAnnualPlan(annualVersionId, regionId, userId) {
  const annual = await getRegionalPlanVersionById(annualVersionId, regionId);
  await annual.update({ status: "completed" });
  return annual;
}

// -------------------------------------------------------------
// 6. Execution Period Planning
// -------------------------------------------------------------

async function listRegionalExecutionPeriods(annualOrMasterVersionId, regionId) {
  const version = await getRegionalPlanVersionById(annualOrMasterVersionId, regionId);

  if (version.version_kind === "annual") {
    return RegionalPlanVersion.findAll({
      where: {
        parent_plan_version_id: annualOrMasterVersionId,
        version_kind: "execution_period",
        region_id: regionId,
      },
      order: [["sequence_index", "ASC"]],
    });
  }

  // If master, list all periods for all annual versions
  const annuals = await listRegionalAnnualVersions(annualOrMasterVersionId, regionId);
  const annualIds = annuals.map((a) => a.regional_plan_version_id);

  return RegionalPlanVersion.findAll({
    where: {
      parent_plan_version_id: { [Op.in]: annualIds },
      version_kind: "execution_period",
      region_id: regionId,
    },
    order: [["planning_year", "ASC"], ["sequence_index", "ASC"]],
  });
}

async function initializeRegionalExecutionPeriods(masterVersionId, regionId, subdivisionMode = "quarterly", customPeriods = [], userId) {
  const master = await getRegionalPlanVersionById(masterVersionId, regionId);
  if (!master.annual_targets_finalized_at) {
    throw new Error("Finalize annual execution targets before initializing execution periods");
  }

  const annuals = await listRegionalAnnualVersions(masterVersionId, regionId);
  const periodLabels = resolvePeriodLabelsForMode(subdivisionMode, customPeriods);

  const t = await sequelize.transaction();
  try {
    for (const annual of annuals) {
      // Clean up previous unfinalized periods if any
      await RegionalPlanVersion.destroy({
        where: { parent_plan_version_id: annual.regional_plan_version_id, version_kind: "execution_period" },
        transaction: t,
      });

      for (let i = 0; i < periodLabels.length; i++) {
        const sequence = i + 1;
        const label = periodLabels[i];

        const periodVersion = await RegionalPlanVersion.create(
          {
            regional_plan_version_id: uuidv4(),
            region_id: regionId,
            parent_plan_version_id: annual.regional_plan_version_id,
            regional_plan_rule_id: master.regional_plan_rule_id,
            regional_planning_config_id: master.regional_planning_config_id,
            draft_name: `${annual.draft_name} — ${label}`,
            version_kind: "execution_period",
            status: "draft",
            version_number: 100 + sequence,
            planning_year: annual.planning_year,
            sequence_index: sequence,
            period_label: label,
            period_subdivision_mode: subdivisionMode,
            start_year: annual.start_year,
            end_year: annual.end_year,
            planning_duration_years: 1,
            is_locked: false,
          },
          { transaction: t }
        );

        // Clone nodes from annual to period
        await cloneRegionalNodes(annual.regional_plan_version_id, periodVersion.regional_plan_version_id, t, {
          preserveAnnualTargets: true,
          preservePeriodTargets: false,
        });
      }

      await annual.update({ period_subdivision_mode: subdivisionMode }, { transaction: t });
    }

    await master.update({ period_subdivision_mode: subdivisionMode }, { transaction: t });

    await t.commit();
    return listRegionalExecutionPeriods(masterVersionId, regionId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getRegionalPeriodTargetAllocations(periodVersionId, regionId) {
  const period = await getRegionalPlanVersionById(periodVersionId, regionId);
  const annualId = period.parent_plan_version_id;

  const [annualNodes, periodNodes] = await Promise.all([
    RegionalPlanNode.findAll({ where: { regional_plan_version_id: annualId, is_active: true } }),
    RegionalPlanNode.findAll({ where: { regional_plan_version_id: periodVersionId, is_active: true } }),
  ]);

  const annualMap = new Map(annualNodes.map((n) => [n.regional_plan_node_id, n]));

  return periodNodes.map((node) => {
    const annualNode = annualMap.get(node.source_regional_plan_node_id);
    const annualTarget = annualNode ? Number(annualNode.annual_target) || 0 : 0;
    const currentTarget = Number(node.period_target) || 0;

    return {
      regional_plan_node_id: node.regional_plan_node_id,
      source_regional_plan_node_id: node.source_regional_plan_node_id,
      title: node.title,
      level: node.level,
      annual_target: annualTarget,
      period_target: currentTarget,
      period_actual: node.period_actual,
      period_actual_status: node.period_actual_status,
      remaining: Math.max(0, annualTarget - currentTarget),
    };
  });
}

async function updateRegionalPeriodTarget(nodeId, regionId, periodTarget, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.period_target = Number(periodTarget);
  await node.save();
  return node;
}

async function getRegionalPeriodFinalizationReadiness(masterOrAnnualId, regionId) {
  const version = await getRegionalPlanVersionById(masterOrAnnualId, regionId);
  const periods = await listRegionalExecutionPeriods(masterOrAnnualId, regionId);
  const errors = [];

  if (periods.length === 0) {
    errors.push("No execution periods initialized.");
  }

  return {
    ready: errors.length === 0,
    errors,
  };
}

async function finalizeRegionalPeriodTargets(masterOrAnnualId, regionId, userId) {
  const now = new Date();
  const version = await getRegionalPlanVersionById(masterOrAnnualId, regionId);

  const masterId = version.version_kind === "master" ? version.regional_plan_version_id : version.parent_plan_version_id;

  await RegionalPlanVersion.update(
    { period_targets_finalized_at: now },
    {
      where: {
        [Op.or]: [
          { regional_plan_version_id: masterId },
          { parent_plan_version_id: masterId },
        ],
      },
    }
  );

  return getRegionalPlanVersionById(masterId, regionId);
}

async function completeRegionalExecutionPeriod(periodVersionId, regionId, userId) {
  const period = await getRegionalPlanVersionById(periodVersionId, regionId);
  await period.update({ status: "completed", execution_status: "completed" });
  return period;
}

// -------------------------------------------------------------
// 7. Start Plan Process
// -------------------------------------------------------------

async function getRegionalStartProcessReadiness(versionId, regionId) {
  const master = await getRegionalPlanVersionById(versionId, regionId);
  const errors = [];

  if (master.status !== "finalized") {
    errors.push("Master plan must be finalized first.");
  }
  if (!master.annual_targets_finalized_at) {
    errors.push("Annual targets must be finalized.");
  }
  if (!master.period_targets_finalized_at) {
    errors.push("Execution period targets must be finalized.");
  }

  return {
    ready: errors.length === 0,
    errors,
  };
}

async function startRegionalPlanProcess(versionId, regionId, userId) {
  const readiness = await getRegionalStartProcessReadiness(versionId, regionId);
  if (!readiness.ready) {
    throw new Error(`Cannot start process: ${readiness.errors.join("; ")}`);
  }

  const master = await getRegionalPlanVersionById(versionId, regionId);
  const now = new Date();

  await master.update({
    process_started_at: now,
    execution_status: "open",
    status: "active",
  });

  return getRegionalPlanVersionById(versionId, regionId);
}

// -------------------------------------------------------------
// 8. Execution Reporting & Achievement Workflow
// -------------------------------------------------------------

async function updateRegionalPeriodActual(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  if (!canEditAchievementValue(node.period_actual_status)) {
    throw new Error(`Cannot edit actual value while status is "${node.period_actual_status}"`);
  }

  node.period_actual = Number(payload.period_actual);
  if (payload.narration !== undefined) node.narration = payload.narration;
  if (Array.isArray(payload.evidence_attachment_ids)) {
    node.evidence_attachment_ids = payload.evidence_attachment_ids;
  }

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "PERIOD_ACTUAL_UPDATED",
    new_values: { period_actual: node.period_actual, narration: node.narration },
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

async function submitRegionalAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.SUBMITTED)) {
    throw new Error(`Cannot submit achievement from status "${node.period_actual_status}"`);
  }

  if (payload?.period_actual !== undefined) {
    node.period_actual = Number(payload.period_actual);
  }
  if (payload?.narration) node.narration = payload.narration;

  node.period_actual_status = ACHIEVEMENT_STATUS.SUBMITTED;
  node.period_actual_submitted_at = new Date();
  node.period_actual_submitted_by = userId;
  node.period_actual_rejection_comment = null;

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "ACHIEVEMENT_SUBMITTED",
    new_values: { period_actual: node.period_actual, status: ACHIEVEMENT_STATUS.SUBMITTED },
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

async function approveRegionalAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.APPROVED)) {
    throw new Error(`Cannot approve achievement from status "${node.period_actual_status}"`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.APPROVED;
  node.period_actual_approved_at = new Date();
  node.period_actual_approved_by = userId;
  node.period_actual_rejection_comment = null;

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "ACHIEVEMENT_APPROVED",
    new_values: { status: ACHIEVEMENT_STATUS.APPROVED },
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

async function rejectRegionalAchievement(nodeId, regionId, rejectionComment, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.REJECTED)) {
    throw new Error(`Cannot reject achievement from status "${node.period_actual_status}"`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.REJECTED;
  node.period_actual_rejection_comment = rejectionComment || "Achievement rejected";

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "ACHIEVEMENT_REJECTED",
    comment: rejectionComment,
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

async function validateRegionalAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.VALIDATED)) {
    throw new Error(`Cannot validate achievement from status "${node.period_actual_status}"`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.VALIDATED;
  node.period_actual_validated_at = new Date();
  node.period_actual_validated_by = userId;

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "ACHIEVEMENT_VALIDATED",
    new_values: { status: ACHIEVEMENT_STATUS.VALIDATED },
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

async function rejectValidationRegionalAchievement(nodeId, regionId, rejectionComment, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);

  node.period_actual_status = ACHIEVEMENT_STATUS.REJECTED;
  node.period_actual_rejection_comment = rejectionComment || "Validation rejected";

  await node.save();

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: userId,
    action: "ACHIEVEMENT_VALIDATION_REJECTED",
    comment: rejectionComment,
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

// Annual achievement workflows
async function submitRegionalAnnualAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.annual_actual = Number(payload.annual_actual);
  node.annual_actual_status = ACHIEVEMENT_STATUS.SUBMITTED;
  node.annual_actual_submitted_at = new Date();
  node.annual_actual_submitted_by = userId;
  await node.save();
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function approveRegionalAnnualAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.annual_actual_status = ACHIEVEMENT_STATUS.APPROVED;
  node.annual_actual_approved_at = new Date();
  node.annual_actual_approved_by = userId;
  await node.save();
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function rejectRegionalAnnualAchievement(nodeId, regionId, rejectionComment, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.annual_actual_status = ACHIEVEMENT_STATUS.REJECTED;
  node.annual_actual_rejection_comment = rejectionComment;
  await node.save();
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function validateRegionalAnnualAchievement(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  node.annual_actual_status = ACHIEVEMENT_STATUS.VALIDATED;
  node.annual_actual_validated_at = new Date();
  node.annual_actual_validated_by = userId;
  await node.save();
  return getRegionalPlanNodeById(nodeId, regionId);
}

// -------------------------------------------------------------
// 9. Regional Execution Dashboard & Performance Summaries
// -------------------------------------------------------------

async function getRegionalExecutionDashboardSummary(regionId, filters = {}) {
  const plans = await RegionalPlanVersion.findAll({
    where: { region_id: regionId, version_kind: "master" },
    include: [{ association: "planRule" }],
    order: [["created_at", "DESC"]],
  });

  const counts = {
    total_plans: plans.length,
    draft_plans: plans.filter((p) => p.status === "draft").length,
    finalized_plans: plans.filter((p) => p.status === "finalized").length,
    active_plans: plans.filter((p) => p.status === "active").length,
    completed_plans: plans.filter((p) => p.status === "completed").length,
  };

  // Calculate overall portfolio execution progress across active plans
  let portfolioTotalProgress = 0;
  let portfolioEvaluatedCount = 0;
  let activeMilestones = 0;
  let delayedKpis = 0;

  for (const plan of plans) {
    const nodes = await RegionalPlanNode.findAll({
      where: { regional_plan_version_id: plan.regional_plan_version_id, is_active: true },
    });

    if (nodes.length > 0) {
      const { metricsMemo } = computeRegionalTreeRollup(nodes, plan.planRule);

      for (const node of nodes) {
        if (node.level >= 3) {
          activeMilestones++;
          const m = metricsMemo.get(node.regional_plan_node_id);
          if (m && m.computedTarget > 0 && (m.computedActual === null || m.progressPercent < 50)) {
            delayedKpis++;
          }
        }
      }

      // Root progress
      const roots = nodes.filter((n) => !n.parent_id);
      if (roots.length > 0) {
        const rootProgresses = roots.map((r) => metricsMemo.get(r.regional_plan_node_id)?.progressPercent ?? 0);
        const planAvg = Math.round(rootProgresses.reduce((a, b) => a + b, 0) / rootProgresses.length);
        portfolioTotalProgress += planAvg;
        portfolioEvaluatedCount++;
      }
    }
  }

  const avgProgress = portfolioEvaluatedCount > 0 ? Math.round(portfolioTotalProgress / portfolioEvaluatedCount) : 0;

  return {
    region_id: regionId,
    total_plans: counts.total_plans,
    active_plans: counts.active_plans,
    portfolio_progress_percent: avgProgress,
    active_milestones: activeMilestones,
    delayed_kpis: delayedKpis,
    summary: {
      total_plans: counts.total_plans,
      avg_progress: avgProgress,
      active_milestones: activeMilestones,
      delayed_kpis: delayedKpis,
      status_breakdown: counts,
    },
    plans: plans.map((p) => ({
      regional_plan_version_id: p.regional_plan_version_id,
      draft_name: p.draft_name,
      status: p.status,
      start_year: p.start_year,
      end_year: p.end_year,
      created_at: p.created_at,
    })),
  };
}

async function getRegionalExecutionDashboardProgressTree(regionId, planVersionId) {
  let targetVersionId = planVersionId;

  if (!targetVersionId) {
    // Pick latest active or finalized plan
    const latest = await RegionalPlanVersion.findOne({
      where: { region_id: regionId, version_kind: "master" },
      order: [["created_at", "DESC"]],
    });
    if (!latest) {
      return { tree: [], version: null };
    }
    targetVersionId = latest.regional_plan_version_id;
  }

  const { version, nodes } = await getRegionalPlanHierarchy(targetVersionId, regionId);
  return { version, tree: nodes };
}

async function getRegionalExecutionDashboardDepartmentUser(regionId, planVersionId) {
  const departments = await RegionalStructure.findAll({
    where: { region_id: regionId, is_active: true },
    order: [["level", "ASC"], ["name", "ASC"]],
  });

  const { tree } = await getRegionalExecutionDashboardProgressTree(regionId, planVersionId);

  // Map progress to departments
  const deptPerformance = departments.map((dept) => {
    const assignedNodes = tree.filter((n) =>
      n.internalAssignments?.some((a) => a.regional_structure_id === dept.regional_structure_id)
    );

    const totalAssigned = assignedNodes.length;
    let avgScore = 0;

    if (totalAssigned > 0) {
      const sum = assignedNodes.reduce((acc, n) => acc + (n.execution_progress_percent ?? 0), 0);
      avgScore = Math.round(sum / totalAssigned);
    }

    return {
      regional_structure_id: dept.regional_structure_id,
      name: dept.name,
      level: dept.level,
      assigned_nodes_count: totalAssigned,
      avg_progress: avgScore,
      status: avgScore >= 100 ? "completed" : avgScore > 0 ? "in_progress" : "pending",
    };
  });

  return { departments: deptPerformance };
}

module.exports = {
  // Config & Rules
  getEffectiveRegionalPlanningConfig,
  updateRegionalPlanningConfig,
  listRegionalPlanRules,
  getRegionalPlanRuleById,
  createRegionalPlanRule,
  updateRegionalPlanRule,
  deleteRegionalPlanRule,

  // Plan Version Management
  createRegionalPlanDraft,
  listRegionalPlanVersions,
  getRegionalPlanVersionById,
  updateRegionalPlanVersion,
  deleteRegionalPlanVersion,
  duplicateRegionalPlanDraft,

  // Hierarchy & Nodes
  getRegionalPlanHierarchy,
  createRegionalPlanNode,
  getRegionalPlanNodeById,
  updateRegionalPlanNode,
  deleteRegionalPlanNode,
  reorderRegionalPlanNodes,

  // Finalization & Start
  getRegionalDraftFinalizationReadiness,
  finalizeRegionalPlanDraft,
  reopenRegionalPlanDraftForEdit,
  getRegionalStartProcessReadiness,
  startRegionalPlanProcess,

  // Annual Planning
  listRegionalAnnualVersions,
  getRegionalAnnualTargetAllocations,
  updateRegionalAnnualTarget,
  getRegionalAnnualExecutionReadiness,
  finalizeRegionalAnnualExecution,
  lockRegionalAnnualPlan,
  unlockRegionalAnnualPlan,
  completeRegionalAnnualPlan,

  // Period Planning
  listRegionalExecutionPeriods,
  initializeRegionalExecutionPeriods,
  getRegionalPeriodTargetAllocations,
  updateRegionalPeriodTarget,
  getRegionalPeriodFinalizationReadiness,
  finalizeRegionalPeriodTargets,
  completeRegionalExecutionPeriod,

  // Execution Reporting & Workflow
  updateRegionalPeriodActual,
  submitRegionalAchievement,
  approveRegionalAchievement,
  rejectRegionalAchievement,
  validateRegionalAchievement,
  rejectValidationRegionalAchievement,
  submitRegionalAnnualAchievement,
  approveRegionalAnnualAchievement,
  rejectRegionalAnnualAchievement,
  validateRegionalAnnualAchievement,

  // Dashboard & Metrics
  getRegionalExecutionDashboardSummary,
  getRegionalExecutionDashboardProgressTree,
  getRegionalExecutionDashboardDepartmentUser,
};
