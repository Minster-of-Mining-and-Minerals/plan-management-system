"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShortTermPlan extends Model {
    static associate(models) {
      ShortTermPlan.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "sector",
      });
      ShortTermPlan.hasMany(models.ShortTermKpi, {
        foreignKey: "short_term_plan_id",
        as: "kpis",
        onDelete: "CASCADE",
      });
    }
  }

  ShortTermPlan.init(
    {
      short_term_plan_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      government_structure_id: { type: DataTypes.UUID, allowNull: true },
      calendar_system: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "EC" },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: false },
      duration_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      default_frequency: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "weekly" },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "active" },
      created_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "ShortTermPlan",
      tableName: "short_term_plans",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ShortTermPlan;
};
