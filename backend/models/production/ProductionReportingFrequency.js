"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class ProductionReportingFrequency extends Model {
    static associate(models) {
      ProductionReportingFrequency.hasMany(models.CompanyProductionAssignment, {
        foreignKey: "reporting_frequency_id",
        as: "companyAssignments",
      });
    }
  }

  ProductionReportingFrequency.init(
    {
      frequency_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      interval_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      calendar_basis: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "gregorian",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "ProductionReportingFrequency",
      tableName: "production_reporting_frequencies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return ProductionReportingFrequency;
};
