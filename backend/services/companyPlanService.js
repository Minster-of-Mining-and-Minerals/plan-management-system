"use strict";

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");
const {
  CompanyPlanVersion,
  CompanyPlanNode,
  CompanyPlanningConfiguration,
  CompanyPlanRule,
  CompanyPlanRuleStep,
  CompanyInternalAssignment,
  CompanyPlanNodeActionLog,
  CompanyStructure,
  Company,
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
// Helper: Default Company Configuration & Rule Initializer
// -------------------------------------------------------------

async function ensureDefaultCompanyPlanningConfig(companyId, transaction) {
  let config = await CompanyPlanningConfiguration.findOne({
    where: { company_id: companyId },
    order: [["created_at", "DESC"]],
    transaction,
  });

  if (!config) {
    config = await CompanyPlanningConfiguration.create(
      {
        company_planning_config_id: uuidv4(),
        company_id: companyId,
        min_duration_years: 1,
        max_duration_years: 10,
        draft_entity_label_singular: "Company Strategic Plan Draft",
        draft_entity_label_plural: "Company Strategic Plan Drafts",
        create_action_label: "Create Company Plan",
        planning_period_label: "Company Planning Cycle",
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

async function ensureDefaultCompanyPlanRule(companyId, transaction) {
  let rule = await CompanyPlanRule.findOne({
    where: { company_id: companyId, is_active: true },
    include: [{ association: "steps" }],
    order: [["created_at", "DESC"]],
    transaction,
  });

  if (!rule) {
    const ruleId = uuidv4();
    rule = await CompanyPlanRule.create(
      {
        company_plan_rule_id: ruleId,
        company_id: companyId,
        name: "Standard Company 4-Level Planning Rule",
        is_active: true,
        performance_scoring_policy: "CAP_100",
      },
      { transaction }
    );

    const defaultSteps = [
      { level: 1, name: "Strategic Focus", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
      { level: 2, name: "Company Goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false },
      { level: 3, name: "Key Performance Indicator (KPI)", requires_weight: true, requires_contribution_weight: true, allow_kpi: true },
      { level: 4, name: "Operational Activity / Task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true },
    ];

    for (const step of defaultSteps) {
      await CompanyPlanRuleStep.create(
        {
          company_plan_rule_step_id: uuidv4(),
          company_plan_rule_id: ruleId,
          ...step,
        },
        { transaction }
      );
    }

    rule = await CompanyPlanRule.findByPk(ruleId, {
      include: [{ association: "steps" }],
      transaction,
    });
  }

  return rule;
}

async function initializeCompanyPlanningDefaults(companyId, transaction = null) {
  const config = await ensureDefaultCompanyPlanningConfig(companyId, transaction);
  const rule = await ensureDefaultCompanyPlanRule(companyId, transaction);
  return { config, rule };
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
// 1. Company Planning Configuration & Rules Service
// -------------------------------------------------------------

async function getEffectiveCompanyPlanningConfig(companyId) {
  return CompanyPlanningConfiguration.findOne({
    where: { company_id: companyId },
    order: [["created_at", "DESC"]],
  });
}

async function updateCompanyPlanningConfig(companyId, payload) {
  let config = await CompanyPlanningConfiguration.findOne({
    where: { company_id: companyId },
  });
  if (!config) {
    config = await ensureDefaultCompanyPlanningConfig(companyId);
  }
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

async function listCompanyPlanRules(companyId) {
  return CompanyPlanRule.findAll({
    where: { company_id: companyId },
    include: [{ association: "steps" }],
    order: [["created_at", "ASC"]],
  });
}

async function getCompanyPlanRuleById(ruleId, companyId) {
  const rule = await CompanyPlanRule.findOne({
    where: { company_plan_rule_id: ruleId, company_id: companyId },
    include: [{ association: "steps" }],
  });
  if (!rule) {
    const existsOther = await CompanyPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another company");
      error.status = 403;
      throw error;
    }
    return null;
  }
  return rule;
}

async function createCompanyPlanRule(companyId, payload) {
  const t = await sequelize.transaction();
  try {
    const isActive = payload.is_active !== undefined ? payload.is_active : true;
    if (isActive) {
      await CompanyPlanRule.update(
        { is_active: false },
        { where: { company_id: companyId }, transaction: t }
      );
    }

    const ruleId = uuidv4();
    const rule = await CompanyPlanRule.create(
      {
        company_plan_rule_id: ruleId,
        company_id: companyId,
        name: payload.name || "Custom Company Plan Rule",
        is_active: isActive,
        performance_scoring_policy: payload.performance_scoring_policy || "CAP_100",
      },
      { transaction: t }
    );

    if (Array.isArray(payload.steps)) {
      for (const step of payload.steps) {
        await CompanyPlanRuleStep.create(
          {
            company_plan_rule_step_id: uuidv4(),
            company_plan_rule_id: ruleId,
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
    return getCompanyPlanRuleById(ruleId, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateCompanyPlanRule(ruleId, companyId, payload) {
  const rule = await CompanyPlanRule.findOne({
    where: { company_plan_rule_id: ruleId, company_id: companyId },
  });
  if (!rule) {
    const existsOther = await CompanyPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another company");
      error.status = 403;
      throw error;
    }
    const error = new Error("Company plan rule not found");
    error.status = 404;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    if (payload.is_active === true) {
      await CompanyPlanRule.update(
        { is_active: false },
        {
          where: {
            company_id: companyId,
            company_plan_rule_id: { [Op.ne]: ruleId },
          },
          transaction: t,
        }
      );
    }

    if (payload.name) rule.name = payload.name;
    if (payload.is_active !== undefined) rule.is_active = payload.is_active;
    if (payload.performance_scoring_policy) {
      rule.performance_scoring_policy = payload.performance_scoring_policy;
    }
    await rule.save({ transaction: t });

    if (Array.isArray(payload.steps)) {
      await CompanyPlanRuleStep.destroy({
        where: { company_plan_rule_id: ruleId },
        transaction: t,
      });
      for (const step of payload.steps) {
        await CompanyPlanRuleStep.create(
          {
            company_plan_rule_step_id: uuidv4(),
            company_plan_rule_id: ruleId,
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
    return getCompanyPlanRuleById(ruleId, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function deleteCompanyPlanRule(ruleId, companyId) {
  const rule = await CompanyPlanRule.findOne({
    where: { company_plan_rule_id: ruleId, company_id: companyId },
  });
  if (!rule) {
    const existsOther = await CompanyPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another company");
      error.status = 403;
      throw error;
    }
    const error = new Error("Company plan rule not found");
    error.status = 404;
    throw error;
  }

  const count = await CompanyPlanVersion.count({
    where: { company_plan_rule_id: ruleId, company_id: companyId },
  });
  if (count > 0) {
    throw new Error("Cannot delete plan rule: it is currently referenced by plan versions.");
  }

  await CompanyPlanRuleStep.destroy({ where: { company_plan_rule_id: ruleId } });
  const deleted = await CompanyPlanRule.destroy({
    where: { company_plan_rule_id: ruleId, company_id: companyId },
  });
  return { success: !!deleted };
}

// -------------------------------------------------------------
// 2. Company Plan Versions Service
// -------------------------------------------------------------

async function listCompanyPlanVersions(companyId, query = {}) {
  const where = { company_id: companyId };
  if (query.version_kind) where.version_kind = query.version_kind;
  if (query.status) where.status = query.status;
  if (query.parent_plan_version_id) {
    where.parent_plan_version_id = query.parent_plan_version_id;
  } else if (query.version_kind === "master" || !query.version_kind) {
    where.parent_plan_version_id = null;
  }

  return CompanyPlanVersion.findAll({
    where,
    include: [
      { association: "planRule", include: [{ association: "steps" }] },
      { association: "planningConfiguration" },
    ],
    order: [
      ["start_year", "DESC"],
      ["version_number", "DESC"],
      ["created_at", "DESC"],
    ],
  });
}

async function getCompanyPlanVersionById(versionId, companyId) {
  return CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
    include: [
      { association: "planRule", include: [{ association: "steps" }] },
      { association: "planningConfiguration" },
      { association: "annualVersions" },
      { association: "executionPeriodVersions" },
    ],
  });
}

async function createCompanyPlanDraft(companyId, payload) {
  const t = await sequelize.transaction();
  try {
    const config = await CompanyPlanningConfiguration.findOne({
      where: { company_id: companyId },
      transaction: t,
    });
    if (!config) {
      const err = new Error(
        "CONFIG_NOT_READY: Company planning configuration is missing for this company. Please configure company settings first."
      );
      err.status = 400;
      err.code = "CONFIG_NOT_READY";
      throw err;
    }

    let rule;
    if (payload.company_plan_rule_id) {
      rule = await CompanyPlanRule.findOne({
        where: { company_plan_rule_id: payload.company_plan_rule_id, company_id: companyId },
        transaction: t,
      });
      if (!rule) {
        const other = await CompanyPlanRule.findByPk(payload.company_plan_rule_id, { transaction: t });
        if (other) {
          const err = new Error("Access denied: selected company plan rule belongs to another company.");
          err.status = 403;
          throw err;
        }
        const err = new Error("Selected company plan rule not found for this company.");
        err.status = 400;
        throw err;
      }
    } else {
      rule = await CompanyPlanRule.findOne({
        where: { company_id: companyId, is_active: true },
        transaction: t,
      });
      if (!rule) {
        const err = new Error(
          "CONFIG_NOT_READY: No active Plan Rules configuration found for this company. Please configure company plan rules first."
        );
        err.status = 400;
        err.code = "CONFIG_NOT_READY";
        throw err;
      }
    }

    const startYear = parseInt(payload.start_year || new Date().getFullYear(), 10);
    const duration = parseInt(payload.planning_duration_years || 5, 10);
    const endYear = startYear + duration - 1;

    const version = await CompanyPlanVersion.create(
      {
        company_plan_version_id: uuidv4(),
        company_id: companyId,
        company_plan_rule_id: rule.company_plan_rule_id,
        company_planning_config_id: config.company_planning_config_id,
        draft_name: payload.draft_name || `Strategic Plan ${startYear}-${endYear}`,
        version_kind: payload.version_kind || "master",
        status: "draft",
        version_number: 1,
        start_year: startYear,
        end_year: endYear,
        planning_duration_years: duration,
        is_locked: false,
        review_status: "draft",
        execution_status: "open",
      },
      { transaction: t }
    );

    await t.commit();
    return getCompanyPlanVersionById(version.company_plan_version_id, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateCompanyPlanVersion(versionId, companyId, payload) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });
  if (!version) throw new Error("Plan version not found");
  if (version.is_locked && payload.is_locked === undefined) {
    throw new Error("Plan version is locked and cannot be edited");
  }

  const allowed = [
    "draft_name",
    "company_plan_rule_id",
    "start_year",
    "planning_duration_years",
    "review_status",
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) version[key] = payload[key];
  }

  if (payload.start_year || payload.planning_duration_years) {
    version.end_year = version.start_year + version.planning_duration_years - 1;
  }

  await version.save();
  return getCompanyPlanVersionById(versionId, companyId);
}

async function deleteCompanyPlanVersion(versionId, companyId) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });
  if (!version) throw new Error("Plan version not found");
  if (version.status === "finalized") {
    throw new Error("Finalized plan versions cannot be deleted");
  }

  await version.destroy();
  return { success: true };
}

async function duplicateCompanyPlanDraft(versionId, companyId, payload = {}) {
  const source = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });
  if (!source) throw new Error("Source plan version not found");

  const t = await sequelize.transaction();
  try {
    const newVersionId = uuidv4();
    const newVersionNumber = source.version_number + 1;

    const duplicated = await CompanyPlanVersion.create(
      {
        company_plan_version_id: newVersionId,
        company_id: companyId,
        parent_plan_version_id: source.parent_plan_version_id,
        based_on_version_id: source.company_plan_version_id,
        company_plan_rule_id: source.company_plan_rule_id,
        company_planning_config_id: source.company_planning_config_id,
        draft_name: payload.draft_name || `${source.draft_name} (Copy)`,
        version_kind: source.version_kind,
        status: "draft",
        version_number: newVersionNumber,
        start_year: source.start_year,
        end_year: source.end_year,
        planning_duration_years: source.planning_duration_years,
        is_locked: false,
        review_status: "draft",
        execution_status: "open",
      },
      { transaction: t }
    );

    // Deep copy plan nodes
    const sourceNodes = await CompanyPlanNode.findAll({
      where: { company_plan_version_id: versionId },
      order: [["level", "ASC"], ["order", "ASC"]],
      transaction: t,
    });

    const idMap = new Map();
    for (const node of sourceNodes) {
      const newNodeId = uuidv4();
      idMap.set(node.company_plan_node_id, newNodeId);

      await CompanyPlanNode.create(
        {
          company_plan_node_id: newNodeId,
          company_plan_version_id: newVersionId,
          parent_id: node.parent_id ? idMap.get(node.parent_id) || null : null,
          source_company_plan_node_id: node.company_plan_node_id,
          type: node.type,
          title: node.title,
          description: node.description,
          weight: node.weight,
          weight_mode: node.weight_mode,
          contribution_weight: node.contribution_weight,
          target_unit: node.target_unit,
          target_allocation_mode: node.target_allocation_mode,
          achievement_mode: node.achievement_mode,
          level: node.level,
          order: node.order,
          is_active: node.is_active,
          annual_target: node.annual_target,
          period_target: node.period_target,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return getCompanyPlanVersionById(newVersionId, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// -------------------------------------------------------------
// 3. Hierarchy & Plan Nodes Service
// -------------------------------------------------------------

async function getCompanyPlanHierarchy(versionId, companyId) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
    include: [
      { association: "planRule", include: [{ association: "steps" }] },
      { association: "planningConfiguration" },
    ],
  });
  if (!version) throw new Error("Plan version not found");

  const nodes = await CompanyPlanNode.findAll({
    where: { company_plan_version_id: versionId, is_active: true },
    include: [
      {
        association: "internalAssignments",
        include: [{ association: "department" }, { association: "assignedUser" }],
      },
    ],
    order: [["level", "ASC"], ["order", "ASC"], ["created_at", "ASC"]],
  });

  // Build tree
  const nodeMap = new Map();
  nodes.forEach((n) => {
    const raw = n.toJSON();
    raw.children = [];
    nodeMap.set(n.company_plan_node_id, raw);
  });

  const roots = [];
  nodeMap.forEach((n) => {
    if (n.parent_id && nodeMap.has(n.parent_id)) {
      nodeMap.get(n.parent_id).children.push(n);
    } else {
      roots.push(n);
    }
  });

  return {
    version,
    tree: roots,
    flat: nodes,
  };
}

async function createCompanyPlanNode(companyId, payload, actor) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: payload.company_plan_version_id, company_id: companyId },
  });
  if (!version) throw new Error("Target plan version not found or outside company");
  if (version.is_locked) throw new Error("Plan version is locked for editing");

  const t = await sequelize.transaction();
  try {
    const nodeId = uuidv4();
    const node = await CompanyPlanNode.create(
      {
        company_plan_node_id: nodeId,
        company_plan_version_id: version.company_plan_version_id,
        parent_id: payload.parent_id || null,
        type: payload.type || "strategic",
        title: payload.title,
        description: payload.description || null,
        weight: payload.weight || 0,
        weight_mode: payload.weight_mode || "percentage",
        contribution_weight: payload.contribution_weight || 0,
        target_unit: payload.target_unit || null,
        target_allocation_mode: payload.target_allocation_mode || "divisible",
        achievement_mode: payload.achievement_mode || "period",
        level: payload.level || 1,
        order: payload.order || 0,
        is_active: true,
        annual_target: payload.annual_target !== undefined ? payload.annual_target : null,
        period_target: payload.period_target !== undefined ? payload.period_target : null,
      },
      { transaction: t }
    );

    if (Array.isArray(payload.department_ids) && payload.department_ids.length > 0) {
      for (const deptId of payload.department_ids) {
        await CompanyInternalAssignment.create(
          {
            company_internal_assignment_id: uuidv4(),
            company_plan_node_id: nodeId,
            company_structure_id: deptId,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }

    if (actor?.user_id) {
      await CompanyPlanNodeActionLog.create(
        {
          action_log_id: uuidv4(),
          company_plan_node_id: nodeId,
          user_id: actor.user_id,
          action: "CREATE_NODE",
          new_values: { title: payload.title, level: payload.level },
          comment: "Created plan hierarchy node",
        },
        { transaction: t }
      );
    }

    await t.commit();
    return getCompanyPlanNodeById(nodeId, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getCompanyPlanNodeById(nodeId, companyId) {
  const node = await CompanyPlanNode.findOne({
    where: { company_plan_node_id: nodeId },
    include: [
      { association: "planVersion" },
      {
        association: "internalAssignments",
        include: [{ association: "department" }, { association: "assignedUser" }],
      },
      { association: "children" },
      { association: "parent" },
    ],
  });

  if (!node || node.planVersion?.company_id !== companyId) {
    return null;
  }
  return node;
}

async function updateCompanyPlanNode(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");
  if (node.planVersion?.is_locked) {
    throw new Error("Plan version is locked for structural changes");
  }

  const t = await sequelize.transaction();
  try {
    const prev = node.toJSON();
    const allowed = [
      "title",
      "description",
      "weight",
      "weight_mode",
      "contribution_weight",
      "target_unit",
      "target_allocation_mode",
      "achievement_mode",
      "order",
      "is_active",
    ];

    for (const key of allowed) {
      if (payload[key] !== undefined) node[key] = payload[key];
    }
    await node.save({ transaction: t });

    if (Array.isArray(payload.department_ids)) {
      await CompanyInternalAssignment.destroy({
        where: { company_plan_node_id: nodeId },
        transaction: t,
      });
      for (const deptId of payload.department_ids) {
        await CompanyInternalAssignment.create(
          {
            company_internal_assignment_id: uuidv4(),
            company_plan_node_id: nodeId,
            company_structure_id: deptId,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }

    if (actor?.user_id) {
      await CompanyPlanNodeActionLog.create(
        {
          action_log_id: uuidv4(),
          company_plan_node_id: nodeId,
          user_id: actor.user_id,
          action: "UPDATE_NODE",
          previous_values: { title: prev.title, weight: prev.weight },
          new_values: { title: node.title, weight: node.weight },
          comment: payload.comment || "Updated plan node",
        },
        { transaction: t }
      );
    }

    await t.commit();
    return getCompanyPlanNodeById(nodeId, companyId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function deleteCompanyPlanNode(nodeId, companyId, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");
  if (node.planVersion?.is_locked) {
    throw new Error("Plan version is locked");
  }

  await node.destroy();
  return { success: true };
}

async function reorderCompanyPlanNodes(companyId, { version_id, ordered_node_ids }) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: version_id, company_id: companyId },
  });
  if (!version) throw new Error("Plan version not found");

  const t = await sequelize.transaction();
  try {
    for (let i = 0; i < ordered_node_ids.length; i++) {
      await CompanyPlanNode.update(
        { order: i },
        {
          where: { company_plan_node_id: ordered_node_ids[i], company_plan_version_id: version_id },
          transaction: t,
        }
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
// 4. Lifecycle: Finalization & Start Process
// -------------------------------------------------------------

async function getCompanyDraftFinalizationReadiness(versionId, companyId) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
    include: [{ association: "planRule", include: [{ association: "steps" }] }],
  });
  if (!version) throw new Error("Plan version not found");

  const nodes = await CompanyPlanNode.findAll({
    where: { company_plan_version_id: versionId, is_active: true },
  });

  const errors = [];
  if (nodes.length === 0) {
    errors.push("Plan has no structure or nodes defined.");
  }

  // Weight validation
  const rule = version.planRule;
  const kpiNodes = nodes.filter((n) => n.level === 3 || n.type === "kpi");
  if (kpiNodes.length === 0) {
    errors.push("Plan requires at least one KPI node.");
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

async function finalizeCompanyPlanDraft(versionId, companyId, actor) {
  const readiness = await getCompanyDraftFinalizationReadiness(versionId, companyId);
  if (!readiness.ready) {
    const err = new Error(`Cannot finalize: ${readiness.errors.join("; ")}`);
    err.status = 400;
    throw err;
  }

  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });

  version.status = "finalized";
  version.finalized_at = new Date();
  version.is_locked = true;
  await version.save();

  return getCompanyPlanVersionById(versionId, companyId);
}

async function reopenCompanyPlanDraftForEdit(versionId, companyId, actor) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });
  if (!version) throw new Error("Plan version not found");
  if (version.process_started_at) {
    throw new Error("Cannot reopen a plan whose execution process has already started");
  }

  version.status = "draft";
  version.is_locked = false;
  version.finalized_at = null;
  await version.save();

  return getCompanyPlanVersionById(versionId, companyId);
}

async function getCompanyStartProcessReadiness(versionId, companyId) {
  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });
  if (!version) throw new Error("Plan version not found");

  const errors = [];
  if (version.status !== "finalized") {
    errors.push("Master plan must be finalized first.");
  }

  const annuals = await CompanyPlanVersion.findAll({
    where: { parent_plan_version_id: versionId, version_kind: "annual" },
  });
  if (annuals.length === 0) {
    errors.push("At least one annual plan version must be generated.");
  }

  return {
    ready: errors.length === 0,
    errors,
    annual_versions_count: annuals.length,
  };
}

async function startCompanyPlanProcess(versionId, companyId, actor) {
  const readiness = await getCompanyStartProcessReadiness(versionId, companyId);
  if (!readiness.ready) {
    const err = new Error(`Cannot start process: ${readiness.errors.join("; ")}`);
    err.status = 400;
    throw err;
  }

  const version = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: versionId, company_id: companyId },
  });

  version.process_started_at = new Date();
  version.execution_status = "in_progress";
  await version.save();

  return getCompanyPlanVersionById(versionId, companyId);
}

// -------------------------------------------------------------
// 5. Annual Planning Service
// -------------------------------------------------------------

async function listCompanyAnnualVersions(parentVersionId, companyId) {
  const master = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: parentVersionId, company_id: companyId },
  });
  if (!master) throw new Error("Master plan version not found");

  let annuals = await CompanyPlanVersion.findAll({
    where: { parent_plan_version_id: parentVersionId, version_kind: "annual", company_id: companyId },
    order: [["planning_year", "ASC"]],
  });

  // Auto-generate annual version slots if empty
  if (annuals.length === 0) {
    const t = await sequelize.transaction();
    try {
      for (let y = master.start_year; y <= master.end_year; y++) {
        const annualId = uuidv4();
        await CompanyPlanVersion.create(
          {
            company_plan_version_id: annualId,
            company_id: companyId,
            parent_plan_version_id: master.company_plan_version_id,
            company_plan_rule_id: master.company_plan_rule_id,
            company_planning_config_id: master.company_planning_config_id,
            draft_name: `Year ${y} Annual Plan (${master.draft_name})`,
            version_kind: "annual",
            status: "draft",
            version_number: 1,
            planning_year: y,
            start_year: y,
            end_year: y,
            planning_duration_years: 1,
            is_locked: false,
            execution_status: "open",
          },
          { transaction: t }
        );

        // Copy KPI nodes with target placeholders
        const masterNodes = await CompanyPlanNode.findAll({
          where: { company_plan_version_id: parentVersionId, is_active: true },
          transaction: t,
        });

        const idMap = new Map();
        for (const mn of masterNodes) {
          const newNodeId = uuidv4();
          idMap.set(mn.company_plan_node_id, newNodeId);

          await CompanyPlanNode.create(
            {
              company_plan_node_id: newNodeId,
              company_plan_version_id: annualId,
              parent_id: mn.parent_id ? idMap.get(mn.parent_id) || null : null,
              source_company_plan_node_id: mn.company_plan_node_id,
              type: mn.type,
              title: mn.title,
              weight: mn.weight,
              weight_mode: mn.weight_mode,
              contribution_weight: mn.contribution_weight,
              target_unit: mn.target_unit,
              level: mn.level,
              order: mn.order,
              is_active: true,
              annual_target: mn.annual_target ? mn.annual_target / master.planning_duration_years : 0,
            },
            { transaction: t }
          );
        }
      }

      await t.commit();
      annuals = await CompanyPlanVersion.findAll({
        where: { parent_plan_version_id: parentVersionId, version_kind: "annual", company_id: companyId },
        order: [["planning_year", "ASC"]],
      });
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  return annuals;
}

async function getCompanyAnnualTargetAllocations(annualVersionId, companyId) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");

  return CompanyPlanNode.findAll({
    where: { company_plan_version_id: annualVersionId, is_active: true },
    include: [{ association: "parent" }],
    order: [["level", "ASC"], ["order", "ASC"]],
  });
}

async function updateCompanyAnnualTarget(nodeId, companyId, annualTarget, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");
  if (node.planVersion?.is_locked) {
    throw new Error("Annual plan targets are locked");
  }

  node.annual_target = parseFloat(annualTarget) || 0;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "UPDATE_ANNUAL_TARGET",
      new_values: { annual_target: node.annual_target },
      comment: "Updated annual target allocation",
    });
  }

  return node;
}

async function getCompanyAnnualExecutionReadiness(annualVersionId, companyId) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");

  const nodes = await CompanyPlanNode.findAll({
    where: { company_plan_version_id: annualVersionId, is_active: true },
  });

  const errors = [];
  const kpis = nodes.filter((n) => n.level === 3 || n.type === "kpi");
  if (kpis.length === 0) errors.push("No KPIs found in annual plan.");

  const unallocated = kpis.filter((k) => k.annual_target === null || k.annual_target === undefined);
  if (unallocated.length > 0) {
    errors.push(`${unallocated.length} KPIs have missing annual targets.`);
  }

  return {
    ready: errors.length === 0,
    errors,
    kpi_count: kpis.length,
    unallocated_count: unallocated.length,
  };
}

async function finalizeCompanyAnnualExecution(annualVersionId, companyId, actor) {
  const readiness = await getCompanyAnnualExecutionReadiness(annualVersionId, companyId);
  if (!readiness.ready) {
    const err = new Error(`Cannot finalize annual execution: ${readiness.errors.join("; ")}`);
    err.status = 400;
    throw err;
  }

  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });

  annual.annual_targets_finalized_at = new Date();
  annual.is_locked = true;
  annual.status = "finalized";
  await annual.save();

  return getCompanyPlanVersionById(annualVersionId, companyId);
}

async function lockCompanyAnnualPlan(annualVersionId, companyId) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");
  annual.is_locked = true;
  await annual.save();
  return annual;
}

async function unlockCompanyAnnualPlan(annualVersionId, companyId) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");
  annual.is_locked = false;
  await annual.save();
  return annual;
}

async function completeCompanyAnnualPlan(annualVersionId, companyId, actor) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");

  annual.execution_status = "completed";
  await annual.save();
  return annual;
}

// -------------------------------------------------------------
// 6. Execution Period Planning Service
// -------------------------------------------------------------

async function listCompanyExecutionPeriods(annualVersionId, companyId) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
  });
  if (!annual) throw new Error("Annual version not found");

  return CompanyPlanVersion.findAll({
    where: { parent_plan_version_id: annualVersionId, version_kind: "period", company_id: companyId },
    order: [["sequence_index", "ASC"]],
  });
}

async function initializeCompanyExecutionPeriods(annualVersionId, companyId, payload = {}) {
  const annual = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: annualVersionId, company_id: companyId },
    include: [{ association: "planningConfiguration" }],
  });
  if (!annual) throw new Error("Annual version not found");

  const mode = payload.subdivision_mode || annual.planningConfiguration?.breakdown_mode || "quarterly";
  const custom = payload.custom_periods || annual.planningConfiguration?.custom_periods || [];
  const labels = resolvePeriodLabelsForMode(mode, custom);

  const t = await sequelize.transaction();
  try {
    // Remove existing periods if in draft
    const existing = await CompanyPlanVersion.findAll({
      where: { parent_plan_version_id: annualVersionId, version_kind: "period" },
      transaction: t,
    });
    for (const ep of existing) {
      if (ep.status === "finalized") {
        throw new Error("Cannot reinitialize periods: some periods are already finalized.");
      }
      await ep.destroy({ transaction: t });
    }

    const annualNodes = await CompanyPlanNode.findAll({
      where: { company_plan_version_id: annualVersionId, is_active: true },
      transaction: t,
    });

    const createdPeriods = [];
    for (let i = 0; i < labels.length; i++) {
      const pId = uuidv4();
      const periodVer = await CompanyPlanVersion.create(
        {
          company_plan_version_id: pId,
          company_id: companyId,
          parent_plan_version_id: annual.company_plan_version_id,
          company_plan_rule_id: annual.company_plan_rule_id,
          company_planning_config_id: annual.company_planning_config_id,
          draft_name: `${labels[i]} (${annual.planning_year})`,
          version_kind: "period",
          status: "draft",
          version_number: 1,
          planning_year: annual.planning_year,
          sequence_index: i + 1,
          period_label: labels[i],
          period_subdivision_mode: mode,
          start_year: annual.start_year,
          end_year: annual.end_year,
          planning_duration_years: 1,
          is_locked: false,
          execution_status: "open",
        },
        { transaction: t }
      );

      // Clone nodes
      const idMap = new Map();
      for (const an of annualNodes) {
        const newNodeId = uuidv4();
        idMap.set(an.company_plan_node_id, newNodeId);

        const defaultPeriodTarget = an.annual_target ? an.annual_target / labels.length : 0;
        await CompanyPlanNode.create(
          {
            company_plan_node_id: newNodeId,
            company_plan_version_id: pId,
            parent_id: an.parent_id ? idMap.get(an.parent_id) || null : null,
            source_company_plan_node_id: an.company_plan_node_id,
            type: an.type,
            title: an.title,
            weight: an.weight,
            weight_mode: an.weight_mode,
            contribution_weight: an.contribution_weight,
            target_unit: an.target_unit,
            level: an.level,
            order: an.order,
            is_active: true,
            period_target: defaultPeriodTarget,
          },
          { transaction: t }
        );
      }
      createdPeriods.push(periodVer);
    }

    await t.commit();
    return createdPeriods;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function getCompanyPeriodTargetAllocations(periodVersionId, companyId) {
  const period = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: periodVersionId, company_id: companyId },
  });
  if (!period) throw new Error("Period version not found");

  return CompanyPlanNode.findAll({
    where: { company_plan_version_id: periodVersionId, is_active: true },
    include: [{ association: "parent" }],
    order: [["level", "ASC"], ["order", "ASC"]],
  });
}

async function updateCompanyPeriodTarget(nodeId, companyId, periodTarget, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");
  if (node.planVersion?.is_locked) {
    throw new Error("Period targets are locked");
  }

  node.period_target = parseFloat(periodTarget) || 0;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "UPDATE_PERIOD_TARGET",
      new_values: { period_target: node.period_target },
      comment: "Updated period target allocation",
    });
  }

  return node;
}

async function getCompanyPeriodFinalizationReadiness(periodVersionId, companyId) {
  const period = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: periodVersionId, company_id: companyId },
  });
  if (!period) throw new Error("Period version not found");

  const nodes = await CompanyPlanNode.findAll({
    where: { company_plan_version_id: periodVersionId, is_active: true },
  });

  const errors = [];
  const kpis = nodes.filter((n) => n.level === 3 || n.type === "kpi");
  const missing = kpis.filter((k) => k.period_target === null || k.period_target === undefined);
  if (missing.length > 0) {
    errors.push(`${missing.length} KPIs are missing period targets.`);
  }

  return {
    ready: errors.length === 0,
    errors,
    kpi_count: kpis.length,
    missing_count: missing.length,
  };
}

async function finalizeCompanyPeriodTargets(periodVersionId, companyId, actor) {
  const readiness = await getCompanyPeriodFinalizationReadiness(periodVersionId, companyId);
  if (!readiness.ready) {
    const err = new Error(`Cannot finalize period targets: ${readiness.errors.join("; ")}`);
    err.status = 400;
    throw err;
  }

  const period = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: periodVersionId, company_id: companyId },
  });

  period.period_targets_finalized_at = new Date();
  period.is_locked = true;
  period.status = "finalized";
  await period.save();

  return period;
}

async function completeCompanyExecutionPeriod(periodVersionId, companyId, actor) {
  const period = await CompanyPlanVersion.findOne({
    where: { company_plan_version_id: periodVersionId, company_id: companyId },
  });
  if (!period) throw new Error("Period version not found");

  period.execution_status = "completed";
  await period.save();
  return period;
}

// -------------------------------------------------------------
// 7. Execution Actuals & Signoff Workflow
// -------------------------------------------------------------

async function updateCompanyPeriodActual(nodeId, companyId, periodActual, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (!canEditAchievementValue(node.period_actual_status)) {
    throw new Error(`Cannot edit actual value while status is "${node.period_actual_status}"`);
  }

  node.period_actual = parseFloat(periodActual) || 0;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "UPDATE_PERIOD_ACTUAL",
      new_values: { period_actual: node.period_actual },
      comment: "Updated reported achievement value",
    });
  }

  return node;
}

async function submitCompanyAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.SUBMITTED)) {
    throw new Error(`Invalid status transition from ${node.period_actual_status} to SUBMITTED`);
  }

  if (payload.period_actual !== undefined) {
    node.period_actual = parseFloat(payload.period_actual) || 0;
  }
  if (payload.narration) node.narration = payload.narration;
  if (Array.isArray(payload.evidence_attachment_ids)) {
    node.evidence_attachment_ids = payload.evidence_attachment_ids;
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.SUBMITTED;
  node.period_actual_submitted_at = new Date();
  node.period_actual_submitted_by = actor?.user_id || null;
  node.period_actual_rejection_comment = null;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "SUBMIT_ACHIEVEMENT",
      comment: payload.comment || "Submitted period achievement for review",
    });
  }

  return node;
}

async function approveCompanyAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.APPROVED)) {
    throw new Error(`Invalid status transition from ${node.period_actual_status} to APPROVED`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.APPROVED;
  node.period_actual_approved_at = new Date();
  node.period_actual_approved_by = actor?.user_id || null;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "APPROVE_ACHIEVEMENT",
      comment: payload.comment || "Approved reported achievement",
    });
  }

  return node;
}

async function rejectCompanyAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.REJECTED)) {
    throw new Error(`Invalid status transition from ${node.period_actual_status} to REJECTED`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.REJECTED;
  node.period_actual_rejection_comment = payload.comment || "Achievement returned with comments";
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "REJECT_ACHIEVEMENT",
      comment: payload.comment,
    });
  }

  return node;
}

async function validateCompanyAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (!canTransitionAchievementStatus(node.period_actual_status, ACHIEVEMENT_STATUS.VALIDATED)) {
    throw new Error(`Invalid status transition from ${node.period_actual_status} to VALIDATED`);
  }

  node.period_actual_status = ACHIEVEMENT_STATUS.VALIDATED;
  node.period_actual_validated_at = new Date();
  node.period_actual_validated_by = actor?.user_id || null;
  await node.save();

  if (actor?.user_id) {
    await CompanyPlanNodeActionLog.create({
      action_log_id: uuidv4(),
      company_plan_node_id: nodeId,
      user_id: actor.user_id,
      action: "VALIDATE_ACHIEVEMENT",
      comment: payload.comment || "Validated achievement",
    });
  }

  return node;
}

async function rejectValidationCompanyAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  node.period_actual_status = ACHIEVEMENT_STATUS.SUBMITTED;
  node.period_actual_rejection_comment = payload.comment || "Validation requested revision";
  await node.save();

  return node;
}

// Annual Achievement Signoffs
async function submitCompanyAnnualAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  if (payload.annual_actual !== undefined) {
    node.annual_actual = parseFloat(payload.annual_actual) || 0;
  }
  node.annual_actual_status = ACHIEVEMENT_STATUS.SUBMITTED;
  node.annual_actual_submitted_at = new Date();
  node.annual_actual_submitted_by = actor?.user_id || null;
  await node.save();

  return node;
}

async function approveCompanyAnnualAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  node.annual_actual_status = ACHIEVEMENT_STATUS.APPROVED;
  node.annual_actual_approved_at = new Date();
  node.annual_actual_approved_by = actor?.user_id || null;
  await node.save();

  return node;
}

async function rejectCompanyAnnualAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  node.annual_actual_status = ACHIEVEMENT_STATUS.REJECTED;
  node.annual_actual_rejection_comment = payload.comment || "Returned";
  await node.save();

  return node;
}

async function validateCompanyAnnualAchievement(nodeId, companyId, payload, actor) {
  const node = await getCompanyPlanNodeById(nodeId, companyId);
  if (!node) throw new Error("Plan node not found");

  node.annual_actual_status = ACHIEVEMENT_STATUS.VALIDATED;
  node.annual_actual_validated_at = new Date();
  node.annual_actual_validated_by = actor?.user_id || null;
  await node.save();

  return node;
}

// -------------------------------------------------------------
// 8. Execution Dashboard & Analytics Service
// -------------------------------------------------------------

async function getCompanyExecutionDashboardSummary(companyId, query = {}) {
  const company = await Company.findByPk(companyId);
  if (!company) throw new Error("Company not found");

  // Fetch active master plans
  const masterPlans = await CompanyPlanVersion.findAll({
    where: { company_id: companyId, version_kind: "master" },
    include: [{ association: "planRule" }],
    order: [["created_at", "DESC"]],
  });

  const activeMaster = masterPlans[0] || null;
  let totalNodes = 0;
  let totalKpis = 0;
  let totalProgress = 0;
  let approvedKpis = 0;
  let delayedKpis = 0;

  if (activeMaster) {
    const nodes = await CompanyPlanNode.findAll({
      where: { company_plan_version_id: activeMaster.company_plan_version_id, is_active: true },
    });
    totalNodes = nodes.length;
    const kpis = nodes.filter((n) => n.level === 3 || n.type === "kpi");
    totalKpis = kpis.length;

    let sumProgress = 0;
    kpis.forEach((k) => {
      const target = k.annual_target || k.period_target || 0;
      const actual = k.annual_actual || k.period_actual || 0;
      const progress = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
      sumProgress += progress;

      if (k.period_actual_status === "approved" || k.period_actual_status === "validated") {
        approvedKpis++;
      }
      if (progress < 50 && target > 0) {
        delayedKpis++;
      }
    });

    totalProgress = totalKpis > 0 ? Math.round((sumProgress / totalKpis) * 100) / 100 : 0;
  }

  const annualsCount = await CompanyPlanVersion.count({
    where: { company_id: companyId, version_kind: "annual" },
  });
  const periodsCount = await CompanyPlanVersion.count({
    where: { company_id: companyId, version_kind: "period" },
  });

  return {
    company: {
      company_id: company.company_id,
      name: company.name,
      code: company.code,
    },
    active_master_plan: activeMaster,
    metrics: {
      total_master_plans: masterPlans.length,
      total_annual_plans: annualsCount,
      total_execution_periods: periodsCount,
      total_plan_nodes: totalNodes,
      total_kpis: totalKpis,
      approved_kpis: approvedKpis,
      delayed_kpis: delayedKpis,
      overall_execution_progress: totalProgress,
    },
  };
}

async function getCompanyExecutionDashboardProgressTree(companyId, query = {}) {
  let targetVersionId = query.plan_version_id;
  if (!targetVersionId) {
    const latestMaster = await CompanyPlanVersion.findOne({
      where: { company_id: companyId, version_kind: "master" },
      order: [["created_at", "DESC"]],
    });
    if (latestMaster) targetVersionId = latestMaster.company_plan_version_id;
  }

  if (!targetVersionId) {
    return { version: null, tree: [] };
  }

  return getCompanyPlanHierarchy(targetVersionId, companyId);
}

async function getCompanyExecutionDashboardDepartmentUser(companyId, query = {}) {
  const departments = await CompanyStructure.findAll({
    where: { company_id: companyId, is_active: true },
    order: [["level", "ASC"], ["name", "ASC"]],
  });

  const results = [];
  for (const dept of departments) {
    const assignments = await CompanyInternalAssignment.findAll({
      where: { company_structure_id: dept.company_structure_id, is_active: true },
      include: [{ association: "planNode" }],
    });

    let assignedCount = assignments.length;
    let sumProgress = 0;
    assignments.forEach((a) => {
      const node = a.planNode;
      if (node) {
        const target = node.annual_target || node.period_target || 0;
        const actual = node.annual_actual || node.period_actual || 0;
        const progress = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
        sumProgress += progress;
      }
    });

    const avgProgress = assignedCount > 0 ? Math.round((sumProgress / assignedCount) * 10) / 10 : 0;
    results.push({
      company_structure_id: dept.company_structure_id,
      name: dept.name,
      level: dept.level,
      assigned_nodes_count: assignedCount,
      avg_progress: avgProgress,
      status: avgProgress >= 75 ? "on_track" : avgProgress >= 40 ? "needs_attention" : "delayed",
    });
  }

  return { departments: results };
}

module.exports = {
  // Configuration & Rules
  initializeCompanyPlanningDefaults,
  getEffectiveCompanyPlanningConfig,
  updateCompanyPlanningConfig,
  listCompanyPlanRules,
  getCompanyPlanRuleById,
  createCompanyPlanRule,
  updateCompanyPlanRule,
  deleteCompanyPlanRule,

  // Plan Version Management
  createCompanyPlanDraft,
  listCompanyPlanVersions,
  getCompanyPlanVersionById,
  updateCompanyPlanVersion,
  deleteCompanyPlanVersion,
  duplicateCompanyPlanDraft,

  // Hierarchy & Nodes
  getCompanyPlanHierarchy,
  createCompanyPlanNode,
  getCompanyPlanNodeById,
  updateCompanyPlanNode,
  deleteCompanyPlanNode,
  reorderCompanyPlanNodes,

  // Finalization & Start
  getCompanyDraftFinalizationReadiness,
  finalizeCompanyPlanDraft,
  reopenCompanyPlanDraftForEdit,
  getCompanyStartProcessReadiness,
  startCompanyPlanProcess,

  // Annual Planning
  listCompanyAnnualVersions,
  getCompanyAnnualTargetAllocations,
  updateCompanyAnnualTarget,
  getCompanyAnnualExecutionReadiness,
  finalizeCompanyAnnualExecution,
  lockCompanyAnnualPlan,
  unlockCompanyAnnualPlan,
  completeCompanyAnnualPlan,

  // Period Planning
  listCompanyExecutionPeriods,
  initializeCompanyExecutionPeriods,
  getCompanyPeriodTargetAllocations,
  updateCompanyPeriodTarget,
  getCompanyPeriodFinalizationReadiness,
  finalizeCompanyPeriodTargets,
  completeCompanyExecutionPeriod,

  // Execution Reporting & Workflow
  updateCompanyPeriodActual,
  submitCompanyAchievement,
  approveCompanyAchievement,
  rejectCompanyAchievement,
  validateCompanyAchievement,
  rejectValidationCompanyAchievement,
  submitCompanyAnnualAchievement,
  approveCompanyAnnualAchievement,
  rejectCompanyAnnualAchievement,
  validateCompanyAnnualAchievement,

  // Dashboard & Metrics
  getCompanyExecutionDashboardSummary,
  getCompanyExecutionDashboardProgressTree,
  getCompanyExecutionDashboardDepartmentUser,
};
