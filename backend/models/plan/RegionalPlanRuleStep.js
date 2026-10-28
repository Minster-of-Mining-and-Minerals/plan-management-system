"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalPlanRuleStep extends Model {
    static associate(models) {
      RegionalPlanRuleStep.belongsTo(models.RegionalPlanRule, {
        foreignKey: "regional_plan_rule_id",
        as: "rule",
        onDelete: "CASCADE",
      });
    }
  }

  RegionalPlanRuleStep.init(
    {
      regional_plan_rule_step_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      regional_plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      step_order: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("level");
        },
        set(value) {
          this.setDataValue("level", value);
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      label: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue("name");
        },
        set(value) {
          this.setDataValue("name", value);
        },
      },
      node_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "task",
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
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: true,
        defaultValue: "#6B7280",
      },
    },
    {
      sequelize,
      modelName: "RegionalPlanRuleStep",
      tableName: "regional_plan_rule_steps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalPlanRuleStep;
};
