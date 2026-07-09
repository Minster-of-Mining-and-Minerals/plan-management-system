"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanningConfiguration extends Model {
    static associate(models) {
      PlanningConfiguration.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
      });

      PlanningConfiguration.belongsTo(models.PlanVersion, {
        foreignKey: "owned_by_plan_version_id",
        as: "ownedByPlanVersion",
      });

      PlanningConfiguration.belongsTo(models.PlanningConfiguration, {
        foreignKey: "source_planning_configuration_id",
        as: "sourcePlanningConfiguration",
      });

      PlanningConfiguration.hasMany(models.PlanVersion, {
        foreignKey: "planning_configuration_id",
        as: "planVersions",
      });
    }
  }

  PlanningConfiguration.init(
    {
      planning_configuration_id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      government_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
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
      },
      draft_entity_label_plural: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      create_action_label: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      planning_period_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      duration_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      start_year_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      end_year_label: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      target_units: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      breakdown_mode: {
        type: DataTypes.ENUM("quarterly", "semi_annual", "monthly", "custom"),
        allowNull: false,
        defaultValue: "quarterly",
      },
      custom_periods: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      owned_by_plan_version_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      source_planning_configuration_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PlanningConfiguration",
      tableName: "planning_configurations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return PlanningConfiguration;
};
