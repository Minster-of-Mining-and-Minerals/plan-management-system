"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");
const medicalWorkflowService = require("../medicalWorkflowService");
const notificationService = require("../notificationService");

class WorkflowExecutionService {
  async startWorkflow({ appointment_id, workflow_id, staff_id }) {
    const t = await db.sequelize.transaction();
    try {
      const definition = await db.ClinicalWorkflowDefinition.findOne({
        where: { workflow_id },
        include: [{
          model: db.WorkflowStepDefinition,
          as: "stepDefinitions",
        }],
        order: [[{ model: db.WorkflowStepDefinition, as: "stepDefinitions" }, "step_number", "ASC"]],
        transaction: t
      });

      if (!definition) throw new Error("Workflow definition not found");
      
      const appointment = await db.StaffAppointment.findByPk(appointment_id, { transaction: t });
      if (!appointment) throw new Error("Appointment not found");

      const steps = definition.stepDefinitions || [];
      if (steps.length === 0) throw new Error("Workflow has no steps defined");

      const firstStep = steps[0];

      const instance = await db.WorkflowInstance.create({
        instance_id: uuidv4(),
        workflow_id,
        appointment_id,
        patient_id: appointment.patient_id,
        status: "ACTIVE",
        current_step_id: firstStep.step_id,
        started_at: new Date(),
        started_by: staff_id,
      }, { transaction: t });

      const stepInstance = await db.WorkflowStepInstance.create({
        step_instance_id: uuidv4(),
        instance_id: instance.instance_id,
        step_id: firstStep.step_id,
        status: "ACTIVE",
        started_at: new Date(),
        assigned_department_id: firstStep.department_id || null,
        assigned_staff_id: firstStep.role_id ? null : staff_id, // If specific staff is not determined, we might leave it null or assign to starter
      }, { transaction: t });

      // Create initial workflow task
      await db.WorkflowTask.create({
        task_id: uuidv4(),
        appointment_id,
        patient_id: appointment.patient_id,
        assignee_staff_id: staff_id,
        assigned_by_staff_id: staff_id,
        status: "pending",
      }, { transaction: t });

      await appointment.update({ workflow_status: "active" }, { transaction: t });

      await t.commit();
      return { instance, stepInstance };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async completeWorkflowStep({ appointment_id, step_instance_id, staff_id, form_data, form_config_id, notes }) {
    const t = await db.sequelize.transaction();
    try {
      const stepInstance = await db.WorkflowStepInstance.findByPk(step_instance_id, {
        include: [{ model: db.WorkflowStepDefinition, as: "stepDefinition" }, { model: db.WorkflowInstance, as: "workflowInstance" }],
        transaction: t
      });

      if (!stepInstance) throw new Error("Step instance not found");
      if (stepInstance.status === "COMPLETED") throw new Error("Step already completed");

      const workflowInstance = stepInstance.workflowInstance;

      // 1. Submit data via medicalWorkflowService to generate MedicalHistoryLog
      // This will also close pending tasks for this staff.
      await medicalWorkflowService.submitWorkflowEntry(staff_id, {
        appointment_id,
        header_title: stepInstance.stepDefinition.name,
        action_type: "submit",
        form_data,
        form_config_id: form_config_id || stepInstance.stepDefinition.form_config_id,
        notes
      });

      // 2. Mark step completed
      await stepInstance.update({
        status: "COMPLETED",
        completed_at: new Date(),
        completed_by: staff_id
      }, { transaction: t });

      // 3. Determine next step
      const definition = await db.ClinicalWorkflowDefinition.findOne({
        where: { workflow_id: workflowInstance.workflow_id },
        include: [{ model: db.WorkflowStepDefinition, as: "stepDefinitions" }],
        order: [[{ model: db.WorkflowStepDefinition, as: "stepDefinitions" }, "step_number", "ASC"]],
        transaction: t
      });

      const steps = definition.stepDefinitions || [];
      const currentIndex = steps.findIndex(s => s.step_id === stepInstance.step_id);
      
      let nextStep = null;
      if (currentIndex !== -1 && currentIndex < steps.length - 1) {
        nextStep = steps[currentIndex + 1];
        // TODO: Evaluate conditions in nextStep.transition_conditions if any
      }

      if (nextStep) {
        // Create next step instance
        const nextStepInstance = await db.WorkflowStepInstance.create({
          step_instance_id: uuidv4(),
          instance_id: workflowInstance.instance_id,
          step_id: nextStep.step_id,
          status: "ACTIVE",
          started_at: new Date(),
          assigned_department_id: nextStep.department_id || null,
        }, { transaction: t });

        await workflowInstance.update({ current_step_id: nextStep.step_id }, { transaction: t });
        
        // If the next step is assigned to the SAME staff, create a task.
        // Otherwise, if it requires department routing, it enters a queue or we require manual forward.
        // For now, assign to the same staff if no strict role change, otherwise it relies on queue.
        await db.WorkflowTask.create({
          task_id: uuidv4(),
          appointment_id,
          patient_id: workflowInstance.patient_id,
          assignee_staff_id: staff_id, // Defaulting to current staff, they can forward it
          assigned_by_staff_id: staff_id,
          status: "pending",
        }, { transaction: t });

      } else {
        // Workflow completed
        await workflowInstance.update({
          status: "COMPLETED",
          current_step_id: null,
          completed_at: new Date(),
          completed_by: staff_id
        }, { transaction: t });

        const appointment = await db.StaffAppointment.findByPk(appointment_id, { transaction: t });
        await appointment.update({ workflow_status: "completed", workflow_completed_at: new Date() }, { transaction: t });
      }

      await t.commit();
      return { workflowInstance, stepInstance };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async forwardWorkflowStep({ appointment_id, step_instance_id, from_staff_id, to_staff_id, notes }) {
    const t = await db.sequelize.transaction();
    try {
      const stepInstance = await db.WorkflowStepInstance.findByPk(step_instance_id, { transaction: t });
      if (!stepInstance) throw new Error("Step instance not found");

      // Delegate to medicalWorkflowService for the heavy lifting (log, close task, create task, notify)
      await medicalWorkflowService.submitWorkflowEntry(from_staff_id, {
        appointment_id,
        header_title: "Forwarded Step",
        action_type: "forward",
        receiver_staff_id: to_staff_id,
        notes,
        partial: true
      });

      // Update step assignment
      await stepInstance.update({
        assigned_staff_id: to_staff_id
      }, { transaction: t });

      await t.commit();
      return stepInstance;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

module.exports = new WorkflowExecutionService();
