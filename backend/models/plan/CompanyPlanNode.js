"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyPlanNode extends Model {
    static associate(models) {
      CompanyPlanNode.belongsTo(models.CompanyPlanVersion, {
        foreignKey: "company_plan_version_id",
        as: "planVersion",
      });

      CompanyPlanNode.belongsTo(models.CompanyPlanNode, {
        foreignKey: "parent_id",
        as: "parent",
        onDelete: "CASCADE",
      });

      CompanyPlanNode.belongsTo(models.CompanyPlanNode, {
        foreignKey: "source_company_plan_node_id",
        as: "sourcePlanNode",
      });

      CompanyPlanNode.hasMany(models.CompanyPlanNode, {
        foreignKey: "parent_id",
        as: "children",
      });

      CompanyPlanNode.hasMany(models.CompanyInternalAssignment, {
        foreignKey: "company_plan_node_id",
        as: "internalAssignments",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "period_actual_submitted_by",
        as: "periodActualSubmittedBy",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "period_actual_approved_by",
        as: "periodActualApprovedBy",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "period_actual_validated_by",
        as: "periodActualValidatedBy",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "annual_actual_submitted_by",
        as: "annualActualSubmittedBy",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "annual_actual_approved_by",
        as: "annualActualApprovedBy",
      });

      CompanyPlanNode.belongsTo(models.User, {
        foreignKey: "annual_actual_validated_by",
        as: "annualActualValidatedBy",
      });
    }
  }

  CompanyPlanNode.init(
    {
      company_plan_node_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      source_company_plan_node_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "strategic",
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      weight: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      weight_mode: {
        type: DataTypes.STRING(50),
        defaultValue: "percentage",
      },
      contribution_weight: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      target_unit: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      target_allocation_mode: {
        type: DataTypes.STRING(50),
        defaultValue: "divisible",
      },
      achievement_mode: {
        type: DataTypes.STRING(50),
        defaultValue: "period",
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      assignment_sharing_mode: {
        type: DataTypes.STRING(50),
        defaultValue: "isolated",
      },
      annual_target: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      annual_actual: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      annual_actual_status: {
        type: DataTypes.STRING(50),
        defaultValue: "empty",
      },
      period_target: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      period_actual: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      period_actual_status: {
        type: DataTypes.STRING(50),
        defaultValue: "empty",
      },
      period_actual_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_actual_submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      period_actual_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_actual_approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      period_actual_validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_actual_validated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      period_actual_rejection_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      annual_actual_submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      annual_actual_submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      annual_actual_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      annual_actual_approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      annual_actual_validated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      annual_actual_validated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      annual_actual_rejection_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      narration: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      evidence_attachment_ids: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "CompanyPlanNode",
      tableName: "company_plan_nodes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyPlanNode;
};
