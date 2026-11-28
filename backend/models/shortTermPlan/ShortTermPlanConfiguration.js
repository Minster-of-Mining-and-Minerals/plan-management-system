"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShortTermPlanConfiguration extends Model {
    static associate(models) {
      ShortTermPlanConfiguration.hasMany(models.ShortTermPlan, {
        foreignKey: "configuration_id",
        as: "plans",
      });
      ShortTermPlanConfiguration.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  ShortTermPlanConfiguration.init(
    {
      configuration_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      duration_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: 1,
          max: 365,
        },
      },
      subdivision_mode: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "weekly_4_per_month", // 'weekly_4_per_month' | '10_days' | '15_days' | 'monthly'
      },
      reporting_window_before_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      reporting_window_after_days: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      allow_past_reporting: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      require_evidence_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_default: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ShortTermPlanConfiguration",
      tableName: "short_term_plan_configurations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ShortTermPlanConfiguration;
};
