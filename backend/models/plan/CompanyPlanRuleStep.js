"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyPlanRuleStep extends Model {
    static associate(models) {
      CompanyPlanRuleStep.belongsTo(models.CompanyPlanRule, {
        foreignKey: "company_plan_rule_id",
        as: "rule",
        onDelete: "CASCADE",
      });
    }
  }

  CompanyPlanRuleStep.init(
    {
      company_plan_rule_step_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      requires_weight: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      requires_contribution_weight: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      allow_kpi: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "CompanyPlanRuleStep",
      tableName: "company_plan_rule_steps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CompanyPlanRuleStep;
};
