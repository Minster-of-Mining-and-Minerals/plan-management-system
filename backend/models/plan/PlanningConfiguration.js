"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PlanningConfiguration extends Model {
    static associate(models) {
      PlanningConfiguration.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "governmentStructure",
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
