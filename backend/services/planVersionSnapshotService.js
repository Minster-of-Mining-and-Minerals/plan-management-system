"use strict";

const { v4: uuidv4 } = require("uuid");
const { PlanRule, PlanRuleStep, PlanVersion, PlanningConfiguration } = require("../models");
const { resolvePlanRuleForVersion } = require("./planRuleService");
const { resolveMasterPlanVersionForConfig } = require("../utils/planVersionHierarchyUtils");
const {
  getEffectivePlanningConfigForStructure,
  pickPlanningConfigPayload,
} = require("./planningConfigurationService");

async function forkPlanRule(sourceRule, planVersionId, transaction = null) {
  if (!sourceRule) return null;

  const plain =
    typeof sourceRule.get === "function" ? sourceRule.get({ plain: true }) : sourceRule;

  const steps =
    sourceRule.steps ??
    (await PlanRuleStep.findAll({
      where: { plan_rule_id: plain.plan_rule_id },
      order: [["step_order", "ASC"]],
      transaction,
    }));

  const forkedRule = await PlanRule.create(
    {
      plan_rule_id: uuidv4(),
      name: plain.name,
      government_structure_id: plain.government_structure_id,
      is_active: plain.is_active !== false,
      inherit_to_descendants: false,
      owned_by_plan_version_id: planVersionId,
      source_plan_rule_id: plain.plan_rule_id,
    },
    { transaction }
  );

  for (const step of steps) {
    const stepPlain =
      typeof step.get === "function" ? step.get({ plain: true }) : step;
    await PlanRuleStep.create(
      {
        plan_rule_step_id: uuidv4(),
        plan_rule_id: forkedRule.plan_rule_id,
        step_order: stepPlain.step_order,
        node_type: stepPlain.node_type,
        label: stepPlain.label,
        requires_weight: stepPlain.requires_weight,
        requires_contribution_weight: stepPlain.requires_contribution_weight ?? false,
        color_hex: stepPlain.color_hex,
      },
      { transaction }
    );
  }

  return PlanRule.findByPk(forkedRule.plan_rule_id, {
    include: [
      {
        model: PlanRuleStep,
        as: "steps",
        separate: true,
        order: [["step_order", "ASC"]],
      },
    ],
    transaction,
  });
}

async function forkPlanningConfiguration(sourceConfig, planVersionId, transaction = null) {
  if (!sourceConfig) return null;

  const plain = pickPlanningConfigPayload(sourceConfig);
  const now = new Date();

  return PlanningConfiguration.create(
    {
      planning_configuration_id: uuidv4(),
      government_structure_id: null,
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
      owned_by_plan_version_id: planVersionId,
      source_planning_configuration_id: plain.planning_configuration_id,
      created_at: now,
      updated_at: now,
    },
    { transaction }
  );
}

async function attachDraftSnapshotsToPlanVersion(planVersion, transaction = null) {
  const version = await PlanVersion.findByPk(planVersion.plan_version_id, { transaction });
  if (!version || version.version_kind !== "master") {
    return version;
  }

  const updates = {};

  const existingRule = version.plan_rule_id
    ? await PlanRule.findByPk(version.plan_rule_id, { transaction })
    : null;

  if (existingRule?.owned_by_plan_version_id === version.plan_version_id) {
    // already owns a forked rule
  } else {
    const sourceRule =
      existingRule ?? (await resolvePlanRuleForVersion(version, transaction));
    if (sourceRule) {
      const forkedRule = await forkPlanRule(sourceRule, version.plan_version_id, transaction);
      updates.plan_rule_id = forkedRule.plan_rule_id;
    }
  }

  const existingConfig = version.planning_configuration_id
    ? await PlanningConfiguration.findByPk(version.planning_configuration_id, { transaction })
    : null;

  if (existingConfig?.owned_by_plan_version_id === version.plan_version_id) {
    // already owns a forked config
  } else {
    const effectiveConfig = await getEffectivePlanningConfigForStructure(
      version.government_structure_id,
      transaction
    );
    const sourceRecord = await PlanningConfiguration.findByPk(
      effectiveConfig.planning_configuration_id,
      { transaction }
    );
    const forkedConfig = await forkPlanningConfiguration(
      sourceRecord ?? effectiveConfig,
      version.plan_version_id,
      transaction
    );
    updates.planning_configuration_id = forkedConfig.planning_configuration_id;
  }

  if (Object.keys(updates).length > 0) {
    await version.update(updates, { transaction });
  }

  return version.reload({ transaction });
}

async function getEffectivePlanningConfigForPlanVersion(planVersion, transaction = null) {
  const master = await resolveMasterPlanVersionForConfig(planVersion, transaction);
  if (!master) {
    return getEffectivePlanningConfigForStructure(null, transaction);
  }

  if (master.planning_configuration_id) {
    const ownedRecord = await PlanningConfiguration.findByPk(master.planning_configuration_id, {
      transaction,
    });
    if (ownedRecord) {
      return pickPlanningConfigPayload(ownedRecord);
    }
  }

  return getEffectivePlanningConfigForStructure(master.government_structure_id, transaction);
}

function buildPlanningConfigResponseForVersion(record, masterVersion) {
  const plain = pickPlanningConfigPayload(record);
  return {
    ...plain,
    meta: {
      scope: "draft",
      government_structure_id: masterVersion.government_structure_id,
      is_using_default: false,
      has_sector_override: false,
      owned_by_plan_version_id: masterVersion.plan_version_id,
      source_planning_configuration_id: record.source_planning_configuration_id ?? null,
    },
  };
}

module.exports = {
  forkPlanRule,
  forkPlanningConfiguration,
  attachDraftSnapshotsToPlanVersion,
  getEffectivePlanningConfigForPlanVersion,
  buildPlanningConfigResponseForVersion,
};
