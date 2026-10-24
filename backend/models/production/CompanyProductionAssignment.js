"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionAssignment extends Model {
    static associate(models) {
      CompanyProductionAssignment.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      CompanyProductionAssignment.belongsTo(models.ProductionItem, {
        foreignKey: "production_item_id",
        as: "productionItem",
      });

      CompanyProductionAssignment.belongsTo(models.ProductionReportingFrequency, {
        foreignKey: "reporting_frequency_id",
        as: "reportingFrequency",
      });

      CompanyProductionAssignment.belongsTo(models.GoldMeasurementUnit, {
        foreignKey: "default_reporting_unit_id",
        as: "defaultReportingUnit",
      });

      CompanyProductionAssignment.hasMany(models.CompanyProductionTarget, {
        foreignKey: "assignment_id",
        as: "targets",
        onDelete: "CASCADE",
      });

      CompanyProductionAssignment.hasMany(models.CompanyProductionReport, {
        foreignKey: "assignment_id",
        as: "reports",
        onDelete: "CASCADE",
      });

      CompanyProductionAssignment.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  CompanyProductionAssignment.init(
    {
      assignment_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      production_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      reporting_frequency_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      target_allocation_depth: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "quarterly", // 'annual', 'semi_annual', 'quarterly', 'monthly', 'daily'
      },
      default_reporting_unit_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      effective_from: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      effective_to: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      requires_review: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyProductionAssignment",
      tableName: "company_production_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyProductionAssignment;
};
