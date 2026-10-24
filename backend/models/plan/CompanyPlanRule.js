"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyPlanRule extends Model {
    static associate(models) {
      CompanyPlanRule.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
        onDelete: "CASCADE",
      });

      CompanyPlanRule.hasMany(models.CompanyPlanRuleStep, {
        foreignKey: "company_plan_rule_id",
        as: "steps",
        onDelete: "CASCADE",
      });

      CompanyPlanRule.hasMany(models.CompanyPlanVersion, {
        foreignKey: "company_plan_rule_id",
        as: "planVersions",
      });
    }
  }

  CompanyPlanRule.init(
    {
      company_plan_rule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      performance_scoring_policy: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "CAP_100",
      },
    },
    {
      sequelize,
      modelName: "CompanyPlanRule",
      tableName: "company_plan_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return CompanyPlanRule;
};
