"use strict";

const workflowExecutionService = require("../services/workflow/workflowExecutionService");
const db = require("../models");

jest.mock("../models", () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    }),
  },
  ClinicalWorkflowDefinition: { findOne: jest.fn() },
  StaffAppointment: { findByPk: jest.fn() },
  WorkflowInstance: { create: jest.fn() },
  WorkflowStepInstance: { create: jest.fn() },
  WorkflowTask: { create: jest.fn() },
}));

describe("WorkflowExecutionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should start a workflow successfully", async () => {
    db.ClinicalWorkflowDefinition.findOne.mockResolvedValue({
      workflow_id: "wf-1",
      stepDefinitions: [{ step_id: "step-1", step_number: 1 }]
    });

    db.StaffAppointment.findByPk.mockResolvedValue({
      appointment_id: "app-1",
      patient_id: "pat-1",
      update: jest.fn()
    });

    db.WorkflowInstance.create.mockResolvedValue({ instance_id: "inst-1" });
    db.WorkflowStepInstance.create.mockResolvedValue({ step_instance_id: "si-1" });

    const result = await workflowExecutionService.startWorkflow({
      appointment_id: "app-1",
      workflow_id: "wf-1",
      staff_id: "staff-1"
    });

    expect(result).toHaveProperty("instance");
    expect(result).toHaveProperty("stepInstance");
    expect(db.WorkflowTask.create).toHaveBeenCalled();
  });

  it("should throw error if workflow definition not found", async () => {
    db.ClinicalWorkflowDefinition.findOne.mockResolvedValue(null);

    await expect(workflowExecutionService.startWorkflow({
      appointment_id: "app-1",
      workflow_id: "wf-1",
      staff_id: "staff-1"
    })).rejects.toThrow("Workflow definition not found");
  });
});
