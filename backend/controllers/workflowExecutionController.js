"use strict";

const workflowExecutionService = require("../services/workflow/workflowExecutionService");
const db = require("../models");

exports.startWorkflow = async (req, res) => {
  try {
    const { appointment_id, workflow_id } = req.body;
    const staff_id = req.user.user_id;

    const result = await workflowExecutionService.startWorkflow({
      appointment_id,
      workflow_id,
      staff_id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getWorkflowState = async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const instance = await db.WorkflowInstance.findOne({
      where: { appointment_id },
      include: [
        {
          model: db.WorkflowStepInstance,
          as: "stepInstances",
          include: [{ model: db.WorkflowStepDefinition, as: "stepDefinition" }],
          order: [["created_at", "ASC"]],
        },
        {
          model: db.ClinicalWorkflowDefinition,
          as: "workflowDefinition",
          include: [{ model: db.WorkflowStepDefinition, as: "stepDefinitions" }],
        }
      ]
    });

    if (!instance) {
      return res.status(404).json({ success: false, error: "No active workflow for this appointment" });
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.completeStep = async (req, res) => {
  try {
    const { appointment_id, step_instance_id } = req.params;
    const { form_data, form_config_id, notes } = req.body;
    const staff_id = req.user.user_id;

    const result = await workflowExecutionService.completeWorkflowStep({
      appointment_id,
      step_instance_id,
      staff_id,
      form_data,
      form_config_id,
      notes,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.forwardStep = async (req, res) => {
  try {
    const { appointment_id, step_instance_id } = req.params;
    const { to_staff_id, notes } = req.body;
    const staff_id = req.user.user_id;

    const result = await workflowExecutionService.forwardWorkflowStep({
      appointment_id,
      step_instance_id,
      from_staff_id: staff_id,
      to_staff_id,
      notes,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
