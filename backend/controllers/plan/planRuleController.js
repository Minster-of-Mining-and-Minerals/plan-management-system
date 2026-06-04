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

    const { government_structure_id, is_active } = req.query;

    const where = {};

    if (government_structure_id) where.government_structure_id = government_structure_id;

    if (is_active !== undefined) where.is_active = is_active === "true";



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

    const rule = await PlanRule.findByPk(req.params.id, { include: includeSteps });

    if (!rule) return res.status(404).json({ message: "Plan rule not found" });

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



const createPlanRule = async (req, res) => {

  const t = await sequelize.transaction();

  try {

    const { name, government_structure_id, is_active, steps } = req.body;



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

        government_structure_id: government_structure_id || null,

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



    const { name, government_structure_id, is_active, steps } = req.body;



    await rule.update(

      {

        ...(name !== undefined && { name }),

        ...(government_structure_id !== undefined && {

          government_structure_id: government_structure_id || null,

        }),

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

  createPlanRule,

  updatePlanRule,

  deletePlanRule,

};

