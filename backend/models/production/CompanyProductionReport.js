"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionReport extends Model {
    static associate(models) {
      CompanyProductionReport.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      CompanyProductionReport.belongsTo(models.CompanyProductionAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
      });

      CompanyProductionReport.belongsTo(models.ProductionItem, {
        foreignKey: "production_item_id",
        as: "productionItem",
      });

      CompanyProductionReport.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "reported_unit_id",
        as: "reportedUnit",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "submitted_by",
        as: "submittedByUser",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewedByUser",
      });
    }
  }

  CompanyProductionReport.init(
    {
      report_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      report_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_label: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity_reported: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      reported_unit_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      normalized_quantity: {
        type: DataTypes.DECIMAL(18, 4),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "submitted", // 'draft', 'submitted', 'approved', 'rejected'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      review_comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyProductionReport",
      tableName: "company_production_reports",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyProductionReport;
};
