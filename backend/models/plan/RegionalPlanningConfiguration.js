"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class RegionalPlanningConfiguration extends Model {
    static associate(models) {
      RegionalPlanningConfiguration.belongsTo(models.Region, {
        foreignKey: "region_id",
        as: "region",
        onDelete: "CASCADE",
      });

      RegionalPlanningConfiguration.hasMany(models.RegionalPlanVersion, {
        foreignKey: "regional_planning_config_id",
        as: "planVersions",
      });
    }
  }

  RegionalPlanningConfiguration.init(
    {
      regional_planning_config_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      region_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      min_duration_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_duration_years: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      draft_entity_label_singular: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Regional Plan Draft",
      },
      draft_entity_label_plural: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Regional Plan Drafts",
      },
      create_action_label: {
        type: DataTypes.STRING(120),
        allowNull: false,
        defaultValue: "Create Regional Plan",
      },
      planning_period_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Regional Planning Period",
      },
      duration_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Duration",
      },
      start_year_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Start Date",
      },
      end_year_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "End Date",
      },
      target_units: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      breakdown_mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "quarterly",
      },
      custom_periods: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: "RegionalPlanningConfiguration",
      tableName: "regional_planning_configurations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RegionalPlanningConfiguration;
};
