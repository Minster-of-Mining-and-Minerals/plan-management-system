"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShortTermKpiAssignment extends Model {
    static associate(models) {
      ShortTermKpiAssignment.belongsTo(models.ShortTermKpi, {
        foreignKey: "short_term_kpi_id",
        as: "kpi",
        onDelete: "CASCADE",
      });
      ShortTermKpiAssignment.belongsTo(models.GovernmentStructure, {
        foreignKey: "government_structure_id",
        as: "sector",
      });
      ShortTermKpiAssignment.belongsTo(models.InternalStructure, {
        foreignKey: "internal_structure_id",
        as: "department",
      });
      ShortTermKpiAssignment.belongsTo(models.User, {
        foreignKey: "assigned_user_id",
        as: "assignedUser",
      });
      ShortTermKpiAssignment.hasMany(models.ShortTermPeriodReport, {
        foreignKey: "assignment_id",
        as: "reports",
        onDelete: "CASCADE",
      });
    }
  }

  ShortTermKpiAssignment.init(
    {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      short_term_kpi_id: { type: DataTypes.UUID, allowNull: false },
      government_structure_id: { type: DataTypes.UUID, allowNull: false },
      internal_structure_id: { type: DataTypes.UUID, allowNull: true },
      assigned_user_id: { type: DataTypes.UUID, allowNull: true },
      assignee_label: { type: DataTypes.STRING(255), allowNull: true },
      allocated_target: { type: DataTypes.FLOAT, allowNull: true },
      evaluation_mode_override: { type: DataTypes.STRING(30), allowNull: true },
      period_targets: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      reporting_frequency_override: { type: DataTypes.STRING(30), allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "active" },
      assigned_by: { type: DataTypes.UUID, allowNull: true },
    },
    {
      sequelize,
      modelName: "ShortTermKpiAssignment",
      tableName: "short_term_kpi_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ShortTermKpiAssignment;
};
