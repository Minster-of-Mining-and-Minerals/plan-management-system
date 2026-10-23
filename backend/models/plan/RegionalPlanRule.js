"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalPlanRule extends Model {
    static associate(models) {
      RegionalPlanRule.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      RegionalPlanRule.hasMany(models.RegionalPlanRuleStep, {
        foreignKey: "regional_plan_rule_id",
        as: "steps",
        onDelete: "CASCADE",
      });

      RegionalPlanRule.hasMany(models.RegionalPlanVersion, {
        foreignKey: "regional_plan_rule_id",
        as: "planVersions",
      });
    }
  }

  RegionalPlanRule.init(
    {
      regional_plan_rule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      region_id: {
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
      modelName: "RegionalPlanRule",
      tableName: "regional_plan_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalPlanRule;
};
