"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyProductionReportingAssignment extends Model {
    static associate(models) {
      CompanyProductionReportingAssignment.belongsTo(models.CompanyProductionAssignment, {
        foreignKey: "assignment_id",
        as: "assignment",
      });

      CompanyProductionReportingAssignment.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      CompanyProductionReportingAssignment.belongsTo(models.CompanyStructure, {
        foreignKey: "company_structure_id",
        as: "department",
      });

      CompanyProductionReportingAssignment.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user",
      });

      CompanyProductionReportingAssignment.belongsTo(models.Role, {
        foreignKey: "role_id",
        as: "role",
      });

      CompanyProductionReportingAssignment.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });
    }
  }

  CompanyProductionReportingAssignment.init(
    {
      assignment_responsibility_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      company_structure_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      role_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      target_version_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      modelName: "CompanyProductionReportingAssignment",
      tableName: "company_production_reporting_assignments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      paranoid: true,
    }
  );

  return CompanyProductionReportingAssignment;
};
