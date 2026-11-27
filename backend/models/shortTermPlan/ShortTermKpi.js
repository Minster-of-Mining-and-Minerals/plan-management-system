"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShortTermKpi extends Model {
    static associate(models) {
      ShortTermKpi.belongsTo(models.ShortTermPlan, {
        foreignKey: "short_term_plan_id",
        as: "plan",
        onDelete: "CASCADE",
      });
      ShortTermKpi.hasMany(models.ShortTermKpiAssignment, {
        foreignKey: "short_term_kpi_id",
        as: "assignments",
        onDelete: "CASCADE",
      });
      ShortTermKpi.hasMany(models.ShortTermPeriodReport, {
        foreignKey: "short_term_kpi_id",
        as: "reports",
        onDelete: "CASCADE",
      });
    }
  }

  ShortTermKpi.init(
    {
      short_term_kpi_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      short_term_plan_id: { type: DataTypes.UUID, allowNull: false },
      code: { type: DataTypes.STRING(60), allowNull: false },
      title: { type: DataTypes.TEXT, allowNull: false },
      unit: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Number" },
      total_target: { type: DataTypes.FLOAT, allowNull: true },
      target_mode: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "cumulative" },
      reporting_frequency: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "weekly" },
      requires_numeric: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      requires_narrative: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      allow_narrative_only_updates: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      sequelize,
      modelName: "ShortTermKpi",
      tableName: "short_term_kpis",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ShortTermKpi;
};
