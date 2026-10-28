"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalPlanVersion extends Model {
    static associate(models) {
      RegionalPlanVersion.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      RegionalPlanVersion.belongsTo(models.RegionalPlanVersion, {
        foreignKey: "based_on_version_id",
        as: "baseVersion",
      });

      RegionalPlanVersion.belongsTo(models.RegionalPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "parentPlanVersion",
      });

      RegionalPlanVersion.hasMany(models.RegionalPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "annualVersions",
      });

      RegionalPlanVersion.hasMany(models.RegionalPlanVersion, {
        foreignKey: "parent_plan_version_id",
        as: "executionPeriodVersions",
      });

      RegionalPlanVersion.belongsTo(models.RegionalPlanRule, {
        foreignKey: "regional_plan_rule_id",
        as: "planRule",
      });

      RegionalPlanVersion.belongsTo(models.RegionalPlanningConfiguration, {
        foreignKey: "regional_planning_config_id",
        as: "planningConfiguration",
      });

      RegionalPlanVersion.hasOne(models.RegionalPlanRule, {
        foreignKey: "owned_by_plan_version_id",
        as: "ownedPlanRule",
      });

      RegionalPlanVersion.hasOne(models.RegionalPlanningConfiguration, {
        foreignKey: "owned_by_plan_version_id",
        as: "ownedPlanningConfiguration",
      });

      RegionalPlanVersion.hasMany(models.RegionalPlanNode, {
        foreignKey: "regional_plan_version_id",
        as: "planNodes",
        onDelete: "CASCADE",
      });
    }
  }

  RegionalPlanVersion.init(
    {
      regional_plan_version_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      parent_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      based_on_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      regional_plan_rule_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      regional_planning_config_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      draft_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      version_kind: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "master",
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "draft",
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      planning_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sequence_index: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      period_label: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      period_subdivision_mode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      start_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      end_year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      end_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
      },
      planning_duration_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      planning_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      planning_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      annual_targets_finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      period_targets_finalized_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      process_started_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      execution_status: {
        type: DataTypes.STRING(50),
        defaultValue: "open",
      },
      review_status: {
        type: DataTypes.STRING(50),
        defaultValue: "draft",
      },
    },
    {
      sequelize,
      modelName: "RegionalPlanVersion",
      tableName: "regional_plan_versions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return RegionalPlanVersion;
};
