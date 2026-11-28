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

      CompanyProductionReport.belongsTo(models.CompanyLicense, {
        foreignKey: "license_id",
        as: "license",
      });

      CompanyProductionReport.belongsTo(models.ProductionItem, {
        foreignKey: "production_item_id",
        as: "productionItem",
      });

      CompanyProductionReport.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "reported_unit_id",
        as: "reportedUnit",
      });

      CompanyProductionReport.belongsTo(models.CompanyStructure, {
        foreignKey: "company_structure_id",
        as: "department",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "submitted_by",
        as: "submitter",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "submitted_by",
        as: "submittedByUser",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewer",
      });

      CompanyProductionReport.belongsTo(models.User, {
        foreignKey: "reviewed_by",
        as: "reviewedByUser",
      });

      CompanyProductionReport.belongsTo(models.CompanyProductionTarget, {
        foreignKey: "target_period_id",
        as: "targetPeriod",
      });

      CompanyProductionReport.belongsTo(models.CompanyProductionReport, {
        foreignKey: "parent_report_id",
        as: "parentReport",
      });

      CompanyProductionReport.hasMany(models.CompanyProductionReport, {
        foreignKey: "parent_report_id",
        as: "revisions",
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
      license_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      company_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      approved_target_version: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      target_period_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      parent_report_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      revision_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reporting_frequency: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "daily",
      },
      reporting_period_key: {
        type: DataTypes.STRING(100),
        allowNull: true,
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
      evidence_attachments: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
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
