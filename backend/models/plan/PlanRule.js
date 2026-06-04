"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanRule extends Model {
    static associate(models) {
      PlanRule.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });

      PlanRule.hasMany(models.PlanRuleStep, {
        foreignKey: "plan_rule_id",
        as: "steps",
        onDelete: "CASCADE",
      });

      PlanRule.hasMany(models.PlanVersion, {
        foreignKey: "plan_rule_id",
        as: "planVersions",
      });
    }
  }

  PlanRule.init(
    {
      plan_rule_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "PlanRule",
      tableName: "plan_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanRule;
};
