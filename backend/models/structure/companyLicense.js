"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CompanyLicense extends Model {
    static associate(models) {
      CompanyLicense.belongsTo(models.Company, {
        foreignKey: "company_id",
        as: "company",
      });

      CompanyLicense.belongsTo(models.LicenseType, {
        foreignKey: "license_type_id",
        as: "licenseType",
      });

      CompanyLicense.hasMany(models.CompanyProductionAssignment, {
        foreignKey: "license_id",
        as: "productionAssignments",
      });
    }
  }

  CompanyLicense.init(
    {
      license_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      company_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      license_type_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      license_number: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      license_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "active", // active, expired, suspended, inactive
      },
      issued_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      effective_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      effective_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      effective_year_from: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      effective_year_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mineral_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      zone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      woreda: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      location_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      latitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
      },
      boundary_geojson: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      spatial_reference: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "GCS Adindan",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      supporting_document_ids: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "CompanyLicense",
      tableName: "company_licenses",
      underscored: true,
      timestamps: true,
      paranoid: true,
    }
  );

  return CompanyLicense;
};
