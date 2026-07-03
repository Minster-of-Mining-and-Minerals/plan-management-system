"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanRuleStep extends Model {
    static associate(models) {
      PlanRuleStep.belongsTo(models.PlanRule, {
        foreignKey: "plan_rule_id",
        as: "planRule",
      });
    }
  }

  PlanRuleStep.init(
    {
      plan_rule_step_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      step_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      node_type: {
        type: DataTypes.ENUM("strategic", "goal", "kpi", "task"),
        allowNull: false,
      },
      label: {
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
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PlanRuleStep",
      tableName: "plan_rule_steps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanRuleStep;
};
