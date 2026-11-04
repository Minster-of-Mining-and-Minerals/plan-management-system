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
  RegionalPerformanceColorThreshold,
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

const {
  submitRegionalAchievementWorkflow,
  approveRegionalAchievementWorkflow,
  rejectRegionalAchievementWorkflow,
  validateRegionalAchievementWorkflow,
  rejectValidationRegionalAchievementWorkflow,
  isRollupEligibleAchievement,
  isRollupEligibleAchievementStatus,
  userCanExecuteRegionalAchievement,
  userCanApproveRegionalAchievement,
  userCanValidateRegionalAchievement,
  userQualifiesForRegionalBypass,
  assertUserCanAccessPlanNode,
  assertUserCanExecuteAchievement,
  assertUserCanApproveAchievement,
  assertUserCanValidateAchievement,
  isRegionalStructureAncestor,
} = require("./regionalPlanAchievementWorkflowService");

const {
  normalizeTargetUnits,
  normalizeCustomPeriods,
  resolvePeriodLabelsForMode,
  validateBreakdownConfiguration,
  computePlanningPeriodEnd,
  validatePlanningStartDate,
  validatePlanningDuration,
  validateYearRange,
  validateNodeTargetUnit,
  QUARTERLY_PERIOD_LABELS,
  SEMI_ANNUAL_PERIOD_LABELS,
} = require("./planningConfigurationService");

const {
  normalizeRuleSteps,
  enrichRuleSteps,
  getMaxDepth,
  getStepForLevel,
  getStepLabel,
  levelToNodeType,
  getStepTargetRequirement,
  stepAllowsTarget,
  stepRequiresTarget,
  stepTargetIsOptional,
  stepRequiresWeight,
  stepRequiresContributionWeight,
  getStepAssignmentRequirement,
  stepAllowsAssignment,
  stepRequiresAssignment,
  getAssignmentStartLevel,
  isWeightModeSelectionLevel,
  resolveNodeWeightMode,
  getWeightTarget,
  getWeightUnitLabel,
  getContributionSiblingTarget,
  canAddChild,
} = require("./planRuleStepUtils");

// -------------------------------------------------------------
// Helper: Default Regional Configuration & Rule Initializer
// -------------------------------------------------------------

const DEFAULT_TARGET_UNITS = [
  { id: "person", label: "Person", symbol: "persons" },
  { id: "km", label: "Kilometer", symbol: "km" },
  { id: "birr", label: "Birr", symbol: "ETB" },
  { id: "ton", label: "Ton", symbol: "t" },
  { id: "unit", label: "Unit", symbol: "units" },
  { id: "kg", label: "Kilogram", symbol: "kg" },
];

async function ensureDefaultRegionalPlanningConfig(regionId, transaction) {
  let config = await RegionalPlanningConfiguration.findOne({
    where: { region_id: regionId, owned_by_plan_version_id: null },
    order: [["created_at", "DESC"]],
    transaction,
  });

  if (!config) {
    config = await RegionalPlanningConfiguration.create(
      {
        regional_planning_config_id: uuidv4(),
        region_id: regionId,
        min_duration_years: 1,
        max_duration_years: 10,
        draft_entity_label_singular: "Plan Draft",
        draft_entity_label_plural: "Plan Drafts",
        create_action_label: "Create Plan Draft",
        planning_period_label: "Planning Period",
        duration_label: "Duration",
        start_year_label: "Start Date",
        end_year_label: "End Date",
        target_units: DEFAULT_TARGET_UNITS,
        breakdown_mode: "quarterly",
        custom_periods: [],
        owned_by_plan_version_id: null,
      },
      { transaction }
    );
  }
  return config;
}

async function ensureDefaultRegionalPlanRule(regionId, transaction) {
  let rule = await RegionalPlanRule.findOne({
    where: { region_id: regionId, is_active: true, owned_by_plan_version_id: null },
    include: [{ association: "steps" }],
    order: [["created_at", "DESC"]],
    transaction,
  });

  if (!rule) {
    const ruleId = uuidv4();
    rule = await RegionalPlanRule.create(
      {
        regional_plan_rule_id: ruleId,
        region_id: regionId,
        name: "Standard 4-Level Planning Rule",
        is_active: true,
        performance_scoring_policy: "CAP_100",
        amendment_policy: {
          completed_periods_editable: false,
          automatic_redistribution: "manual",
          allow_emergency_approvals: false,
          allow_structural_amendments_after_execution: true,
          allow_ownership_transfer: true,
        },
      },
      { transaction }
    );

    const defaultSteps = [
      { level: 1, name: "Strategic Priority", node_type: "strategic", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#8B5CF6" },
      { level: 2, name: "Goal", node_type: "goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#3B82F6" },
      { level: 3, name: "Key Performance Indicator (KPI)", node_type: "kpi", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, color_hex: "#10B981" },
      { level: 4, name: "Operational Activity / Task", node_type: "task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true, color_hex: "#F59E0B" },
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

const DEFAULT_PERFORMANCE_COLOR_THRESHOLDS = [
  { label: "No Performance", min_percentage: 0, max_percentage: 0, color_hex: "#DC2626", sort_order: 1 },
  { label: "Very Poor", min_percentage: 1, max_percentage: 24, color_hex: "#EF4444", sort_order: 2 },
  { label: "Poor", min_percentage: 25, max_percentage: 49, color_hex: "#F97316", sort_order: 3 },
  { label: "Average", min_percentage: 50, max_percentage: 69, color_hex: "#EAB308", sort_order: 4 },
  { label: "Good", min_percentage: 70, max_percentage: 84, color_hex: "#22C55E", sort_order: 5 },
  { label: "Very Good", min_percentage: 85, max_percentage: 99, color_hex: "#16A34A", sort_order: 6 },
  { label: "Completed", min_percentage: 100, max_percentage: 100, color_hex: "#15803D", sort_order: 7 },
];

async function ensureDefaultRegionalPerformanceColorThresholds(regionId, transaction) {
  const count = await RegionalPerformanceColorThreshold.count({
    where: { region_id: regionId },
    transaction,
  });

  if (count === 0) {
    for (const t of DEFAULT_PERFORMANCE_COLOR_THRESHOLDS) {
      await RegionalPerformanceColorThreshold.create(
        {
          regional_performance_color_threshold_id: uuidv4(),
          region_id: regionId,
          ...t,
          is_active: true,
        },
        { transaction }
      );
    }
  }
}

async function initializeRegionalPlanningDefaults(regionId, transaction = null) {
  const config = await ensureDefaultRegionalPlanningConfig(regionId, transaction);
  const rule = await ensureDefaultRegionalPlanRule(regionId, transaction);
  await ensureDefaultRegionalPerformanceColorThresholds(regionId, transaction);
  return { config, rule };
}

// -------------------------------------------------------------
// Snapshot Forking Helpers
// -------------------------------------------------------------

function resolveDefaultRegionalRuleSteps(name = "") {
  const is3Level = String(name).includes("3");
  if (is3Level) {
    return [
      { level: 1, name: "SF", node_type: "strategic", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#8B5CF6" },
      { level: 2, name: "Goal", node_type: "goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#3B82F6" },
      { level: 3, name: "KPI", node_type: "kpi", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, color_hex: "#10B981" },
    ];
  }
  return [
    { level: 1, name: "Strategic Priority", node_type: "strategic", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#8B5CF6" },
    { level: 2, name: "Goal", node_type: "goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, color_hex: "#3B82F6" },
    { level: 3, name: "Key Performance Indicator (KPI)", node_type: "kpi", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, color_hex: "#10B981" },
    { level: 4, name: "Operational Activity / Task", node_type: "task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true, color_hex: "#F59E0B" },
  ];
}

async function forkRegionalPlanRule(sourceRule, regionalPlanVersionId, transaction = null) {
  if (!sourceRule) return null;

  const plain =
    typeof sourceRule.get === "function" ? sourceRule.get({ plain: true }) : sourceRule;

  let steps =
    sourceRule.steps ??
    (await RegionalPlanRuleStep.findAll({
      where: { regional_plan_rule_id: plain.regional_plan_rule_id },
      order: [["level", "ASC"]],
      transaction,
    }));

  if (!steps || steps.length === 0) {
    steps = resolveDefaultRegionalRuleSteps(plain.name);
  }

  const forkedRule = await RegionalPlanRule.create(
    {
      regional_plan_rule_id: uuidv4(),
      region_id: plain.region_id,
      name: plain.name,
      is_active: plain.is_active !== false,
      owned_by_plan_version_id: regionalPlanVersionId,
      source_regional_plan_rule_id: plain.regional_plan_rule_id,
      performance_scoring_policy: plain.performance_scoring_policy || "CAP_100",
      amendment_policy: plain.amendment_policy || {
        completed_periods_editable: false,
        automatic_redistribution: "manual",
        allow_emergency_approvals: false,
        allow_structural_amendments_after_execution: true,
        allow_ownership_transfer: true,
      },
    },
    { transaction }
  );

  for (const step of steps) {
    const stepPlain =
      typeof step.get === "function" ? step.get({ plain: true }) : step;
    const stepLevel = stepPlain.level ?? stepPlain.step_order ?? 1;
    await RegionalPlanRuleStep.create(
      {
        regional_plan_rule_step_id: uuidv4(),
        regional_plan_rule_id: forkedRule.regional_plan_rule_id,
        level: stepLevel,
        name: stepPlain.name ?? stepPlain.label ?? `Level ${stepLevel}`,
        node_type: stepPlain.node_type || levelToNodeType(stepLevel),
        requires_weight: Boolean(stepPlain.requires_weight),
        requires_contribution_weight: Boolean(stepPlain.requires_contribution_weight),
        allow_kpi: Boolean(stepPlain.allow_kpi ?? stepPlain.requires_weight),
        requires_assignment: Boolean(stepPlain.requires_assignment),
        assignment_requirement: stepPlain.assignment_requirement || (stepPlain.requires_assignment ? "required" : (stepPlain.allow_assignment ? "optional" : "none")),
        allow_assignment: Boolean(stepPlain.allow_assignment ?? stepPlain.requires_assignment),
        color_hex: stepPlain.color_hex || "#6B7280",
      },
      { transaction }
    );
  }

  return RegionalPlanRule.findByPk(forkedRule.regional_plan_rule_id, {
    include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
    transaction,
  });
}

async function forkRegionalPlanningConfiguration(sourceConfig, regionalPlanVersionId, transaction = null) {
  if (!sourceConfig) return null;

  const plain = typeof sourceConfig.get === "function" ? sourceConfig.get({ plain: true }) : sourceConfig;

  return RegionalPlanningConfiguration.create(
    {
      regional_planning_config_id: uuidv4(),
      region_id: plain.region_id,
      min_duration_years: plain.min_duration_years,
      max_duration_years: plain.max_duration_years,
      draft_entity_label_singular: plain.draft_entity_label_singular,
      draft_entity_label_plural: plain.draft_entity_label_plural,
      create_action_label: plain.create_action_label,
      planning_period_label: plain.planning_period_label,
      duration_label: plain.duration_label,
      start_year_label: plain.start_year_label,
      end_year_label: plain.end_year_label,
      target_units: plain.target_units,
      breakdown_mode: plain.breakdown_mode,
      custom_periods: plain.custom_periods,
      owned_by_plan_version_id: regionalPlanVersionId,
      source_regional_planning_config_id: plain.regional_planning_config_id,
    },
    { transaction }
  );
}

async function attachDraftSnapshotsToRegionalPlanVersion(regionalPlanVersion, transaction = null) {
  const version = await RegionalPlanVersion.findByPk(regionalPlanVersion.regional_plan_version_id, { transaction });
  if (!version || version.version_kind !== "master") {
    return version;
  }

  const updates = {};

  const existingRule = version.regional_plan_rule_id
    ? await RegionalPlanRule.findByPk(version.regional_plan_rule_id, { transaction })
    : null;

  if (existingRule?.owned_by_plan_version_id === version.regional_plan_version_id) {
    // already owns a forked rule
  } else {
    const sourceRule =
      existingRule ??
      (await RegionalPlanRule.findOne({
        where: {
          region_id: version.region_id,
          is_active: true,
          owned_by_plan_version_id: null,
        },
        transaction,
      }));
    if (sourceRule) {
      const forkedRule = await forkRegionalPlanRule(sourceRule, version.regional_plan_version_id, transaction);
      updates.regional_plan_rule_id = forkedRule.regional_plan_rule_id;
    }
  }

  const existingConfig = version.regional_planning_config_id
    ? await RegionalPlanningConfiguration.findByPk(version.regional_planning_config_id, { transaction })
    : null;

  if (existingConfig?.owned_by_plan_version_id === version.regional_plan_version_id) {
    // already owns a forked config
  } else {
    const effectiveConfig =
      existingConfig ??
      (await RegionalPlanningConfiguration.findOne({
        where: {
          region_id: version.region_id,
          owned_by_plan_version_id: null,
        },
        transaction,
      }));
    if (effectiveConfig) {
      const forkedConfig = await forkRegionalPlanningConfiguration(
        effectiveConfig,
        version.regional_plan_version_id,
        transaction
      );
      updates.regional_planning_config_id = forkedConfig.regional_planning_config_id;
    }
  }

  if (Object.keys(updates).length > 0) {
    await version.update(updates, { transaction });
  }

  return version;
}

// -------------------------------------------------------------
// 1. Regional Planning Configuration & Rules Service
// -------------------------------------------------------------

function formatRegionalRuleResponse(rule) {
  if (!rule) return rule;
  const plain = typeof rule.get === "function" ? rule.get({ plain: true }) : rule.toJSON?.() ?? rule;
  let stepsList = plain.steps;
  if (!stepsList || stepsList.length === 0) {
    stepsList = resolveDefaultRegionalRuleSteps(plain.name);
  }
  const rawSteps = stepsList.map((s) => ({
    ...s,
    step_order: s.level ?? s.step_order,
    label: s.name ?? s.label,
    node_type: s.node_type ?? levelToNodeType(s.level ?? s.step_order ?? 1),
    color_hex: s.color_hex || "#6B7280",
  }));
  return {
    ...plain,
    steps: enrichRuleSteps(rawSteps),
  };
}

async function getEffectiveRegionalPlanningConfig(regionId) {
  return ensureDefaultRegionalPlanningConfig(regionId);
}

async function updateRegionalPlanningConfig(regionId, payload) {
  let config = await RegionalPlanningConfiguration.findOne({
    where: { region_id: regionId, owned_by_plan_version_id: null },
  });
  if (!config) {
    config = await ensureDefaultRegionalPlanningConfig(regionId);
  }

  const nextMin =
    payload.min_duration_years !== undefined
      ? Number(payload.min_duration_years)
      : config.min_duration_years;
  const nextMax =
    payload.max_duration_years !== undefined
      ? Number(payload.max_duration_years)
      : config.max_duration_years;

  if (nextMin > nextMax) {
    const error = new Error("Minimum duration cannot exceed maximum duration.");
    error.status = 400;
    throw error;
  }

  let nextTargetUnits = config.target_units;
  if (payload.target_units !== undefined) {
    const normalizedUnits = normalizeTargetUnits(payload.target_units);
    if (!normalizedUnits.valid) {
      const error = new Error(normalizedUnits.message);
      error.status = 400;
      throw error;
    }
    nextTargetUnits = normalizedUnits.units;
  }

  const nextBreakdownMode =
    payload.breakdown_mode ?? config.breakdown_mode ?? "quarterly";
  let nextCustomPeriods =
    payload.custom_periods ?? config.custom_periods ?? [];

  if (payload.breakdown_mode !== undefined || payload.custom_periods !== undefined) {
    const breakdownValidation = validateBreakdownConfiguration(
      nextBreakdownMode,
      nextCustomPeriods
    );
    if (!breakdownValidation.valid) {
      const error = new Error(breakdownValidation.message);
      error.status = 400;
      throw error;
    }
    if (nextBreakdownMode === "custom") {
      nextCustomPeriods = breakdownValidation.periods;
    }
  }

  await config.update({
    min_duration_years: nextMin,
    max_duration_years: nextMax,
    draft_entity_label_singular:
      payload.draft_entity_label_singular !== undefined
        ? String(payload.draft_entity_label_singular).trim()
        : config.draft_entity_label_singular,
    draft_entity_label_plural:
      payload.draft_entity_label_plural !== undefined
        ? String(payload.draft_entity_label_plural).trim()
        : config.draft_entity_label_plural,
    create_action_label:
      payload.create_action_label !== undefined
        ? String(payload.create_action_label).trim()
        : config.create_action_label,
    planning_period_label:
      payload.planning_period_label !== undefined
        ? String(payload.planning_period_label).trim()
        : config.planning_period_label,
    duration_label:
      payload.duration_label !== undefined
        ? String(payload.duration_label).trim()
        : config.duration_label,
    start_year_label:
      payload.start_year_label !== undefined
        ? String(payload.start_year_label).trim()
        : config.start_year_label,
    end_year_label:
      payload.end_year_label !== undefined
        ? String(payload.end_year_label).trim()
        : config.end_year_label,
    target_units: nextTargetUnits,
    breakdown_mode: nextBreakdownMode,
    custom_periods: nextCustomPeriods,
  });

  // Synchronize unfinalized master draft plans in this region so newly added units are immediately available
  const draftPlans = await RegionalPlanVersion.findAll({
    where: { region_id: regionId, version_kind: "master", status: "draft" },
  });

  for (const draft of draftPlans) {
    if (draft.regional_planning_config_id) {
      const draftConfig = await RegionalPlanningConfiguration.findByPk(draft.regional_planning_config_id);
      if (draftConfig && draftConfig.owned_by_plan_version_id === draft.regional_plan_version_id) {
        await draftConfig.update({
          target_units: nextTargetUnits,
          breakdown_mode: nextBreakdownMode,
          custom_periods: nextCustomPeriods,
          min_duration_years: nextMin,
          max_duration_years: nextMax,
          draft_entity_label_singular: config.draft_entity_label_singular,
          draft_entity_label_plural: config.draft_entity_label_plural,
          create_action_label: config.create_action_label,
          planning_period_label: config.planning_period_label,
          duration_label: config.duration_label,
          start_year_label: config.start_year_label,
          end_year_label: config.end_year_label,
        });
      }
    }
  }

  return config;
}

async function restoreDefaultRegionalPlanningConfig(regionId) {
  const config = await ensureDefaultRegionalPlanningConfig(regionId);
  await config.update({
    min_duration_years: 1,
    max_duration_years: 10,
    draft_entity_label_singular: "Plan Draft",
    draft_entity_label_plural: "Plan Drafts",
    create_action_label: "Create Plan Draft",
    planning_period_label: "Planning Period",
    duration_label: "Duration",
    start_year_label: "Start Date",
    end_year_label: "End Date",
    target_units: DEFAULT_TARGET_UNITS,
    breakdown_mode: "quarterly",
    custom_periods: [],
  });
  return config;
}

async function listRegionalPlanRules(regionId) {
  const rules = await RegionalPlanRule.findAll({
    where: { region_id: regionId, owned_by_plan_version_id: null },
    include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
    order: [["created_at", "DESC"]],
  });
  return rules.map(formatRegionalRuleResponse);
}

async function getRegionalPlanRuleById(ruleId, regionId) {
  const rule = await RegionalPlanRule.findOne({
    where: { regional_plan_rule_id: ruleId, region_id: regionId },
    include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
  });
  if (!rule) {
    const existsOther = await RegionalPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another region");
      error.status = 403;
      throw error;
    }
    return null;
  }
  return formatRegionalRuleResponse(rule);
}

async function getRegionalPlanRuleForVersion(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (version.planRule) {
    return formatRegionalRuleResponse(version.planRule);
  }

  const rule = await RegionalPlanRule.findOne({
    where: { region_id: regionId, is_active: true, owned_by_plan_version_id: null },
    include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
    order: [["created_at", "DESC"]],
  });
  if (!rule) {
    const error = new Error("Plan rule not found for version or region");
    error.status = 404;
    throw error;
  }
  return formatRegionalRuleResponse(rule);
}

async function updateRegionalPlanRuleForVersion(versionId, regionId, payload) {
  const t = await sequelize.transaction();
  try {
    let version = await RegionalPlanVersion.findOne({
      where: { regional_plan_version_id: versionId, region_id: regionId },
      transaction: t,
    });
    if (!version) {
      const err = new Error("Plan version not found");
      err.status = 404;
      throw err;
    }

    if (version.version_kind !== "master" || version.status !== "draft") {
      const err = new Error("Only draft master plans can update their plan rule snapshot.");
      err.status = 400;
      throw err;
    }

    version = await attachDraftSnapshotsToRegionalPlanVersion(version, t);

    const rule = await RegionalPlanRule.findOne({
      where: {
        regional_plan_rule_id: version.regional_plan_rule_id,
        region_id: regionId,
      },
      transaction: t,
    });

    if (!rule || rule.owned_by_plan_version_id !== version.regional_plan_version_id) {
      const err = new Error("This plan draft does not have an owned plan rule snapshot.");
      err.status = 404;
      throw err;
    }

    if (payload.name) rule.name = payload.name;
    if (payload.is_active !== undefined) rule.is_active = payload.is_active;
    if (payload.performance_scoring_policy) {
      rule.performance_scoring_policy = payload.performance_scoring_policy;
    }
    if (payload.amendment_policy) {
      rule.amendment_policy = payload.amendment_policy;
    }
    await rule.save({ transaction: t });

    if (Array.isArray(payload.steps)) {
      const inputSteps = payload.steps.map((s, idx) => ({
        step_order: s.step_order || s.level || idx + 1,
        label: s.label || s.name || `Level ${idx + 1}`,
        target_requirement: s.target_requirement,
        allow_kpi: s.allow_kpi,
        requires_weight: s.target_requirement === "required" ? true : (s.target_requirement === "optional" || s.target_requirement === "none" ? false : !!s.requires_weight),
        requires_contribution_weight: !!s.requires_contribution_weight,
        assignment_requirement: s.assignment_requirement,
        allow_assignment: s.allow_assignment,
        requires_assignment: s.assignment_requirement === "required" ? true : (s.assignment_requirement === "optional" || s.assignment_requirement === "none" ? false : !!s.requires_assignment),
        color_hex: s.color_hex,
      }));
      const normalizedSteps = normalizeRuleSteps(inputSteps);

      await RegionalPlanRuleStep.destroy({
        where: { regional_plan_rule_id: rule.regional_plan_rule_id },
        transaction: t,
      });

      await RegionalPlanRuleStep.bulkCreate(
        normalizedSteps.map((step) => ({
          regional_plan_rule_step_id: uuidv4(),
          regional_plan_rule_id: rule.regional_plan_rule_id,
          level: step.step_order,
          name: step.label,
          node_type: step.node_type || levelToNodeType(step.step_order),
          requires_weight: step.requires_weight,
          requires_contribution_weight: step.requires_contribution_weight,
          allow_kpi: step.allow_kpi !== undefined ? step.allow_kpi : (step.target_requirement === "required" || step.target_requirement === "optional" ? true : (step.target_requirement === "none" ? false : Boolean(step.allow_kpi ?? step.requires_weight))),
          requires_assignment: step.requires_assignment,
          assignment_requirement: step.assignment_requirement,
          allow_assignment: step.allow_assignment,
          color_hex: step.color_hex,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    return getRegionalPlanRuleById(rule.regional_plan_rule_id, regionId);
  } catch (err) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw err;
  }
}

async function getRegionalPlanningConfigForVersion(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (version.planningConfiguration) {
    return version.planningConfiguration;
  }

  const config = await RegionalPlanningConfiguration.findOne({
    where: { region_id: regionId, owned_by_plan_version_id: null },
    order: [["created_at", "DESC"]],
  });
  if (!config) {
    const error = new Error("Regional planning configuration not found for region.");
    error.status = 404;
    throw error;
  }
  return config;
}

async function updateRegionalPlanningConfigForVersion(versionId, regionId, payload) {
  const t = await sequelize.transaction();
  try {
    let version = await RegionalPlanVersion.findOne({
      where: { regional_plan_version_id: versionId, region_id: regionId },
      transaction: t,
    });
    if (!version) {
      const err = new Error("Plan version not found");
      err.status = 404;
      throw err;
    }

    if (version.version_kind !== "master" || version.status !== "draft") {
      const err = new Error("Only draft master plans can update their planning configuration snapshot.");
      err.status = 400;
      throw err;
    }

    version = await attachDraftSnapshotsToRegionalPlanVersion(version, t);

    const config = await RegionalPlanningConfiguration.findOne({
      where: {
        regional_planning_config_id: version.regional_planning_config_id,
        region_id: regionId,
      },
      transaction: t,
    });

    if (!config || config.owned_by_plan_version_id !== version.regional_plan_version_id) {
      const err = new Error("This plan draft does not have an owned planning configuration snapshot.");
      err.status = 404;
      throw err;
    }

    const nextMin =
      payload.min_duration_years !== undefined
        ? Number(payload.min_duration_years)
        : config.min_duration_years;
    const nextMax =
      payload.max_duration_years !== undefined
        ? Number(payload.max_duration_years)
        : config.max_duration_years;

    if (nextMin > nextMax) {
      const err = new Error("Minimum duration cannot exceed maximum duration.");
      err.status = 400;
      throw err;
    }

    let nextTargetUnits = config.target_units;
    if (payload.target_units !== undefined) {
      const normalizedUnits = normalizeTargetUnits(payload.target_units);
      if (!normalizedUnits.valid) {
        const err = new Error(normalizedUnits.message);
        err.status = 400;
        throw err;
      }
      nextTargetUnits = normalizedUnits.units;
    }

    const nextBreakdownMode =
      payload.breakdown_mode ?? config.breakdown_mode ?? "quarterly";
    let nextCustomPeriods =
      payload.custom_periods ?? config.custom_periods ?? [];

    if (payload.breakdown_mode !== undefined || payload.custom_periods !== undefined) {
      const breakdownValidation = validateBreakdownConfiguration(
        nextBreakdownMode,
        nextCustomPeriods
      );
      if (!breakdownValidation.valid) {
        const err = new Error(breakdownValidation.message);
        err.status = 400;
        throw err;
      }
      if (nextBreakdownMode === "custom") {
        nextCustomPeriods = breakdownValidation.periods;
      }
    }

    await config.update(
      {
        min_duration_years: nextMin,
        max_duration_years: nextMax,
        draft_entity_label_singular:
          payload.draft_entity_label_singular !== undefined
            ? String(payload.draft_entity_label_singular).trim()
            : config.draft_entity_label_singular,
        draft_entity_label_plural:
          payload.draft_entity_label_plural !== undefined
            ? String(payload.draft_entity_label_plural).trim()
            : config.draft_entity_label_plural,
        create_action_label:
          payload.create_action_label !== undefined
            ? String(payload.create_action_label).trim()
            : config.create_action_label,
        planning_period_label:
          payload.planning_period_label !== undefined
            ? String(payload.planning_period_label).trim()
            : config.planning_period_label,
        duration_label:
          payload.duration_label !== undefined
            ? String(payload.duration_label).trim()
            : config.duration_label,
        start_year_label:
          payload.start_year_label !== undefined
            ? String(payload.start_year_label).trim()
            : config.start_year_label,
        end_year_label:
          payload.end_year_label !== undefined
            ? String(payload.end_year_label).trim()
            : config.end_year_label,
        target_units: nextTargetUnits,
        breakdown_mode: nextBreakdownMode,
        custom_periods: nextCustomPeriods,
      },
      { transaction: t }
    );

    await t.commit();
    return config;
  } catch (err) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw err;
  }
}

async function createRegionalPlanRule(regionId, payload) {
  const t = await sequelize.transaction();
  try {
    let normalizedSteps;
    if (Array.isArray(payload.steps) && payload.steps.length > 0) {
      const inputSteps = payload.steps.map((s, idx) => ({
        step_order: s.step_order || s.level || idx + 1,
        label: s.label || s.name || `Level ${idx + 1}`,
        target_requirement: s.target_requirement,
        allow_kpi: s.allow_kpi,
        requires_weight: s.target_requirement === "required" ? true : (s.target_requirement === "optional" || s.target_requirement === "none" ? false : !!s.requires_weight),
        requires_contribution_weight: !!s.requires_contribution_weight,
        assignment_requirement: s.assignment_requirement,
        allow_assignment: s.allow_assignment,
        requires_assignment: s.assignment_requirement === "required" ? true : (s.assignment_requirement === "optional" || s.assignment_requirement === "none" ? false : !!s.requires_assignment),
        color_hex: s.color_hex,
      }));
      normalizedSteps = normalizeRuleSteps(inputSteps);
    } else {
      const defaultSteps = [
        { step_order: 1, label: "Strategic Priority", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, requires_assignment: false, assignment_requirement: "none", color_hex: "#8B5CF6" },
        { step_order: 2, label: "Goal", requires_weight: false, requires_contribution_weight: false, allow_kpi: false, requires_assignment: false, assignment_requirement: "none", color_hex: "#3B82F6" },
        { step_order: 3, label: "Key Performance Indicator (KPI)", requires_weight: true, requires_contribution_weight: true, allow_kpi: true, requires_assignment: true, assignment_requirement: "required", color_hex: "#10B981" },
        { step_order: 4, label: "Operational Activity / Task", requires_weight: false, requires_contribution_weight: true, allow_kpi: true, requires_assignment: true, assignment_requirement: "required", color_hex: "#F59E0B" },
      ];
      normalizedSteps = normalizeRuleSteps(defaultSteps);
    }

    const isActive = payload.is_active !== undefined ? payload.is_active : true;

    // If active, deactivate other template rules in this region to prevent unique constraint violation
    if (isActive) {
      await RegionalPlanRule.update(
        { is_active: false },
        {
          where: {
            region_id: regionId,
            owned_by_plan_version_id: null,
          },
          transaction: t,
        }
      );
    }

    const ruleId = uuidv4();
    const rule = await RegionalPlanRule.create(
      {
        regional_plan_rule_id: ruleId,
        region_id: regionId,
        name: payload.name || "Plan Rule",
        is_active: isActive,
        performance_scoring_policy: payload.performance_scoring_policy || "CAP_100",
        amendment_policy: payload.amendment_policy || {
          completed_periods_editable: false,
          automatic_redistribution: "manual",
          allow_emergency_approvals: false,
          allow_structural_amendments_after_execution: true,
          allow_ownership_transfer: true,
        },
      },
      { transaction: t }
    );

    await RegionalPlanRuleStep.bulkCreate(
      normalizedSteps.map((step) => ({
        regional_plan_rule_step_id: uuidv4(),
        regional_plan_rule_id: ruleId,
        level: step.step_order,
        name: step.label,
        node_type: step.node_type || levelToNodeType(step.step_order),
        requires_weight: step.requires_weight,
        requires_contribution_weight: step.requires_contribution_weight,
        allow_kpi: step.allow_kpi !== undefined ? step.allow_kpi : (step.target_requirement === "required" || step.target_requirement === "optional" ? true : (step.target_requirement === "none" ? false : Boolean(step.allow_kpi ?? step.requires_weight))),
        requires_assignment: step.requires_assignment,
        assignment_requirement: step.assignment_requirement,
        allow_assignment: step.allow_assignment,
        color_hex: step.color_hex,
      })),
      { transaction: t }
    );

    // If new rule is active, synchronize unfinalized master draft plans in this region that have 0 nodes
    if (isActive) {
      const draftVersions = await RegionalPlanVersion.findAll({
        where: { region_id: regionId, version_kind: "master", status: "draft" },
        transaction: t,
      });

      for (const draft of draftVersions) {
        const nodeCount = await RegionalPlanNode.count({
          where: { regional_plan_version_id: draft.regional_plan_version_id },
          transaction: t,
        });

        if (nodeCount === 0) {
          const ownedRule = await RegionalPlanRule.findOne({
            where: {
              owned_by_plan_version_id: draft.regional_plan_version_id,
            },
            transaction: t,
          });

          if (ownedRule) {
            ownedRule.name = rule.name;
            ownedRule.source_regional_plan_rule_id = ruleId;
            ownedRule.performance_scoring_policy = rule.performance_scoring_policy;
            await ownedRule.save({ transaction: t });

            await RegionalPlanRuleStep.destroy({
              where: { regional_plan_rule_id: ownedRule.regional_plan_rule_id },
              transaction: t,
            });

            await RegionalPlanRuleStep.bulkCreate(
              normalizedSteps.map((step) => ({
                regional_plan_rule_step_id: uuidv4(),
                regional_plan_rule_id: ownedRule.regional_plan_rule_id,
                level: step.step_order,
                name: step.label,
                node_type: step.node_type || levelToNodeType(step.step_order),
                requires_weight: step.requires_weight,
                requires_contribution_weight: step.requires_contribution_weight,
                allow_kpi: step.allow_kpi !== undefined ? step.allow_kpi : (step.target_requirement === "required" || step.target_requirement === "optional" ? true : (step.target_requirement === "none" ? false : Boolean(step.allow_kpi ?? step.requires_weight))),
                requires_assignment: step.requires_assignment,
                assignment_requirement: step.assignment_requirement,
                allow_assignment: step.allow_assignment,
                color_hex: step.color_hex,
              })),
              { transaction: t }
            );
          }
        }
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
  if (!rule) {
    const existsOther = await RegionalPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another region");
      error.status = 403;
      throw error;
    }
    const error = new Error("Regional plan rule not found");
    error.status = 404;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    if (payload.is_active === true) {
      await RegionalPlanRule.update(
        { is_active: false },
        {
          where: {
            region_id: regionId,
            owned_by_plan_version_id: null,
            regional_plan_rule_id: { [Op.ne]: ruleId },
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
    if (payload.amendment_policy) {
      rule.amendment_policy = payload.amendment_policy;
    }
    await rule.save({ transaction: t });

    if (Array.isArray(payload.steps)) {
      const inputSteps = payload.steps.map((s, idx) => ({
        step_order: s.step_order || s.level || idx + 1,
        label: s.label || s.name || `Level ${idx + 1}`,
        target_requirement: s.target_requirement,
        allow_kpi: s.allow_kpi,
        requires_weight: s.target_requirement === "required" ? true : (s.target_requirement === "optional" || s.target_requirement === "none" ? false : !!s.requires_weight),
        requires_contribution_weight: !!s.requires_contribution_weight,
        assignment_requirement: s.assignment_requirement,
        allow_assignment: s.allow_assignment,
        requires_assignment: s.assignment_requirement === "required" ? true : (s.assignment_requirement === "optional" || s.assignment_requirement === "none" ? false : !!s.requires_assignment),
        color_hex: s.color_hex,
      }));
      const normalizedSteps = normalizeRuleSteps(inputSteps);

      await RegionalPlanRuleStep.destroy({
        where: { regional_plan_rule_id: ruleId },
        transaction: t,
      });

      await RegionalPlanRuleStep.bulkCreate(
        normalizedSteps.map((step) => ({
          regional_plan_rule_step_id: uuidv4(),
          regional_plan_rule_id: ruleId,
          level: step.step_order,
          name: step.label,
          node_type: step.node_type || levelToNodeType(step.step_order),
          requires_weight: step.requires_weight,
          requires_contribution_weight: step.requires_contribution_weight,
          allow_kpi: step.allow_kpi !== undefined ? step.allow_kpi : (step.target_requirement === "required" || step.target_requirement === "optional" ? true : (step.target_requirement === "none" ? false : Boolean(step.allow_kpi ?? step.requires_weight))),
          requires_assignment: step.requires_assignment,
          assignment_requirement: step.assignment_requirement,
          allow_assignment: step.allow_assignment,
          color_hex: step.color_hex,
        })),
        { transaction: t }
      );

      // Synchronize owned rule snapshots in active draft plans using this rule or draft plans with 0 nodes
      const draftVersions = await RegionalPlanVersion.findAll({
        where: { region_id: regionId, version_kind: "master", status: "draft" },
        transaction: t,
      });

      for (const draft of draftVersions) {
        const nodeCount = await RegionalPlanNode.count({
          where: { regional_plan_version_id: draft.regional_plan_version_id },
          transaction: t,
        });

        const isCandidate =
          draft.regional_plan_rule_id === ruleId ||
          (rule.is_active && nodeCount === 0);

        const ownedRule = await RegionalPlanRule.findOne({
          where: {
            owned_by_plan_version_id: draft.regional_plan_version_id,
            ...(nodeCount > 0 ? { source_regional_plan_rule_id: ruleId } : {}),
          },
          transaction: t,
        });

        if (ownedRule && (isCandidate || ownedRule.source_regional_plan_rule_id === ruleId)) {
          if (payload.name) ownedRule.name = payload.name;
          if (payload.performance_scoring_policy) {
            ownedRule.performance_scoring_policy = payload.performance_scoring_policy;
          }
          ownedRule.source_regional_plan_rule_id = ruleId;
          await ownedRule.save({ transaction: t });

          await RegionalPlanRuleStep.destroy({
            where: { regional_plan_rule_id: ownedRule.regional_plan_rule_id },
            transaction: t,
          });

          await RegionalPlanRuleStep.bulkCreate(
            normalizedSteps.map((step) => ({
              regional_plan_rule_step_id: uuidv4(),
              regional_plan_rule_id: ownedRule.regional_plan_rule_id,
              level: step.step_order,
              name: step.label,
              node_type: step.node_type || levelToNodeType(step.step_order),
              requires_weight: step.requires_weight,
              requires_contribution_weight: step.requires_contribution_weight,
              allow_kpi: step.allow_kpi !== undefined ? step.allow_kpi : (step.target_requirement === "required" || step.target_requirement === "optional" ? true : (step.target_requirement === "none" ? false : Boolean(step.allow_kpi ?? step.requires_weight))),
              requires_assignment: step.requires_assignment,
              assignment_requirement: step.assignment_requirement,
              allow_assignment: step.allow_assignment,
              color_hex: step.color_hex,
            })),
            { transaction: t }
          );
        }
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
  if (!rule) {
    const existsOther = await RegionalPlanRule.findByPk(ruleId);
    if (existsOther) {
      const error = new Error("Access denied: configuration belongs to another region");
      error.status = 403;
      throw error;
    }
    const error = new Error("Regional plan rule not found");
    error.status = 404;
    throw error;
  }

  const inUse = await RegionalPlanVersion.count({
    where: { regional_plan_rule_id: ruleId },
  });
  if (inUse > 0) {
    const error = new Error("Cannot delete plan rule that is assigned to regional plan versions");
    error.status = 400;
    throw error;
  }

  await rule.destroy();
  return { success: true };
}

// -------------------------------------------------------------
// Regional Performance Color Thresholds
// -------------------------------------------------------------

async function listRegionalPerformanceColorThresholds(regionId) {
  await ensureDefaultRegionalPerformanceColorThresholds(regionId);
  return RegionalPerformanceColorThreshold.findAll({
    where: { region_id: regionId },
    order: [["sort_order", "ASC"], ["min_percentage", "ASC"]],
  });
}

async function getRegionalPerformanceColorThresholdById(id, regionId) {
  return RegionalPerformanceColorThreshold.findOne({
    where: {
      regional_performance_color_threshold_id: id,
      region_id: regionId,
    },
  });
}

async function createRegionalPerformanceColorThreshold(regionId, payload) {
  if (payload.min_percentage === undefined || payload.max_percentage === undefined || !payload.color_hex || !payload.label) {
    throw new Error("Label, min_percentage, max_percentage, and color_hex are required");
  }

  return RegionalPerformanceColorThreshold.create({
    regional_performance_color_threshold_id: uuidv4(),
    region_id: regionId,
    label: payload.label.trim(),
    min_percentage: parseInt(payload.min_percentage, 10),
    max_percentage: parseInt(payload.max_percentage, 10),
    color_hex: payload.color_hex,
    sort_order: parseInt(payload.sort_order || 0, 10),
    is_active: payload.is_active !== undefined ? payload.is_active : true,
  });
}

async function updateRegionalPerformanceColorThreshold(id, regionId, payload) {
  const threshold = await getRegionalPerformanceColorThresholdById(id, regionId);
  if (!threshold) throw new Error("Performance color threshold not found");

  const allowed = ["label", "min_percentage", "max_percentage", "color_hex", "sort_order", "is_active"];
  const updates = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) updates[k] = payload[k];
  }

  await threshold.update(updates);
  return threshold;
}

async function deleteRegionalPerformanceColorThreshold(id, regionId) {
  const threshold = await getRegionalPerformanceColorThresholdById(id, regionId);
  if (!threshold) throw new Error("Performance color threshold not found");
  await threshold.destroy();
  return { success: true };
}

async function resolveRegionalPerformanceColor(regionId, percentage) {
  const thresholds = await listRegionalPerformanceColorThresholds(regionId);
  const val = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  const active = thresholds.filter((t) => t.is_active !== false);

  for (const t of active) {
    if (val >= t.min_percentage && val <= t.max_percentage) {
      return { threshold: t, color_hex: t.color_hex };
    }
  }

  const fallback = active[active.length - 1];
  return { threshold: fallback || null, color_hex: fallback?.color_hex || "#6B7280" };
}

// -------------------------------------------------------------
// 2. Master Plan Version Management
// -------------------------------------------------------------

async function createRegionalPlanDraft(regionId, payload, userId) {
  const t = await sequelize.transaction();
  try {
    const config = await RegionalPlanningConfiguration.findOne({
      where: { region_id: regionId, owned_by_plan_version_id: null },
      transaction: t,
    });
    if (!config) {
      const err = new Error(
        "CONFIG_NOT_READY: Regional planning configuration is missing for this region. Please configure regional settings first."
      );
      err.status = 400;
      err.code = "CONFIG_NOT_READY";
      throw err;
    }

    let rule;
    if (payload.regional_plan_rule_id && payload.regional_plan_rule_id !== "default") {
      const selectedRule = await RegionalPlanRule.findOne({
        where: {
          regional_plan_rule_id: payload.regional_plan_rule_id,
          region_id: regionId,
          owned_by_plan_version_id: null,
        },
        transaction: t,
      });
      if (!selectedRule) {
        const otherRule = await RegionalPlanRule.findByPk(payload.regional_plan_rule_id, { transaction: t });
        if (otherRule) {
          const err = new Error("Access denied: selected regional plan rule belongs to another region.");
          err.status = 403;
          throw err;
        }
        const err = new Error("Selected regional plan rule not found for this region.");
        err.status = 400;
        throw err;
      }
      rule = selectedRule;
    } else {
      rule = await RegionalPlanRule.findOne({
        where: {
          region_id: regionId,
          is_active: true,
          owned_by_plan_version_id: null,
        },
        transaction: t,
      });
      if (!rule) {
        const err = new Error(
          "CONFIG_NOT_READY: No active Plan Rules configuration found for this region. Please configure regional plan rules first."
        );
        err.status = 400;
        err.code = "CONFIG_NOT_READY";
        throw err;
      }
    }

    let startYear;
    let startMonth = 1;
    if (payload.planning_start_date) {
      const dt = new Date(payload.planning_start_date);
      startYear = dt.getFullYear();
      startMonth = dt.getMonth() + 1;
    } else {
      startYear = parseInt(payload.start_year || new Date().getFullYear(), 10);
      startMonth = parseInt(payload.start_month || 1, 10);
    }

    const duration = parseInt(payload.planning_duration_years || 5, 10);
    const endYear = startYear + duration - 1;

    const count = await RegionalPlanVersion.count({
      where: { region_id: regionId, version_kind: "master" },
      transaction: t,
    });

    let newVersion = await RegionalPlanVersion.create(
      {
        regional_plan_version_id: uuidv4(),
        region_id: regionId,
        parent_plan_version_id: null,
        based_on_version_id: payload.based_on_version_id || null,
        regional_plan_rule_id: rule.regional_plan_rule_id,
        regional_planning_config_id: config.regional_planning_config_id,
        draft_name: payload.draft_name || `Strategic Plan (${startYear} - ${endYear})`,
        version_kind: "master",
        status: "draft",
        version_number: count + 1,
        planning_year: startYear,
        sequence_index: 1,
        start_year: startYear,
        end_year: endYear,
        start_month: startMonth,
        end_month: parseInt(payload.end_month || 12, 10),
        planning_duration_years: duration,
        planning_start_date: payload.planning_start_date || `${startYear}-01-01`,
        planning_end_date: payload.planning_end_date || `${endYear}-12-31`,
        is_locked: false,
      },
      { transaction: t }
    );

    if (payload.based_on_version_id) {
      await cloneRegionalNodes(payload.based_on_version_id, newVersion.regional_plan_version_id, t);
    }

    await attachDraftSnapshotsToRegionalPlanVersion(newVersion, t);

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
      { association: "planRule", include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }] },
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
  ];

  for (const key of allowed) {
    if (payload[key] !== undefined) version[key] = payload[key];
  }

  if (payload.regional_plan_rule_id !== undefined && payload.regional_plan_rule_id !== version.regional_plan_rule_id) {
    const selectedRule = await RegionalPlanRule.findOne({
      where: { regional_plan_rule_id: payload.regional_plan_rule_id, region_id: regionId },
    });
    if (!selectedRule) {
      throw new Error("Selected regional plan rule not found or does not belong to this region");
    }
    const forked = await forkRegionalPlanRule(selectedRule, version.regional_plan_version_id);
    version.regional_plan_rule_id = forked.regional_plan_rule_id;
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
      const rawActual = node.period_actual !== null && node.period_actual !== undefined
        ? Number(node.period_actual)
        : (node.annual_actual !== null && node.annual_actual !== undefined ? Number(node.annual_actual) : null);

      computedTarget = target;

      const isEligible = isRollupEligibleAchievement(node);

      if (isEligible && target > 0 && rawActual !== null) {
        hasData = true;
        computedActual = rawActual;
        const scored = computePerformanceMetrics(target, rawActual, policy);
        progressPercent = scored.performance_percentage ?? 0;
      } else {
        hasData = false;
        computedActual = null;
        progressPercent = 0;
      }
    } else {
      // Parent Node evaluation: recursively evaluate all children
      const childMetrics = children.map((c) => evaluateNode(c));
      const evaluableChildren = [];

      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        const m = childMetrics[i];
        const childEligible = isRollupEligibleAchievement(c);
        if (m.hasData || (m.computedTarget > 0 && childEligible)) {
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

async function getRegionalPlanHierarchy(versionId, regionId, user = null) {
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
  let nodesWithMetrics = nodes.map((node) => {
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

  // Departmental hierarchy access filtering (Section 1)
  if (user && !userQualifiesForRegionalBypass(user) && !userCanExecuteRegionalAchievement(user) && user.regional_structure_id) {
    const accessibleNodeIds = new Set();
    for (const node of nodes) {
      try {
        const hasAccess = await assertUserCanAccessPlanNode(user, node, regionId);
        if (hasAccess) {
          accessibleNodeIds.add(node.regional_plan_node_id);
        }
      } catch {
        // Excluded
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.regional_plan_node_id, n]));
    const visibleIds = new Set();
    const addAncestors = (id) => {
      let cur = nodeMap.get(id);
      while (cur) {
        visibleIds.add(cur.regional_plan_node_id);
        cur = cur.parent_id ? nodeMap.get(cur.parent_id) : null;
      }
    };
    const addDescendants = (id) => {
      visibleIds.add(id);
      for (const n of nodes) {
        if (n.parent_id === id) addDescendants(n.regional_plan_node_id);
      }
    };
    for (const id of accessibleNodeIds) {
      addAncestors(id);
      addDescendants(id);
    }
    nodesWithMetrics = nodesWithMetrics.filter((n) => visibleIds.has(n.regional_plan_node_id));
  }

  const versionJson = version.toJSON ? version.toJSON() : { ...version };
  if (version.planRule) {
    versionJson.planRule = formatRegionalRuleResponse(version.planRule);
  }

  return {
    version: versionJson,
    nodes: nodesWithMetrics,
  };
}

async function validateRegionalPlanNodeAgainstRule({
  planVersionId,
  regionId,
  parentId,
  weight,
  weightMode,
  contributionWeight,
  level,
  targetUnit,
  excludeNodeId,
  transaction,
}) {
  const version = await RegionalPlanVersion.findByPk(planVersionId, {
    include: [{ association: "planRule", include: [{ association: "steps" }] }],
    transaction,
  });
  if (!version) {
    return { valid: false, message: "Plan version not found" };
  }

  const rule =
    version.planRule ||
    (await RegionalPlanRule.findOne({
      where: { region_id: regionId, is_active: true, owned_by_plan_version_id: null },
      include: [{ association: "steps" }],
      transaction,
    }));
  if (!rule) {
    return { valid: false, message: "No plan rule configuration found for this version or region." };
  }

  const steps = rule.steps || [];
  const maxDepth = steps.length > 0 ? Math.max(...steps.map((s) => s.level || s.step_order || 1)) : 4;

  let parent = null;
  if (parentId) {
    parent = await RegionalPlanNode.findOne({
      where: { regional_plan_node_id: parentId, regional_plan_version_id: planVersionId },
      transaction,
    });
    if (!parent) {
      return { valid: false, message: "Parent node not found in this version" };
    }
  }

  const resolvedLevel = level || (parent ? parent.level + 1 : 1);

  if (resolvedLevel > maxDepth) {
    return {
      valid: false,
      message: `Maximum plan depth is ${maxDepth} levels per the "${rule.name}" rule`,
    };
  }

  const step = getStepForLevel(rule, resolvedLevel) || steps.find((s) => (s.level || s.step_order) === resolvedLevel);
  if (!step) {
    return {
      valid: false,
      message: `No rule step defined for level ${resolvedLevel}`,
    };
  }

  const stepLabel = getStepLabel(rule, resolvedLevel) || step.name || step.label || `Level ${resolvedLevel}`;
  const stepTargetReq = getStepTargetRequirement(step);
  const allowsTarget = stepAllowsTarget(step);
  const requiresWeight = stepRequiresTarget(step);
  const isOptionalTarget = stepTargetIsOptional(step);
  const requiresContributionWeight = stepRequiresContributionWeight(rule, resolvedLevel);
  const numericWeight = Number(weight) || 0;
  const numericContributionWeight = Number(contributionWeight) || 0;

  const modeResult = await resolveNodeWeightMode({
    rule,
    level: resolvedLevel,
    parent,
    weightMode,
    transaction,
    PlanNode: RegionalPlanNode,
  });

  if (modeResult.error && allowsTarget) {
    return { valid: false, message: modeResult.error };
  }

  const effectiveWeightMode = modeResult.mode;

  if (!allowsTarget && numericWeight > 0) {
    return {
      valid: false,
      message: `${stepLabel} does not have a target field at this level`,
    };
  }

  if (requiresWeight && numericWeight <= 0) {
    return {
      valid: false,
      message: `${stepLabel} requires a target value${effectiveWeightMode ? ` (${effectiveWeightMode})` : ""}`,
    };
  }

  const weightTarget = getWeightTarget(parent, effectiveWeightMode);
  if (allowsTarget && weightTarget !== null) {
    const siblings = await RegionalPlanNode.findAll({
      where: {
        regional_plan_version_id: planVersionId,
        parent_id: parentId || null,
        is_active: true,
      },
      transaction,
    });

    const otherSum = siblings
      .filter((s) => s.regional_plan_node_id !== excludeNodeId)
      .reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

    const total = otherSum + numericWeight;

    if (total > weightTarget + 0.001) {
      const unit = getWeightUnitLabel(effectiveWeightMode);
      return {
        valid: false,
        message: `Combined sibling weight (${total}${unit}) exceeds allowed ${weightTarget}${unit}. Children must share the parent's weight.`,
      };
    }
  }

  if (requiresContributionWeight && numericContributionWeight <= 0) {
    return {
      valid: false,
      message: `${stepLabel} requires a contribution weight (%)`,
    };
  }

  if (!requiresContributionWeight && numericContributionWeight > 0) {
    return {
      valid: false,
      message: `${stepLabel} does not use contribution weight at this level`,
    };
  }

  if (requiresContributionWeight) {
    const siblings = await RegionalPlanNode.findAll({
      where: {
        regional_plan_version_id: planVersionId,
        parent_id: parentId || null,
        is_active: true,
      },
      transaction,
    });

    const otherSum = siblings
      .filter((s) => s.regional_plan_node_id !== excludeNodeId)
      .reduce((sum, s) => sum + (Number(s.contribution_weight) || 0), 0);

    const total = otherSum + numericContributionWeight;
    const contributionTarget = getContributionSiblingTarget();
    if (total > contributionTarget + 0.001) {
      return {
        valid: false,
        message: `Combined sibling contribution weight (${total}%) exceeds ${contributionTarget}%.`,
      };
    }
  }

  // Validate target_unit if provided
  if (targetUnit) {
    if (!allowsTarget) {
      return {
        valid: false,
        message: `${stepLabel} does not have a target field and cannot have a target unit.`,
      };
    }
    const versionConfig = version.planningConfiguration;
    const regionalConfig = await RegionalPlanningConfiguration.findOne({
      where: { region_id: regionId, owned_by_plan_version_id: null },
      transaction,
    });

    const validUnits = [
      ...(Array.isArray(versionConfig?.target_units) ? versionConfig.target_units : []),
      ...(Array.isArray(regionalConfig?.target_units) ? regionalConfig.target_units : []),
    ];

    const isKnown = validUnits.some(
      (u) =>
        typeof u === "string"
          ? u.toLowerCase() === targetUnit.toLowerCase()
          : (u.id && u.id.toLowerCase() === targetUnit.toLowerCase()) ||
            (u.label && u.label.toLowerCase() === targetUnit.toLowerCase()) ||
            (u.symbol && u.symbol.toLowerCase() === targetUnit.toLowerCase())
    );
    if (validUnits.length > 0 && !isKnown) {
      return {
        valid: false,
        message: `Target unit "${targetUnit}" is not configured in regional planning configuration.`,
      };
    }
  }

  return {
    valid: true,
    rule,
    step,
    resolvedLevel,
    allowsTarget,
    requiresWeight,
    isOptionalTarget,
    targetRequirement: stepTargetReq,
    requiresContributionWeight,
    weightMode: effectiveWeightMode,
    weightUnit: getWeightUnitLabel(effectiveWeightMode),
    stepLabel,
    nodeType: step.node_type || levelToNodeType(resolvedLevel),
    isWeightModeSelectionLevel: isWeightModeSelectionLevel(rule, resolvedLevel),
  };
}

/**
 * Enforces hierarchical assignment scoping:
 * If an ancestor node is assigned to a department, descendant nodes can ONLY be assigned to:
 * 1. That department itself, OR
 * 2. A descendant department of that department in RegionalStructure, OR
 * 3. Users belonging to that department or one of its descendant departments.
 */
async function validateRegionalNodeAssignmentScoping({
  nodeId = null,
  parentId = null,
  targetStructureId = null,
  targetUserIds = [],
  regionId = null,
  transaction = null,
}) {
  let effectiveParentId = parentId;
  if (!effectiveParentId && nodeId) {
    const existingNode = await RegionalPlanNode.findByPk(nodeId, {
      attributes: ["regional_plan_node_id", "parent_id"],
      transaction,
    });
    effectiveParentId = existingNode?.parent_id || null;
  }

  if (!effectiveParentId) {
    return { valid: true };
  }

  // Walk up ancestor chain to find nearest ancestor node with an active department assignment
  let currentParentId = effectiveParentId;
  let nearestAncestorDeptId = null;
  let nearestAncestorNode = null;

  while (currentParentId && !nearestAncestorDeptId) {
    const pNode = await RegionalPlanNode.findByPk(currentParentId, {
      attributes: ["regional_plan_node_id", "title", "level", "parent_id"],
      include: [
        {
          association: "internalAssignments",
          where: { is_active: true },
          required: false,
          include: [{ association: "department" }, { association: "assignedUser" }],
        },
      ],
      transaction,
    });

    if (!pNode) break;

    const activeAssignments = pNode.internalAssignments || [];
    for (const a of activeAssignments) {
      if (a.regional_structure_id) {
        nearestAncestorDeptId = a.regional_structure_id;
        nearestAncestorNode = pNode;
        break;
      }
      if (a.assignedUser?.regional_structure_id) {
        nearestAncestorDeptId = a.assignedUser.regional_structure_id;
        nearestAncestorNode = pNode;
        break;
      }
    }

    if (!nearestAncestorDeptId) {
      currentParentId = pNode.parent_id;
    }
  }

  if (!nearestAncestorDeptId) {
    return { valid: true };
  }

  const ancestorDept = await RegionalStructure.findByPk(nearestAncestorDeptId, { transaction });
  const ancestorDeptName = ancestorDept?.name || "assigned ancestor department";

  // Validate targetStructureId
  if (targetStructureId) {
    const isAllowedDept =
      targetStructureId === nearestAncestorDeptId ||
      (await isRegionalStructureAncestor(nearestAncestorDeptId, targetStructureId, transaction));

    if (!isAllowedDept) {
      const targetDept = await RegionalStructure.findByPk(targetStructureId, { transaction });
      const targetDeptName = targetDept?.name || "Selected department";
      const error = new Error(
        `Assignment restricted: Parent milestone "${nearestAncestorNode?.title || 'Ancestor'}" is assigned to department "${ancestorDeptName}". Descendant nodes can only be assigned to "${ancestorDeptName}", its sub-departments, or its users. "${targetDeptName}" is outside this scope.`
      );
      error.status = 400;
      throw error;
    }
  }

  // Validate targetUserIds
  const uids = Array.isArray(targetUserIds) ? targetUserIds : (targetUserIds ? [targetUserIds] : []);
  for (const uid of uids) {
    const user = await User.findByPk(uid, { transaction });
    if (!user) continue;

    if (!user.regional_structure_id) {
      const error = new Error(
        `Assignment restricted: User "${user.full_name}" is not associated with department "${ancestorDeptName}" or its child departments.`
      );
      error.status = 400;
      throw error;
    }

    const isAllowedUserDept =
      user.regional_structure_id === nearestAncestorDeptId ||
      (await isRegionalStructureAncestor(nearestAncestorDeptId, user.regional_structure_id, transaction));

    if (!isAllowedUserDept) {
      const userDept = await RegionalStructure.findByPk(user.regional_structure_id, { transaction });
      const userDeptName = userDept?.name || "unknown department";
      const error = new Error(
        `Assignment restricted: User "${user.full_name}" belongs to department "${userDeptName}", which is outside the scope of parent assignment "${ancestorDeptName}".`
      );
      error.status = 400;
      throw error;
    }
  }

  return { valid: true, ancestorDeptId: nearestAncestorDeptId, ancestorDeptName };
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

    const validation = await validateRegionalPlanNodeAgainstRule({
      planVersionId: versionId,
      regionId,
      parentId,
      weight: payload.weight,
      weightMode: payload.weight_mode,
      contributionWeight: payload.contribution_weight,
      level,
      targetUnit: payload.target_unit,
      transaction: t,
    });

    if (!validation.valid) {
      const error = new Error(validation.message);
      error.status = 400;
      throw error;
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
        type: payload.type || validation.nodeType,
        title: payload.title,
        description: payload.description || null,
        weight: validation.allowsTarget ? (Number(payload.weight) || 0) : 0,
        weight_mode: validation.allowsTarget ? (payload.weight_mode || validation.weightMode || "percentage") : null,
        contribution_weight: validation.requiresContributionWeight
          ? (payload.contribution_weight !== undefined && payload.contribution_weight !== null ? Number(payload.contribution_weight) : null)
          : null,
        target_unit: (validation.allowsTarget && (validation.weightMode === "number" || payload.weight_mode === "number")) ? (payload.target_unit || null) : null,
        target_allocation_mode: validation.allowsTarget ? (payload.target_allocation_mode || "divisible") : null,
        achievement_mode: validation.allowsTarget ? (payload.achievement_mode || "period") : null,
        level,
        order: orderCount,
        is_active: true,
      },
      { transaction: t }
    );

    // Create assignment if provided
    if (payload.regional_structure_id || payload.assigned_user_id) {
      await validateRegionalNodeAssignmentScoping({
        parentId,
        targetStructureId: payload.regional_structure_id || null,
        targetUserIds: payload.assigned_user_id ? [payload.assigned_user_id] : [],
        regionId,
        transaction: t,
      });

      await RegionalInternalAssignment.create(
        {
          regional_internal_assignment_id: uuidv4(),
          regional_plan_node_id: nodeId,
          regional_structure_id: payload.regional_structure_id || null,
          assigned_user_id: payload.assigned_user_id || null,
          is_active: true,
        },
        { transaction: t }
      );
    }

    const safeUserId =
      typeof userId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
        ? userId
        : null;

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: safeUserId,
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

async function getRegionalPlanNodeById(nodeId, regionId, user = null) {
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

  if (user) {
    await assertUserCanAccessPlanNode(user, node, regionId);
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

  const t = await sequelize.transaction();
  try {
    let lastValidation = null;
    if (
      payload.weight !== undefined ||
      payload.contribution_weight !== undefined ||
      payload.target_unit !== undefined ||
      payload.weight_mode !== undefined
    ) {
      lastValidation = await validateRegionalPlanNodeAgainstRule({
        planVersionId: node.regional_plan_version_id,
        regionId,
        parentId: node.parent_id,
        weight: payload.weight !== undefined ? payload.weight : node.weight,
        weightMode: payload.weight_mode !== undefined ? payload.weight_mode : node.weight_mode,
        contributionWeight:
          payload.contribution_weight !== undefined
            ? payload.contribution_weight
            : node.contribution_weight,
        level: node.level,
        targetUnit: payload.target_unit !== undefined ? payload.target_unit : node.target_unit,
        excludeNodeId: nodeId,
        transaction: t,
      });

      if (!lastValidation.valid) {
        const error = new Error(lastValidation.message);
        error.status = 400;
        throw error;
      }
    }

    const prev = {};
    const next = {};

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        prev[key] = node[key];
        node[key] = payload[key];
        next[key] = payload[key];
      }
    }

    if (lastValidation) {
      if (!lastValidation.allowsTarget) {
        node.weight = 0;
        node.weight_mode = null;
        node.target_unit = null;
        node.target_allocation_mode = null;
        node.achievement_mode = null;
      }
      if (!lastValidation.requiresContributionWeight) {
        node.contribution_weight = null;
      }
    }

    await node.save({ transaction: t });

    // Update assignment if structure or assigned user specified
    if (payload.regional_structure_id !== undefined || payload.assigned_user_id !== undefined) {
      if (payload.regional_structure_id || payload.assigned_user_id) {
        await validateRegionalNodeAssignmentScoping({
          nodeId,
          targetStructureId: payload.regional_structure_id || null,
          targetUserIds: payload.assigned_user_id ? [payload.assigned_user_id] : [],
          regionId,
          transaction: t,
        });
      }

      await RegionalInternalAssignment.destroy({
        where: { regional_plan_node_id: nodeId },
        transaction: t,
      });

      if (payload.regional_structure_id || payload.assigned_user_id) {
        await RegionalInternalAssignment.create(
          {
            regional_internal_assignment_id: uuidv4(),
            regional_plan_node_id: nodeId,
            regional_structure_id: payload.regional_structure_id || null,
            assigned_user_id: payload.assigned_user_id || null,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }

    const safeUserId =
      typeof userId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
        ? userId
        : null;

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: safeUserId,
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

async function assignRegionalPlanNode(nodeId, regionId, payload, userId) {
  const node = await getRegionalPlanNodeById(nodeId, regionId);
  let targetStructureId = payload.regional_structure_id || null;

  const targetUserIds = Array.isArray(payload.assigned_user_ids)
    ? payload.assigned_user_ids
    : (payload.assigned_user_id ? [payload.assigned_user_id] : []);

  for (const uid of targetUserIds) {
    const user = await User.findByPk(uid);
    if (!user) {
      const error = new Error(`Assigned user not found: ${uid}`);
      error.status = 404;
      throw error;
    }
    if (user.region_id && user.region_id !== regionId) {
      const error = new Error("Assigned user belongs to a different region.");
      error.status = 403;
      throw error;
    }
    if (!targetStructureId && user.regional_structure_id) {
      targetStructureId = user.regional_structure_id;
    }
  }

  if (targetStructureId) {
    const struct = await RegionalStructure.findByPk(targetStructureId);
    if (!struct) {
      const error = new Error("Regional structure not found.");
      error.status = 404;
      throw error;
    }
    if (struct.region_id && struct.region_id !== regionId) {
      const error = new Error("Regional structure belongs to a different region.");
      error.status = 403;
      throw error;
    }
  }

  if (!targetStructureId && targetUserIds.length === 0) {
    const error = new Error("At least one of regional_structure_id or assigned_user_id is required.");
    error.status = 400;
    throw error;
  }

  const isExclusive =
    node.assignment_sharing_mode !== "shared" &&
    payload.append !== true &&
    targetUserIds.length <= 1;

  const t = await sequelize.transaction();
  try {
    await validateRegionalNodeAssignmentScoping({
      nodeId,
      targetStructureId,
      targetUserIds,
      regionId,
      transaction: t,
    });

    if (isExclusive) {
      await RegionalInternalAssignment.destroy({
        where: { regional_plan_node_id: nodeId },
        transaction: t,
      });
    }

    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const existing = await RegionalInternalAssignment.findOne({
          where: { regional_plan_node_id: nodeId, assigned_user_id: uid, is_active: true },
          transaction: t,
        });
        if (!existing) {
          await RegionalInternalAssignment.create(
            {
              regional_internal_assignment_id: uuidv4(),
              regional_plan_node_id: nodeId,
              regional_structure_id: targetStructureId,
              assigned_user_id: uid,
              is_active: true,
            },
            { transaction: t }
          );
        }
      }
    } else {
      // Department-only assignment
      const existing = await RegionalInternalAssignment.findOne({
        where: { regional_plan_node_id: nodeId, regional_structure_id: targetStructureId, assigned_user_id: null, is_active: true },
        transaction: t,
      });
      if (!existing) {
        await RegionalInternalAssignment.create(
          {
            regional_internal_assignment_id: uuidv4(),
            regional_plan_node_id: nodeId,
            regional_structure_id: targetStructureId,
            assigned_user_id: null,
            is_active: true,
          },
          { transaction: t }
        );
      }
    }

    const safeUserId =
      typeof userId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
        ? userId
        : (userId?.user_id || null);

    await RegionalPlanNodeActionLog.create(
      {
        action_log_id: uuidv4(),
        regional_plan_node_id: nodeId,
        user_id: safeUserId,
        action: isExclusive ? "NODE_REASSIGNED" : "NODE_ASSIGNED",
        details: { regional_structure_id: targetStructureId, assigned_user_ids: targetUserIds },
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

async function removeRegionalPlanNodeAssignment(nodeId, assignmentId, regionId, userId) {
  await getRegionalPlanNodeById(nodeId, regionId);
  const assignment = await RegionalInternalAssignment.findOne({
    where: {
      regional_internal_assignment_id: assignmentId,
      regional_plan_node_id: nodeId,
    },
  });

  if (!assignment) {
    const error = new Error("Assignment not found");
    error.status = 404;
    throw error;
  }

  await assignment.destroy();

  const safeUserId =
    typeof userId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
      ? userId
      : null;

  await RegionalPlanNodeActionLog.create({
    action_log_id: uuidv4(),
    regional_plan_node_id: nodeId,
    user_id: safeUserId,
    action: "NODE_UNASSIGNED",
    details: { assignment_id: assignmentId },
  });

  return getRegionalPlanNodeById(nodeId, regionId);
}

// -------------------------------------------------------------
// Regional Plan Review Workflow Service
// -------------------------------------------------------------

async function getRegionalPlanVersionsForReview(regionId, query = {}) {
  const where = {
    region_id: regionId,
    version_kind: "master",
  };

  if (query.search) {
    where.draft_name = { [Op.iLike]: `%${query.search}%` };
  }

  return RegionalPlanVersion.findAll({
    where,
    include: [
      { association: "region" },
      { association: "planRule" },
      { association: "annualVersions" },
    ],
    order: [["created_at", "DESC"]],
  });
}

async function getRegionalPublishForReviewReadiness(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  const errors = [];
  if (!version) {
    return { ready: false, errors: ["Plan not found"], review_status: null };
  }
  if (version.review_status === "in_review") {
    errors.push("Plan is already under review");
  }
  if (version.process_started_at) {
    errors.push("Process has already been started");
  }

  const nodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: versionId, is_active: true },
  });
  if (nodes.length === 0) {
    errors.push("Plan hierarchy is empty. Add at least one objective or goal.");
  }

  return {
    ready: errors.length === 0,
    errors,
    review_status: version.review_status,
  };
}

async function publishRegionalPlanForReview(versionId, regionId, req) {
  const readiness = await getRegionalPublishForReviewReadiness(versionId, regionId);
  if (!readiness.ready) {
    const err = new Error(`Cannot publish for review: ${readiness.errors.join("; ")}`);
    err.status = 400;
    throw err;
  }

  const version = await getRegionalPlanVersionById(versionId, regionId);
  await version.update({
    review_status: "in_review",
    status: "submitted",
  });

  return version;
}

async function unlockRegionalPlanReviewCorrections(versionId, regionId, req, reason) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (!version) throw new Error("Plan version not found");

  await version.update({
    review_status: "revision_requested",
    status: "draft",
  });

  return version;
}

async function republishRegionalPlanForReview(versionId, regionId, req) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (!version) throw new Error("Plan version not found");

  await version.update({
    review_status: "in_review",
    status: "submitted",
  });

  return version;
}

async function getRegionalCompleteReviewReadiness(versionId, regionId) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  const errors = [];
  if (!version) return { ready: false, errors: ["Plan not found"] };
  if (version.review_status !== "in_review") {
    errors.push("Plan must be in review to complete review");
  }
  return {
    ready: errors.length === 0,
    errors,
    review_status: version.review_status,
  };
}

async function completeRegionalPlanReview(versionId, regionId, req, decision) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  if (!version) throw new Error("Plan version not found");

  const isApproved = decision !== "reject";
  await version.update({
    review_status: isApproved ? "approved" : "rejected",
    status: isApproved ? "approved" : "rejected",
  });

  return version;
}

async function getRegionalPlanReviewDashboard(versionId, regionId, query = {}) {
  const version = await getRegionalPlanVersionById(versionId, regionId);
  return {
    version,
    stats: {
      total: 0,
      submitted: 0,
      under_review: 0,
      accepted: 0,
      rejected: 0,
      resolved: 0,
    },
    issues: [],
  };
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

  const rule = version.planRule || (await getRegionalPlanRuleForVersion(versionId, regionId));

  // Check required assignments according to rule
  for (const n of nodes) {
    if (stepRequiresAssignment(rule, n.level)) {
      const activeAssignments = (n.internalAssignments || []).filter((a) => a.is_active !== false);
      const isAssigned = activeAssignments.some((a) => a.regional_structure_id || a.assigned_user_id);
      if (!isAssigned) {
        const stepLabel = getStepLabel(rule, n.level);
        errors.push(
          `${stepLabel} "${n.title}" (Level ${n.level}) requires organizational assignment before annual execution can be initialized.`
        );
      }
    }
  }

  for (const [parentId, children] of childrenByParent.entries()) {
    const childLevel = children[0]?.level;
    if (!stepRequiresContributionWeight(rule, childLevel)) {
      continue;
    }
    const parentNode = nodes.find((n) => n.regional_plan_node_id === parentId);
    const parentTitle = parentNode ? parentNode.title : "Parent";
    const sum = children.reduce((acc, c) => acc + (Number(c.contribution_weight) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
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
  const version = await getRegionalPlanVersionById(node.regional_plan_version_id, regionId);
  if (version && version.planRule && !stepAllowsTarget(version.planRule, node.level)) {
    const error = new Error(`${getStepLabel(version.planRule, node.level)} does not have a target field and cannot have an annual target.`);
    error.status = 400;
    throw error;
  }
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

async function initializeRegionalExecutionPeriods(
  masterVersionId,
  regionId,
  subdivisionMode,
  customPeriods = [],
  userId
) {
  const master = await getRegionalPlanVersionById(masterVersionId, regionId);
  const now = new Date();
  if (!master.annual_targets_finalized_at) {
    await master.update({ annual_targets_finalized_at: now });
    await RegionalPlanVersion.update(
      { annual_targets_finalized_at: now },
      { where: { parent_plan_version_id: masterVersionId, version_kind: "annual" } }
    );
  }

  const config =
    master.planningConfiguration ||
    (await RegionalPlanningConfiguration.findOne({
      where: { region_id: regionId, owned_by_plan_version_id: null },
    }));
  if (!config) {
    const error = new Error("Regional planning configuration not found for region.");
    error.status = 404;
    throw error;
  }
  const effectiveMode = subdivisionMode || config.breakdown_mode || "quarterly";
  const effectiveCustom =
    customPeriods && customPeriods.length > 0 ? customPeriods : config.custom_periods || [];

  let periodLabels = [];
  if (effectiveMode === "custom") {
    const normalized = normalizeCustomPeriods(effectiveCustom);
    if (!normalized.valid) {
      const error = new Error(normalized.message);
      error.status = 400;
      throw error;
    }
    periodLabels = normalized.periods.map((p) => p.label);
  } else {
    periodLabels = resolvePeriodLabelsForMode(effectiveMode, effectiveCustom);
  }

  if (periodLabels.length === 0) {
    const error = new Error("No execution periods configured for the selected subdivision");
    error.status = 400;
    throw error;
  }

  const annuals = await listRegionalAnnualVersions(masterVersionId, regionId);

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
  const version = await getRegionalPlanVersionById(node.regional_plan_version_id, regionId);
  if (version && version.planRule && !stepAllowsTarget(version.planRule, node.level)) {
    const error = new Error(`${getStepLabel(version.planRule, node.level)} does not have a target field and cannot have a period target.`);
    error.status = 400;
    throw error;
  }
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

async function submitRegionalAchievement(nodeId, regionId, payload, userOrUserId) {
  await submitRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId);
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function approveRegionalAchievement(nodeId, regionId, payload, userOrUserId) {
  await approveRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId);
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function rejectRegionalAchievement(nodeId, regionId, rejectionComment, userOrUserId) {
  await rejectRegionalAchievementWorkflow(nodeId, regionId, rejectionComment, userOrUserId);
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function validateRegionalAchievement(nodeId, regionId, payload, userOrUserId) {
  await validateRegionalAchievementWorkflow(nodeId, regionId, payload, userOrUserId);
  return getRegionalPlanNodeById(nodeId, regionId);
}

async function rejectValidationRegionalAchievement(nodeId, regionId, rejectionComment, userOrUserId) {
  await rejectValidationRegionalAchievementWorkflow(nodeId, regionId, rejectionComment, userOrUserId);
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
  const masterWhere = { region_id: regionId, version_kind: "master" };
  if (filters.status && filters.status !== "all") {
    masterWhere.status = filters.status;
  }
  if (filters.search && filters.search.trim()) {
    masterWhere.draft_name = { [Op.iLike]: `%${filters.search.trim()}%` };
  }

  const plans = await RegionalPlanVersion.findAll({
    where: masterWhere,
    include: [
      {
        association: "planRule",
        include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  const annualTimelineMap = new Map();
  const perfDist = { excellent: 0, good: 0, average: 0, at_risk: 0 };
  const statusDist = { active: 0, completed: 0, delayed: 0, draft: 0 };
  const sharedPlansList = [];
  const exclusivePlansList = [];

  let portfolioTotalProgress = 0;
  let portfolioEvaluatedCount = 0;
  let activeMilestones = 0;
  let delayedKpis = 0;
  let totalSharedPlans = 0;
  let totalExclusivePlans = 0;
  let inExecutionCount = 0;

  const planRows = [];

  for (const plan of plans) {
    const nodes = await RegionalPlanNode.findAll({
      where: { regional_plan_version_id: plan.regional_plan_version_id, is_active: true },
      order: [["level", "ASC"], ["order", "ASC"]],
    });

    let planProgress = 0;
    let planHasProgress = false;
    let targetCount = 0;
    let actualCount = 0;
    let planIsShared = false;

    if (nodes.length > 0) {
      const { metricsMemo } = computeRegionalTreeRollup(nodes, plan.planRule);

      for (const node of nodes) {
        if (node.assignment_sharing_mode === "shared") {
          planIsShared = true;
        }

        const m = metricsMemo.get(node.regional_plan_node_id);
        const p = m ? m.progressPercent : 0;

        if (node.level >= 3 || node.target_unit || node.period_target || node.annual_target) {
          activeMilestones++;
          targetCount++;
          if (m && m.computedTarget > 0 && (m.computedActual === null || p < 50)) {
            delayedKpis++;
          }
          if (m && m.computedActual !== null) {
            actualCount++;
            planHasProgress = true;
          }

          if (p >= 85) perfDist.excellent++;
          else if (p >= 70) perfDist.good++;
          else if (p >= 50) perfDist.average++;
          else perfDist.at_risk++;
        }
      }

      const roots = nodes.filter((n) => !n.parent_id);
      if (roots.length > 0) {
        const rootProgresses = roots.map((r) => metricsMemo.get(r.regional_plan_node_id)?.progressPercent ?? 0);
        planProgress = Math.round(rootProgresses.reduce((a, b) => a + b, 0) / rootProgresses.length);
        portfolioTotalProgress += planProgress;
        portfolioEvaluatedCount++;

        for (const root of roots) {
          const entry = {
            id: root.regional_plan_node_id,
            plan_version_id: plan.regional_plan_version_id,
            title: root.title,
            progress: planProgress,
            status: planProgress >= 100 ? "completed" : (planProgress < 50 && planHasProgress ? "delayed" : "active"),
          };
          if (root.assignment_sharing_mode === "shared") {
            sharedPlansList.push({ ...entry, branches: 1 });
          } else {
            exclusivePlansList.push({ ...entry, target: plan.draft_name });
          }
        }
      }
    }

    if (planIsShared) totalSharedPlans++;
    else totalExclusivePlans++;

    if (plan.process_started_at || plan.status === "active") inExecutionCount++;

    let dashboardStatus = "active";
    if (plan.status === "completed") dashboardStatus = "completed";
    else if (plan.status === "draft") dashboardStatus = "draft";
    else if (plan.process_started_at && planProgress < 50 && planHasProgress) dashboardStatus = "delayed";
    else dashboardStatus = "active";

    statusDist[dashboardStatus] = (statusDist[dashboardStatus] || 0) + 1;

    planRows.push({
      plan_version_id: plan.regional_plan_version_id,
      draft_name: plan.draft_name,
      status: plan.status,
      region_id: plan.region_id,
      process_started_at: plan.process_started_at,
      execution_progress_percent: planProgress,
      is_evaluable: true,
      evaluation_status: plan.review_status,
      has_contributing_data: planHasProgress,
      active_planning_year: plan.start_year,
      dashboard_status: dashboardStatus,
      start_year: plan.start_year,
      end_year: plan.end_year,
      created_at: plan.created_at,
      target_count: targetCount,
      actual_count: actualCount,
    });

    for (let yr = plan.start_year; yr <= plan.end_year; yr++) {
      const key = String(yr);
      const curr = annualTimelineMap.get(key) || { label: key, total: 0, count: 0 };
      curr.total += planProgress;
      curr.count += 1;
      annualTimelineMap.set(key, curr);
    }
  }

  const annualTimeline = Array.from(annualTimelineMap.values())
    .map((e) => ({
      label: e.label,
      average_percent: e.count > 0 ? Math.round(e.total / e.count) : 0,
      plan_count: e.count,
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const avgProgress = portfolioEvaluatedCount > 0 ? Math.round(portfolioTotalProgress / portfolioEvaluatedCount) : 0;

  let hierarchyConfig = [];
  const planWithRule = plans.find((p) => p.planRule && p.planRule.steps && p.planRule.steps.length > 0);
  if (planWithRule && planWithRule.planRule) {
    hierarchyConfig = planWithRule.planRule.steps.map((s) => ({
      level: s.level,
      name: s.name,
      label: s.name,
      node_type: s.node_type || "task",
      allow_kpi: Boolean(s.allow_kpi),
      requires_weight: Boolean(s.requires_weight),
      color_hex: s.color_hex || "#059669",
    }));
  } else {
    hierarchyConfig = [
      { level: 1, name: "Strategic Focus", label: "Strategic Focus", node_type: "strategic", allow_kpi: false, color_hex: "#059669" },
      { level: 2, name: "Goal", label: "Goal", node_type: "goal", allow_kpi: false, color_hex: "#0d9488" },
      { level: 3, name: "KPI", label: "KPI", node_type: "kpi", allow_kpi: true, color_hex: "#d97706" },
    ];
  }

  const kpiSummary = {
    totalPlans: plans.length,
    activePlans: statusDist.active || 0,
    completedPlans: statusDist.completed || 0,
    inExecutionPlans: inExecutionCount,
    sharedPlans: totalSharedPlans,
    exclusivePlans: totalExclusivePlans,
    averageProgress: avgProgress,
    activeMilestones,
    delayedKpis,
  };

  const focusMasterPlanId =
    plans.find((p) => p.status === "active" || p.process_started_at)?.regional_plan_version_id ||
    plans[0]?.regional_plan_version_id ||
    null;

  return {
    region_id: regionId,
    kpi: kpiSummary,
    plans: planRows,
    annual_timeline: annualTimeline,
    performance_distribution: perfDist,
    status_distribution: statusDist,
    hierarchy_config: hierarchyConfig,
    sharing: {
      shared: sharedPlansList,
      exclusive: exclusivePlansList,
    },
    focus_master_plan_version_id: focusMasterPlanId,
    generated_at: new Date().toISOString(),
    total_plans: plans.length,
    active_plans: statusDist.active || 0,
    portfolio_progress_percent: avgProgress,
    active_milestones: activeMilestones,
    delayed_kpis: delayedKpis,
    summary: {
      total_plans: plans.length,
      avg_progress: avgProgress,
      active_milestones: activeMilestones,
      delayed_kpis: delayedKpis,
      status_breakdown: {
        total_plans: plans.length,
        draft_plans: statusDist.draft || 0,
        active_plans: statusDist.active || 0,
        completed_plans: statusDist.completed || 0,
      },
    },
  };
}

async function getRegionalExecutionDashboardProgressTree(regionId, planVersionId, periodVersionId = null) {
  let targetVersionId = planVersionId;

  if (!targetVersionId || targetVersionId === "auto") {
    const latest = await RegionalPlanVersion.findOne({
      where: { region_id: regionId, version_kind: "master" },
      order: [["created_at", "DESC"]],
    });
    if (!latest) {
      return {
        progress_tree: {
          period_label: null,
          planning_year: null,
          period_version_id: null,
          period_phase: null,
          available_periods: [],
          nodes: [],
          hierarchy_config: [],
        },
        focus_master_plan_version_id: null,
        generated_at: new Date().toISOString(),
        tree: [],
        version: null,
      };
    }
    targetVersionId = latest.regional_plan_version_id;
  }

  // Load requested version
  let masterVersion = await RegionalPlanVersion.findOne({
    where: { regional_plan_version_id: targetVersionId, region_id: regionId },
    include: [
      {
        association: "planRule",
        include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
      },
    ],
  });

  if (!masterVersion) {
    return {
      progress_tree: {
        period_label: null,
        planning_year: null,
        period_version_id: null,
        period_phase: null,
        available_periods: [],
        nodes: [],
        hierarchy_config: [],
      },
      focus_master_plan_version_id: null,
      generated_at: new Date().toISOString(),
      tree: [],
      version: null,
    };
  }

  // If passed an annual or period version, find parent master
  if (masterVersion.version_kind !== "master" && masterVersion.parent_plan_version_id) {
    let curr = masterVersion;
    while (curr && curr.version_kind !== "master" && curr.parent_plan_version_id) {
      curr = await RegionalPlanVersion.findByPk(curr.parent_plan_version_id, {
        include: [
          {
            association: "planRule",
            include: [{ association: "steps", separate: true, order: [["level", "ASC"]] }],
          },
        ],
      });
    }
    if (curr) masterVersion = curr;
  }

  // List annual versions
  const annuals = await RegionalPlanVersion.findAll({
    where: { parent_plan_version_id: masterVersion.regional_plan_version_id, version_kind: "annual" },
    order: [["sequence_index", "ASC"], ["planning_year", "ASC"]],
  });
  const annualIds = annuals.map((a) => a.regional_plan_version_id);

  // List execution period versions
  const periodVersions = annualIds.length
    ? await RegionalPlanVersion.findAll({
        where: { parent_plan_version_id: { [Op.in]: annualIds }, version_kind: "execution_period" },
        order: [["sequence_index", "ASC"]],
      })
    : [];

  const availablePeriods = [];
  for (const annual of annuals) {
    const periodsForAnnual = periodVersions
      .filter((p) => p.parent_plan_version_id === annual.regional_plan_version_id)
      .sort((a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0));

    for (const p of periodsForAnnual) {
      const phase =
        p.execution_status === "open"
          ? "active"
          : p.execution_status === "completed"
          ? "past"
          : "upcoming";
      availablePeriods.push({
        plan_version_id: p.regional_plan_version_id,
        period_label: p.period_label || `Quarter ${p.sequence_index}`,
        planning_year: p.planning_year || annual.planning_year,
        sequence_index: p.sequence_index ?? null,
        execution_status: p.execution_status ?? "open",
        phase,
      });
    }
  }

  // Select target execution period
  let selectedPeriodMeta = null;
  if (periodVersionId && periodVersionId !== "auto") {
    selectedPeriodMeta = availablePeriods.find((p) => p.plan_version_id === periodVersionId) || null;
  }
  if (!selectedPeriodMeta && availablePeriods.length > 0) {
    selectedPeriodMeta =
      availablePeriods.find((p) => p.phase === "active") ||
      [...availablePeriods].reverse().find((p) => p.phase === "past") ||
      availablePeriods[0];
  }

  // Determine node source version: period if nodes exist, else master
  let nodeSourceVersionId = masterVersion.regional_plan_version_id;
  if (selectedPeriodMeta) {
    const periodNodeCount = await RegionalPlanNode.count({
      where: { regional_plan_version_id: selectedPeriodMeta.plan_version_id, is_active: true },
    });
    if (periodNodeCount > 0) {
      nodeSourceVersionId = selectedPeriodMeta.plan_version_id;
    }
  }

  const rawNodes = await RegionalPlanNode.findAll({
    where: { regional_plan_version_id: nodeSourceVersionId, is_active: true },
    order: [["level", "ASC"], ["order", "ASC"]],
    include: [
      {
        association: "internalAssignments",
        include: [
          { association: "department" },
          { association: "assignedUser", attributes: ["user_id", "full_name", "email"] },
        ],
      },
    ],
  });

  const { metricsMemo } = computeRegionalTreeRollup(rawNodes, masterVersion.planRule);

  // Map into hierarchical tree
  const childrenMap = new Map();
  const flatNodesWithMetrics = [];

  for (const node of rawNodes) {
    const m = metricsMemo.get(node.regional_plan_node_id) || {
      progressPercent: 0,
      computedActual: null,
      computedTarget: null,
      status: "not_started",
    };
    const nodeProgress = m.progressPercent;
    const hasProgress = m.computedActual !== null;

    const formattedNode = {
      id: node.regional_plan_node_id,
      title: node.title,
      type: node.type || "task",
      level: node.level,
      weight: node.weight,
      target_unit: node.target_unit,
      annual_target: node.annual_target,
      annual_actual: node.annual_actual,
      period_target: node.period_target,
      period_actual: node.period_actual,
      parent_id: node.parent_id,
      sharingMode: node.assignment_sharing_mode === "shared" ? "shared" : "exclusive",
      progress: nodeProgress,
      has_progress: hasProgress,
      status: nodeProgress >= 100 ? "completed" : (nodeProgress < 50 && hasProgress ? "delayed" : "active"),
      internalAssignments: node.internalAssignments || [],
      children: [],
    };

    flatNodesWithMetrics.push({
      ...node.toJSON(),
      execution_progress_percent: nodeProgress,
      evaluation_status: m.status,
    });

    if (node.parent_id) {
      if (!childrenMap.has(node.parent_id)) childrenMap.set(node.parent_id, []);
      childrenMap.get(node.parent_id).push(formattedNode);
    }
  }

  function assembleTree(node) {
    const kids = childrenMap.get(node.id) || [];
    node.children = kids.map((kid) => assembleTree(kid));
    return node;
  }

  const rootNodes = rawNodes
    .filter((n) => !n.parent_id)
    .map((rootRaw) => {
      const m = metricsMemo.get(rootRaw.regional_plan_node_id) || {
        progressPercent: 0,
        computedActual: null,
        computedTarget: null,
        status: "not_started",
      };
      const rootProgress = m.progressPercent;
      const rootFormatted = {
        id: rootRaw.regional_plan_node_id,
        title: rootRaw.title,
        type: rootRaw.type || "strategic",
        level: rootRaw.level,
        weight: rootRaw.weight,
        target_unit: rootRaw.target_unit,
        annual_target: rootRaw.annual_target,
        annual_actual: rootRaw.annual_actual,
        period_target: rootRaw.period_target,
        period_actual: rootRaw.period_actual,
        parent_id: null,
        sharingMode: rootRaw.assignment_sharing_mode === "shared" ? "shared" : "exclusive",
        progress: rootProgress,
        has_progress: m.computedActual !== null,
        status: rootProgress >= 100 ? "completed" : (rootProgress < 50 && m.computedActual !== null ? "delayed" : "active"),
        internalAssignments: rootRaw.internalAssignments || [],
        children: [],
      };
      return assembleTree(rootFormatted);
    });

  const hierarchyConfig = (masterVersion.planRule?.steps || []).map((s) => ({
    level: s.level,
    name: s.name,
    label: s.name,
    node_type: s.node_type || "task",
    allow_kpi: Boolean(s.allow_kpi),
    requires_weight: Boolean(s.requires_weight),
    color_hex: s.color_hex || "#059669",
  }));

  return {
    progress_tree: {
      period_label: selectedPeriodMeta?.period_label ?? null,
      planning_year: selectedPeriodMeta?.planning_year ?? null,
      period_version_id: selectedPeriodMeta?.plan_version_id ?? masterVersion.regional_plan_version_id,
      period_phase: selectedPeriodMeta?.phase ?? null,
      available_periods: availablePeriods,
      nodes: rootNodes,
      hierarchy_config: hierarchyConfig,
    },
    focus_master_plan_version_id: masterVersion.regional_plan_version_id,
    generated_at: new Date().toISOString(),
    // Backward compatibility
    version: masterVersion,
    tree: flatNodesWithMetrics,
  };
}

async function getRegionalExecutionDashboardDepartmentUser(regionId, planVersionId, filters = {}) {
  let masterVersionId = planVersionId;
  if (!masterVersionId || masterVersionId === "auto") {
    const latest = await RegionalPlanVersion.findOne({
      where: { region_id: regionId, version_kind: "master" },
      order: [["created_at", "DESC"]],
    });
    if (!latest) {
      return { departments: [], users: [], generated_at: new Date().toISOString() };
    }
    masterVersionId = latest.regional_plan_version_id;
  }

  const departments = await RegionalStructure.findAll({
    where: { region_id: regionId, is_active: true },
    order: [["level", "ASC"], ["name", "ASC"]],
  });

  const users = await User.findAll({
    where: { region_id: regionId, is_active: true },
    include: [
      { association: "roles", attributes: ["name"] },
      { association: "regionalStructure", attributes: ["regional_structure_id", "name"] },
    ],
  });

  // Get all associated version IDs: master, annual, period
  const childVersions = await RegionalPlanVersion.findAll({
    where: {
      [Op.or]: [
        { regional_plan_version_id: masterVersionId },
        { parent_plan_version_id: masterVersionId },
      ],
    },
    attributes: ["regional_plan_version_id"],
  });
  const allVersionIds = childVersions.map((v) => v.regional_plan_version_id);
  const periods = await RegionalPlanVersion.findAll({
    where: { parent_plan_version_id: { [Op.in]: allVersionIds } },
    attributes: ["regional_plan_version_id"],
  });
  const totalVersionIds = Array.from(new Set([...allVersionIds, ...periods.map((p) => p.regional_plan_version_id)]));

  const allAssignments = await RegionalInternalAssignment.findAll({
    where: { is_active: true },
    include: [
      {
        association: "planNode",
        where: { regional_plan_version_id: { [Op.in]: totalVersionIds }, is_active: true },
      },
    ],
  });

  const deptPerformance = departments.map((dept) => {
    const deptAssignments = allAssignments.filter(
      (a) => a.regional_structure_id === dept.regional_structure_id
    );
    const nodeMap = new Map();
    for (const a of deptAssignments) {
      if (a.planNode) nodeMap.set(a.planNode.regional_plan_node_id, a.planNode);
    }
    const assignedNodes = Array.from(nodeMap.values());
    const totalAssigned = assignedNodes.length;
    const reportedNodes = assignedNodes.filter((n) => {
      const actual = n.period_actual !== null ? Number(n.period_actual) : (n.annual_actual !== null ? Number(n.annual_actual) : null);
      const status = (n.period_actual_status || n.annual_actual_status || "").toLowerCase();
      const isEligible = isRollupEligibleAchievementStatus(status) || (actual !== null && (!status || status === "empty"));
      return actual !== null && isEligible;
    });
    const reportedCount = reportedNodes.length;

    let avgScore = 0;
    if (totalAssigned > 0) {
      const sum = assignedNodes.reduce((acc, n) => {
        const target = Number(n.period_target ?? n.annual_target ?? n.weight) || 0;
        const actual = n.period_actual !== null ? Number(n.period_actual) : (n.annual_actual !== null ? Number(n.annual_actual) : null);
        const status = (n.period_actual_status || n.annual_actual_status || "").toLowerCase();
        const isEligible = isRollupEligibleAchievementStatus(status) || (actual !== null && (!status || status === "empty"));
        if (isEligible && target > 0 && actual !== null) {
          return acc + Math.min(100, Math.round((actual / target) * 100));
        }
        return acc;
      }, 0);
      avgScore = Math.round(sum / totalAssigned);
    }

    const deptUsers = users.filter((u) => u.regional_structure_id === dept.regional_structure_id);

    return {
      regional_structure_id: dept.regional_structure_id,
      id: dept.regional_structure_id,
      name: dept.name,
      level: dept.level,
      structureId: dept.regional_structure_id,
      assigned_nodes_count: totalAssigned,
      assignedNodeCount: totalAssigned,
      reported_nodes_count: reportedCount,
      reportedNodeCount: reportedCount,
      avg_progress: avgScore,
      progress: avgScore,
      has_progress: reportedCount > 0,
      status: avgScore >= 100 ? "completed" : avgScore > 0 ? "active" : "active",
      userIds: deptUsers.map((u) => u.user_id),
    };
  });

  const userPerformance = users.map((u) => {
    const userAssignments = allAssignments.filter((a) => a.assigned_user_id === u.user_id);
    const nodeMap = new Map();
    for (const a of userAssignments) {
      if (a.planNode) nodeMap.set(a.planNode.regional_plan_node_id, a.planNode);
    }
    const assignedNodes = Array.from(nodeMap.values());
    const totalAssigned = assignedNodes.length;
    const reportedNodes = assignedNodes.filter((n) => {
      const actual = n.period_actual !== null ? Number(n.period_actual) : (n.annual_actual !== null ? Number(n.annual_actual) : null);
      const status = (n.period_actual_status || n.annual_actual_status || "").toLowerCase();
      const isEligible = isRollupEligibleAchievementStatus(status) || (actual !== null && (!status || status === "empty"));
      return actual !== null && isEligible;
    });
    const reportedCount = reportedNodes.length;

    let achievementPercent = null;
    if (totalAssigned > 0) {
      const sum = assignedNodes.reduce((acc, n) => {
        const target = Number(n.period_target ?? n.annual_target ?? n.weight) || 0;
        const actual = n.period_actual !== null ? Number(n.period_actual) : (n.annual_actual !== null ? Number(n.annual_actual) : null);
        const status = (n.period_actual_status || n.annual_actual_status || "").toLowerCase();
        const isEligible = isRollupEligibleAchievementStatus(status) || (actual !== null && (!status || status === "empty"));
        if (isEligible && target > 0 && actual !== null) {
          return acc + Math.min(100, Math.round((actual / target) * 100));
        }
        return acc;
      }, 0);
      achievementPercent = Math.round(sum / totalAssigned);
    }

    const performance =
      achievementPercent == null
        ? "average"
        : achievementPercent >= 85
        ? "excellent"
        : achievementPercent >= 70
        ? "good"
        : achievementPercent >= 50
        ? "average"
        : "at-risk";

    const roleName = u.roles?.[0]?.name || "Regional Staff";

    return {
      id: u.user_id,
      name: u.full_name,
      email: u.email,
      role: roleName,
      departmentId: u.regional_structure_id || null,
      departmentName: u.regionalStructure?.name || "Unassigned",
      assignedNodeCount: totalAssigned,
      reportedNodeCount: reportedCount,
      achievementPercent,
      has_progress: reportedCount > 0,
      performance,
      activityScore: achievementPercent ?? 0,
    };
  });

  return {
    departments: deptPerformance,
    users: userPerformance,
    generated_at: new Date().toISOString(),
  };
}

async function getRegionalPlanNodeAchievementHistory(nodeId, regionId, user = null) {
  const node = await getRegionalPlanNodeById(nodeId, regionId, user);
  const logs = await RegionalPlanNodeActionLog.findAll({
    where: {
      regional_plan_node_id: nodeId,
    },
    order: [["created_at", "DESC"]],
  });

  return {
    nodeId,
    currentNode: {
      period_actual: node.period_actual,
      period_actual_status: node.period_actual_status,
      period_actual_submitted_at: node.period_actual_submitted_at,
      period_actual_submitted_by: node.period_actual_submitted_by,
      period_actual_approved_at: node.period_actual_approved_at,
      period_actual_approved_by: node.period_actual_approved_by,
      period_actual_validated_at: node.period_actual_validated_at,
      period_actual_validated_by: node.period_actual_validated_by,
      period_actual_rejection_comment: node.period_actual_rejection_comment,
      is_validation_required: node.is_validation_required,
      narration: node.narration,
      evidence_attachment_ids: node.evidence_attachment_ids,
    },
    history: logs,
    revisions: logs,
  };
}

module.exports = {
  // Config & Rules
  initializeRegionalPlanningDefaults,
  getEffectiveRegionalPlanningConfig,
  updateRegionalPlanningConfig,
  restoreDefaultRegionalPlanningConfig,
  getRegionalPlanningConfigForVersion,
  updateRegionalPlanningConfigForVersion,
  listRegionalPlanRules,
  getRegionalPlanRuleById,
  getRegionalPlanRuleForVersion,
  updateRegionalPlanRuleForVersion,
  createRegionalPlanRule,
  updateRegionalPlanRule,
  deleteRegionalPlanRule,
  formatRegionalRuleResponse,

  // Performance Color Thresholds
  listRegionalPerformanceColorThresholds,
  getRegionalPerformanceColorThresholdById,
  createRegionalPerformanceColorThreshold,
  updateRegionalPerformanceColorThreshold,
  deleteRegionalPerformanceColorThreshold,
  resolveRegionalPerformanceColor,

  // Plan Review
  getRegionalPlanVersionsForReview,
  getRegionalPublishForReviewReadiness,
  publishRegionalPlanForReview,
  unlockRegionalPlanReviewCorrections,
  republishRegionalPlanForReview,
  getRegionalCompleteReviewReadiness,
  completeRegionalPlanReview,
  getRegionalPlanReviewDashboard,

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
  getRegionalPlanNodeAchievementHistory,
  updateRegionalPlanNode,
  deleteRegionalPlanNode,
  reorderRegionalPlanNodes,
  assignRegionalPlanNode,
  removeRegionalPlanNodeAssignment,
  validateRegionalNodeAssignmentScoping,

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
  assertUserCanExecuteAchievement,
  assertUserCanApproveAchievement,
  assertUserCanValidateAchievement,
  userQualifiesForRegionalBypass,
  isRollupEligibleAchievementStatus,

  // Dashboard & Metrics
  getRegionalExecutionDashboardSummary,
  getRegionalExecutionDashboardProgressTree,
  getRegionalExecutionDashboardDepartmentUser,
};
