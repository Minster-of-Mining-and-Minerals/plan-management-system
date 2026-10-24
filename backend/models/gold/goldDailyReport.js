"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GoldDailyReport extends Model {
    static associate(models) {
      GoldDailyReport.belongsTo(models.PurchasingCenter, {
        foreignKey: "purchasing_center_id",
        as: "purchasingCenter",
      });

      GoldDailyReport.belongsTo(models.User, {
        foreignKey: "submitted_by_id",
        as: "submittedBy",
      });

      GoldDailyReport.belongsTo(models.User, {
        foreignKey: "reviewed_by_id",
        as: "reviewedBy",
      });
    }
  }

  GoldDailyReport.init(
    {
      report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchasing_center_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      business_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_purchases: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      total_quantity_canonical: {
        type: DataTypes.DECIMAL(18, 4),
        defaultValue: 0.0,
        allowNull: false,
      },
      total_amount: {
        type: DataTypes.DECIMAL(18, 2),
        defaultValue: 0.0,
        allowNull: false,
      },
      unit_breakdown: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: false,
      },
      seller_breakdown: {
        type: DataTypes.JSONB,
        defaultValue: {},
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: "submitted",
        allowNull: false,
        validate: {
          isIn: [["draft", "submitted", "reviewed"]],
        },
      },
      submitted_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      reviewed_by_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "GoldDailyReport",
      tableName: "gold_daily_reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
      indexes: [
        { unique: true, fields: ["purchasing_center_id", "business_date"] },
        { fields: ["business_date"] },
        { fields: ["status"] },
      ],
    }
  );

  return GoldDailyReport;
};
