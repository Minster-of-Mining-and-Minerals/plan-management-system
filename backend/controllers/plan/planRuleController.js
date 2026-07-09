"use strict";

const { v4: uuidv4 } = require("uuid");

const {
  PlanRule,
  PlanRuleStep,
  PlanVersion,
  GovernmentStructure,
  sequelize,
} = require("../../models");
const { resolvePlanRuleForVersion } = require("../../services/planRuleService");
const { normalizeRuleSteps, enrichRuleSteps } = require("../../services/planRuleStepUtils");
const { loadGovernmentStructureIndex } = require("../../services/planVisibilityService");
const {
  isSuperAdminActor,
  resolveManageableStructureId,
  buildPlanRuleVisibilityWhere,
  assertPlanRuleAccessible,
  assertPlanRuleModifiable,
  assertPlanRuleDeletable,
  sendScopeError,
} = require("../../utils/structureScopeUtils");

const includeSteps = [
  {
    model: PlanRuleStep,
    as: "steps",
    separate: true,
    order: [["step_order", "ASC"]],
  },
  {
    model: GovernmentStructure,
    as: "governmentStructure",
    attributes: ["government_structure_id", "name"],
  },
];

function formatRuleResponse(rule) {
  if (!rule) return rule;

  const plain =
    typeof rule.get === "function" ? rule.get({ plain: true }) : rule.toJSON?.() ?? rule;

  return {
    ...plain,
    steps: enrichRuleSteps(plain.steps || []),
  };
}

const getPlanRules = async (req, res) => {
  try {
    const { government_structure_id: queryStructureId, is_active } = req.query;
    const where = {};

    if (is_active !== undefined) where.is_active = is_active === "true";

    const structureIndex = await loadGovernmentStructureIndex();

    let structureId;
    try {
      structureId = resolveManageableStructureId(
        req,
        queryStructureId,
        structureIndex
      );
    } catch (error) {
      return sendScopeError(res, error);
    }

    try {
      Object.assign(
        where,
        buildPlanRuleVisibilityWhere(req, structureId, structureIndex)
      );
    } catch (error) {
      return sendScopeError(res, error);
    }

    const rules = await PlanRule.findAll({
      where,
      include: includeSteps,
      order: [["created_at", "DESC"]],
    });

    return res.json({
      success: true,
      data: rules.map(formatRuleResponse),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPlanRuleById = async (req, res) => {
  try {
    const { government_structure_id: queryStructureId } = req.query;
    const structureIndex = await loadGovernmentStructureIndex();

    let structureId;
    try {
      structureId = resolveManageableStructureId(
        req,
        queryStructureId,
        structureIndex
      );
    } catch (error) {
      return sendScopeError(res, error);
    }

    const rule = await PlanRule.findByPk(req.params.id, { include: includeSteps });
    if (!rule) return res.status(404).json({ message: "Plan rule not found" });

    try {
      assertPlanRuleAccessible(rule, req, structureId, structureIndex);
    } catch (error) {
      return sendScopeError(res, error);
    }

    return res.json({ success: true, data: formatRuleResponse(rule) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPlanRuleForVersion = async (req, res) => {
  try {
    const planVersion = await PlanVersion.findByPk(req.params.versionId);
    if (!planVersion) return res.status(404).json({ message: "Plan version not found" });

    const rule = await resolvePlanRuleForVersion(planVersion);
    return res.json({ success: true, data: rule ? formatRuleResponse(rule) : null });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updatePlanRuleForVersion = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const planVersion = await PlanVersion.findByPk(req.params.versionId, { transaction: t });
    if (!planVersion) {
      await t.rollback();
      return res.status(404).json({ message: "Plan version not found" });
    }

    if (planVersion.version_kind !== "master" || planVersion.status !== "draft") {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Only draft master plans can update their plan rule snapshot.",
      });
    }

    if (!planVersion.plan_rule_id) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "This plan draft does not have a plan rule snapshot.",
      });
    }

    const rule = await PlanRule.findByPk(planVersion.plan_rule_id, { transaction: t });
    if (!rule?.owned_by_plan_version_id) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "This plan draft does not have an owned plan rule snapshot.",
      });
    }

    const { name, is_active, steps } = req.body;

    await rule.update(
      {
        ...(name !== undefined && { name }),
        ...(is_active !== undefined && { is_active }),
      },
      { transaction: t }
    );

    if (steps) {
      let normalizedSteps;
      try {
        normalizedSteps = normalizeRuleSteps(steps);
      } catch (err) {
        await t.rollback();
        return res.status(400).json({ success: false, message: err.message });
      }

      await PlanRuleStep.destroy({ where: { plan_rule_id: rule.plan_rule_id }, transaction: t });
      await PlanRuleStep.bulkCreate(
        normalizedSteps.map((step) => ({
          plan_rule_step_id: uuidv4(),
          plan_rule_id: rule.plan_rule_id,
          ...step,
        })),
        { transaction: t }
      );
    }

    await t.commit();

    const updated = await PlanRule.findByPk(rule.plan_rule_id, { include: includeSteps });
    return res.json({
      success: true,
      message: "Draft plan rule updated",
      data: formatRuleResponse(updated),
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

const createPlanRule = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      government_structure_id: bodyStructureId,
      inherit_to_descendants = false,
      is_active,
      steps,
    } = req.body;
    const structureIndex = await loadGovernmentStructureIndex();

    let resolvedStructureId = null;
    let inheritToDescendants = Boolean(inherit_to_descendants);

    if (inheritToDescendants) {
      try {
        resolvedStructureId = resolveManageableStructureId(
          req,
          bodyStructureId,
          structureIndex
        );
      } catch (error) {
        await t.rollback();
        return sendScopeError(res, error);
      }

      if (!resolvedStructureId) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "A sector is required for inherited global plan rules.",
        });
      }
    } else if (bodyStructureId) {
      try {
        resolvedStructureId = resolveManageableStructureId(
          req,
          bodyStructureId,
          structureIndex
        );
      } catch (error) {
        await t.rollback();
        return sendScopeError(res, error);
      }
    } else if (!isSuperAdminActor(req)) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create system-wide global plan rules.",
      });
    }

    let normalizedSteps;
    try {
      normalizedSteps = normalizeRuleSteps(steps);
    } catch (err) {
      await t.rollback();
      return res.status(400).json({ success: false, message: err.message });
    }

    const rule = await PlanRule.create(
      {
        plan_rule_id: uuidv4(),
        name,
        government_structure_id: resolvedStructureId,
        inherit_to_descendants: inheritToDescendants,
        is_active: is_active !== false,
      },
      { transaction: t }
    );

    await PlanRuleStep.bulkCreate(
      normalizedSteps.map((step) => ({
        plan_rule_step_id: uuidv4(),
        plan_rule_id: rule.plan_rule_id,
        ...step,
      })),
      { transaction: t }
    );

    await t.commit();

    const created = await PlanRule.findByPk(rule.plan_rule_id, { include: includeSteps });
    return res.status(201).json({
      success: true,
      message: "Plan rule created",
      data: formatRuleResponse(created),
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

const updatePlanRule = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const rule = await PlanRule.findByPk(req.params.id, { transaction: t });
    if (!rule) {
      await t.rollback();
      return res.status(404).json({ message: "Plan rule not found" });
    }

    const structureIndex = await loadGovernmentStructureIndex();

    try {
      assertPlanRuleModifiable(rule, req, structureIndex);
    } catch (error) {
      await t.rollback();
      return sendScopeError(res, error);
    }

    const { name, government_structure_id: bodyStructureId, inherit_to_descendants, is_active, steps } = req.body;

    let nextStructureId = rule.government_structure_id;
    let nextInheritToDescendants = Boolean(rule.inherit_to_descendants);

    if (bodyStructureId !== undefined || inherit_to_descendants !== undefined) {
      const requestedInherit =
        inherit_to_descendants !== undefined
          ? Boolean(inherit_to_descendants)
          : nextInheritToDescendants;
      const requestedStructureId =
        bodyStructureId !== undefined ? bodyStructureId || null : nextStructureId;

      if (requestedInherit) {
        try {
          nextStructureId = resolveManageableStructureId(
            req,
            requestedStructureId,
            structureIndex
          );
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }

        if (!nextStructureId) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "A sector is required for inherited global plan rules.",
          });
        }

        nextInheritToDescendants = true;
      } else if (requestedStructureId) {
        try {
          nextStructureId = resolveManageableStructureId(
            req,
            requestedStructureId,
            structureIndex
          );
        } catch (error) {
          await t.rollback();
          return sendScopeError(res, error);
        }
        nextInheritToDescendants = false;
      } else if (!isSuperAdminActor(req)) {
        await t.rollback();
        return res.status(403).json({
          success: false,
          message: "Only Super Admin can assign system-wide global scope to plan rules.",
        });
      } else {
        nextStructureId = null;
        nextInheritToDescendants = false;
      }
    }

    await rule.update(
      {
        ...(name !== undefined && { name }),
        ...(bodyStructureId !== undefined || inherit_to_descendants !== undefined
          ? {
              government_structure_id: nextStructureId,
              inherit_to_descendants: nextInheritToDescendants,
            }
          : {}),
        ...(is_active !== undefined && { is_active }),
      },
      { transaction: t }
    );

    if (steps) {
      let normalizedSteps;
      try {
        normalizedSteps = normalizeRuleSteps(steps);
      } catch (err) {
        await t.rollback();
        return res.status(400).json({ success: false, message: err.message });
      }

      await PlanRuleStep.destroy({ where: { plan_rule_id: rule.plan_rule_id }, transaction: t });
      await PlanRuleStep.bulkCreate(
        normalizedSteps.map((step) => ({
          plan_rule_step_id: uuidv4(),
          plan_rule_id: rule.plan_rule_id,
          ...step,
        })),
        { transaction: t }
      );
    }

    await t.commit();

    const updated = await PlanRule.findByPk(rule.plan_rule_id, { include: includeSteps });
    return res.json({ success: true, message: "Plan rule updated", data: formatRuleResponse(updated) });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

const deletePlanRule = async (req, res) => {
  try {
    const rule = await PlanRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ message: "Plan rule not found" });

    const structureIndex = await loadGovernmentStructureIndex();

    try {
      assertPlanRuleDeletable(rule, req, structureIndex);
    } catch (error) {
      return sendScopeError(res, error);
    }

    const inUse = await PlanVersion.count({ where: { plan_rule_id: rule.plan_rule_id } });
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete plan rule that is assigned to plan versions",
      });
    }

    await rule.destroy();
    return res.json({ success: true, message: "Plan rule deleted" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPlanRules,
  getPlanRuleById,
  getPlanRuleForVersion,
  updatePlanRuleForVersion,
  createPlanRule,
  updatePlanRule,
  deletePlanRule,
};
