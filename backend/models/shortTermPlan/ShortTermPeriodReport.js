"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ShortTermPeriodReport extends Model {
    static associate(models) {
      ShortTermPeriodReport.belongsTo(models.ShortTermKpiAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
        onDelete: "CASCADE",
      });
      ShortTermPeriodReport.belongsTo(models.ShortTermKpi, {
        foreignKey: "short_term_kpi_id",
        as: "kpi",
        onDelete: "CASCADE",
      });
      ShortTermPeriodReport.belongsTo(models.User, {
        foreignKey: "submitted_by",
        as: "submittedByUser",
      });
    }
  }

  ShortTermPeriodReport.init(
    {
      report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: { type: DataTypes.UUID, allowNull: false },
      short_term_kpi_id: { type: DataTypes.UUID, allowNull: false },
      period_index: { type: DataTypes.INTEGER, allowNull: false },
      period_label: { type: DataTypes.STRING(120), allowNull: false },
      period_start_date: { type: DataTypes.DATEONLY, allowNull: false },
      period_end_date: { type: DataTypes.DATEONLY, allowNull: false },
      submission_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "actual_and_narrative",
      },
      planned_target: { type: DataTypes.FLOAT, allowNull: true },
      reported_actual: { type: DataTypes.FLOAT, allowNull: true },
      achievement_percent: { type: DataTypes.FLOAT, allowNull: true },
      narrative: { type: DataTypes.TEXT, allowNull: true },
      evidence_attachments: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      submitted_by: { type: DataTypes.UUID, allowNull: true },
      submitted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      review_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "submitted" },
      reviewed_by: { type: DataTypes.UUID, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: "ShortTermPeriodReport",
      tableName: "short_term_period_reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return ShortTermPeriodReport;
};
