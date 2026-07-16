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

      PlanRule.belongsTo(models.PlanVersion, {
        foreignKey: "owned_by_plan_version_id",
        as: "ownedByPlanVersion",
      });

      PlanRule.belongsTo(models.PlanRule, {
        foreignKey: "source_plan_rule_id",
        as: "sourcePlanRule",
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
      inherit_to_descendants: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      owned_by_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      source_plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      /**
       * CAP_100 — performance % never exceeds 100 (default; matches legacy rollup).
       * ALLOW_OVER_ACHIEVEMENT — performance % may exceed 100 when actual > target.
       */
      performance_scoring_policy: {
        type: DataTypes.ENUM("CAP_100", "ALLOW_OVER_ACHIEVEMENT"),
        allowNull: false,
        defaultValue: "CAP_100",
      },
      /**
       * Amendment platform policy (framework consults this instead of hardcoding).
       * Defaults: completed periods locked, manual redistribution, no emergency,
       * structural amendments allowed after execution, ownership transfer allowed.
       */
      amendment_policy: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          completed_periods_editable: false,
          automatic_redistribution: "manual",
          allow_emergency_approvals: false,
          allow_structural_amendments_after_execution: true,
          allow_ownership_transfer: true,
        },
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
