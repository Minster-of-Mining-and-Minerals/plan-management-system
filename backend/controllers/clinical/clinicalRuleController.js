"use strict";

const { v4: uuidv4 } = require("uuid");
const clinicalRuleEngineService = require("../../services/clinicalRuleEngineService");
const db = require("../../models");

async function listRules(req, res, next) {
  try {
    await clinicalRuleEngineService.ensureInitialized();
    const rules = await db.ClinicalRule.findAll({
      order: [["name", "ASC"]],
    });
    return res.json(rules);
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const { ruleId } = req.params;
    const { is_enabled, severity } = req.body;

    const rule = await db.ClinicalRule.findByPk(ruleId);
    if (!rule) {
      return res.status(404).json({ error: "Clinical rule not found" });
    }

    await rule.update({
      ...(is_enabled !== undefined ? { is_enabled } : {}),
      ...(severity !== undefined ? { severity } : {}),
    });

    return res.json(rule);
  } catch (err) {
    next(err);
  }
}

async function evaluateRules(req, res, next) {
  try {
    const { trigger_event, context_data } = req.body;
    if (!trigger_event || !context_data) {
      return res.status(400).json({ error: "trigger_event and context_data are required" });
    }

    const alerts = await clinicalRuleEngineService.evaluateRules(trigger_event, context_data);
    return res.json({ alerts });
  } catch (err) {
    next(err);
  }
}

async function listAllergies(req, res, next) {
  try {
    const { patientId } = req.params;
    const allergies = await db.PatientAllergy.findAll({
      where: { patient_id: patientId },
      include: [
        { model: db.User, as: "creator", attributes: ["user_id", "full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });
    return res.json(allergies);
  } catch (err) {
    next(err);
  }
}

async function createAllergy(req, res, next) {
  try {
    const { patient_id, allergen, severity, reaction } = req.body;
    if (!patient_id || !allergen) {
      return res.status(400).json({ error: "patient_id and allergen are required" });
    }

    const allergy = await db.PatientAllergy.create({
      allergy_id: uuidv4(),
      patient_id,
      allergen,
      severity: severity || "MEDIUM",
      reaction,
      created_by: req.user.user_id,
    });

    return res.status(201).json(allergy);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRules,
  updateRule,
  evaluateRules,
  listAllergies,
  createAllergy,
};
