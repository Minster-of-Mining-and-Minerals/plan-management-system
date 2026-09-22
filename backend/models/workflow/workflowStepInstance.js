"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WorkflowStepInstance extends Model {
    static associate(models) {
      WorkflowStepInstance.belongsTo(models.WorkflowInstance, {
        foreignKey: "instance_id",
        as: "workflowInstance",
      });
      WorkflowStepInstance.belongsTo(models.WorkflowStepDefinition, {
        foreignKey: "step_id",
        as: "stepDefinition",
      });
      WorkflowStepInstance.belongsTo(models.User, {
        foreignKey: "assigned_staff_id",
        as: "assignedStaff",
      });
      if (models.Department) {
        WorkflowStepInstance.belongsTo(models.Department, {
          foreignKey: "assigned_department_id",
          as: "assignedDepartment",
        });
      }
      WorkflowStepInstance.belongsTo(models.User, {
        foreignKey: "completed_by",
        as: "completedByUser",
      });
    }
  }

  WorkflowStepInstance.init(
    {
      step_instance_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      instance_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      step_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: "PENDING",
      },
      assigned_staff_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      assigned_department_id: {
        type: DataTypes.STRING(64),
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
      completed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "WorkflowStepInstance",
      tableName: "workflow_step_instances",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return WorkflowStepInstance;
};
