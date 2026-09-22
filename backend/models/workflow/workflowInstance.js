"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WorkflowInstance extends Model {
    static associate(models) {
      WorkflowInstance.belongsTo(models.ClinicalWorkflowDefinition, {
        foreignKey: "workflow_id",
        as: "workflowDefinition",
      });
      WorkflowInstance.belongsTo(models.StaffAppointment, {
        foreignKey: "appointment_id",
        as: "appointment",
      });
      WorkflowInstance.belongsTo(models.User, {
        foreignKey: "patient_id",
        as: "patient",
      });
      WorkflowInstance.belongsTo(models.WorkflowStepDefinition, {
        foreignKey: "current_step_id",
        as: "currentStepDefinition",
      });
      WorkflowInstance.belongsTo(models.User, {
        foreignKey: "started_by",
        as: "startedByUser",
      });
      WorkflowInstance.belongsTo(models.User, {
        foreignKey: "completed_by",
        as: "completedByUser",
      });
      WorkflowInstance.hasMany(models.WorkflowStepInstance, {
        foreignKey: "instance_id",
        as: "stepInstances",
      });
    }
  }

  WorkflowInstance.init(
    {
      instance_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workflow_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
      current_step_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      started_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      completed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "WorkflowInstance",
      tableName: "workflow_instances",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return WorkflowInstance;
};
