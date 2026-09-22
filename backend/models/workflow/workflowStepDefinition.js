"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class WorkflowStepDefinition extends Model {
    static associate(models) {
      WorkflowStepDefinition.belongsTo(models.ClinicalWorkflowDefinition, {
        foreignKey: "workflow_id",
        as: "workflowDefinition",
      });
      WorkflowStepDefinition.hasMany(models.WorkflowStepInstance, {
        foreignKey: "step_id",
        as: "stepInstances",
      });
      if (models.DiagnosisFormConfig) {
        WorkflowStepDefinition.belongsTo(models.DiagnosisFormConfig, {
          foreignKey: "form_config_id",
          as: "formConfig",
        });
      }
      if (models.Department) {
        WorkflowStepDefinition.belongsTo(models.Department, {
          foreignKey: "department_id",
          as: "department",
        });
      }
    }
  }

  WorkflowStepDefinition.init(
    {
      step_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      workflow_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      step_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      form_config_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      department_id: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      transition_conditions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "WorkflowStepDefinition",
      tableName: "workflow_step_definitions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  return WorkflowStepDefinition;
};
