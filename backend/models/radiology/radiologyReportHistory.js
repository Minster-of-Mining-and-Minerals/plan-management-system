"use strict";

const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class RadiologyReportHistory extends Model {
    static associate(models) {
      RadiologyReportHistory.belongsTo(models.RadiologyReport, {
        foreignKey: "report_id",
        as: "report",
      });
      RadiologyReportHistory.belongsTo(models.User, {
        foreignKey: "changed_by",
        as: "changedByUser",
      });
    }
  }

  RadiologyReportHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      report_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previous_findings: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      previous_impression: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      previous_recommendations: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      previous_status: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      changed_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      change_reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RadiologyReportHistory",
      tableName: "radiology_report_histories",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return RadiologyReportHistory;
};
