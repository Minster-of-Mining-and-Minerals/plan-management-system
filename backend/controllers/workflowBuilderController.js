"use strict";

const db = require("../models");
const { v4: uuidv4 } = require("uuid");

exports.getWorkflows = async (req, res) => {
  try {
    const workflows = await db.ClinicalWorkflowDefinition.findAll({
      order: [["created_at", "DESC"]],
    });
    res.json({ success: true, data: workflows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getWorkflowById = async (req, res) => {
  try {
    const workflow = await db.ClinicalWorkflowDefinition.findOne({
      where: { workflow_id: req.params.id },
      include: [
        {
          model: db.WorkflowStepDefinition,
          as: "stepDefinitions",
        },
      ],
      order: [[{ model: db.WorkflowStepDefinition, as: "stepDefinitions" }, "step_number", "ASC"]],
    });
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }
    res.json({ success: true, data: workflow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const workflow = await db.ClinicalWorkflowDefinition.create({
      workflow_id: uuidv4(),
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      department_id: req.body.department_id || "GENERAL",
      steps: [], // Keeping this for backward compatibility for now
      is_active: true,
    });
    res.status(201).json({ success: true, data: workflow });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.addStep = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const workflow_id = req.params.id;
    const { name, type, form_config_id, department_id, role_id, transition_conditions } = req.body;

    const existingSteps = await db.WorkflowStepDefinition.count({
      where: { workflow_id },
      transaction: t,
    });

    const step = await db.WorkflowStepDefinition.create({
      step_id: uuidv4(),
      workflow_id,
      step_number: existingSteps + 1,
      name,
      type,
      form_config_id: form_config_id || null,
      department_id: department_id || null,
      role_id: role_id || null,
      transition_conditions: transition_conditions || [],
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, data: step });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.reorderSteps = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const workflow_id = req.params.id;
    const { stepIds } = req.body; // Array of step_ids in new order

    for (let i = 0; i < stepIds.length; i++) {
      await db.WorkflowStepDefinition.update(
        { step_number: i + 1 },
        { where: { step_id: stepIds[i], workflow_id }, transaction: t }
      );
    }

    await t.commit();
    res.json({ success: true, message: "Steps reordered successfully" });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteStep = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { id: workflow_id, stepId: step_id } = req.params;

    await db.WorkflowStepDefinition.destroy({
      where: { step_id, workflow_id },
      transaction: t,
    });

    // Reorder remaining steps
    const remainingSteps = await db.WorkflowStepDefinition.findAll({
      where: { workflow_id },
      order: [["step_number", "ASC"]],
      transaction: t,
    });

    for (let i = 0; i < remainingSteps.length; i++) {
      await remainingSteps[i].update({ step_number: i + 1 }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: "Step deleted" });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, error: error.message });
  }
};
